
import {
    createWebhookSubscriberOverHttp, createEventBroacasterOverHttp, createWebhookServer,
    createWebhookSubscriberHttpClient, createEventBroacasterHttpClient
} from './servers';
import { SubscriptionsRepository } from './SubscriptionsRepository';
import { loadConfig, loadDotEnv, prepareNgrokProxy } from './helpers';
import { createSubscriptionGuard, createWebServer } from './servers/createWebServer';
import { Pool } from 'pg';
import { EventsRepository } from './EventsRepository';
import { WebhooksRepository } from './WebhookRepository';

async function main() {
    loadDotEnv();
    const parsedConfig = loadConfig();
    if (parsedConfig.WEBHOOK_HANDLER_OVER_NGROK) {
        parsedConfig.WEBHOOK_HANDLER_URL = await prepareNgrokProxy(parsedConfig.WEBHOOK_HANDLER_LOCAL_PORT);
        console.log('--- [WebhookHandler] is proxied on ' + parsedConfig.WEBHOOK_HANDLER_URL);
    }
    if (!parsedConfig.WEBHOOK_HANDLER_URL) {
        console.error('WEBHOOK_HANDLER_URL config value should not be empty');
        process.exit(1);
    }
    const {
        WEBSERVER_PORT,
        TWITCH_REDIRECT_URI,
        BROADCASTING_SERVER_PORT,
        BROADCASTING_WS_PORT,
        TWITCH_CLIENT_ID,
        TWITCH_CLIENT_SECRET,
        WEBHOOK_HANDLER_LOCAL_PORT,
        WEBHOOK_HANDLER_SECRET,
        WEBHOOK_HANDLER_URL,
        WEBHOOK_SUBSCRIBER_PORT
    } = parsedConfig;

    const pgPool = new Pool({});

    const eventsRepository = new EventsRepository(pgPool);
    const subscriptionsRepository = new SubscriptionsRepository(pgPool);

    const webhookOptions = { url: WEBHOOK_HANDLER_URL, secret: WEBHOOK_HANDLER_SECRET };

    const webhooksSubscriberServer = createWebhookSubscriberOverHttp(
        new WebhooksRepository(pgPool),
        { clientId: TWITCH_CLIENT_ID, clientSecret: TWITCH_CLIENT_SECRET },
        webhookOptions,
        subscriptionsRepository,
        WEBHOOK_SUBSCRIBER_PORT
    );
    const webhooksSubscriberClient = createWebhookSubscriberHttpClient(WEBHOOK_SUBSCRIBER_PORT);

    const webserver = createWebServer(
        webhooksSubscriberClient,
        subscriptionsRepository,
        {
            WEBSERVER_PORT,
            TWITCH_CLIENT_ID,
            TWITCH_CLIENT_SECRET,
            TWITCH_REDIRECT_URI
        });

    const broadcasterServer = createEventBroacasterOverHttp(
        webhooksSubscriberClient,
        createSubscriptionGuard(WEBSERVER_PORT),
        BROADCASTING_WS_PORT,
        BROADCASTING_SERVER_PORT
    );
    const broadcasterClient = createEventBroacasterHttpClient(
        BROADCASTING_SERVER_PORT
    );

    const webhooksServer = createWebhookServer(
        webhooksSubscriberClient,
        webhookOptions,
        WEBHOOK_HANDLER_LOCAL_PORT,
        (channelId, event) => {
            broadcasterClient.broadcast(channelId, event);
            void eventsRepository.saveEvents(channelId, event as any);
        },
    );

    // order is according to deps
    console.log('Starting WebhooksSubscriberServer');
    await webhooksSubscriberServer.start();
    console.log('Starting Broadcaster');
    await broadcasterServer.start();
    console.log('Starting WebhooksServer');
    await webhooksServer.start();
    console.log('Starting WebServer');
    await webserver.start();
}

void main();
