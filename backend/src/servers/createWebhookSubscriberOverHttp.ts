import { TwitchCredentials, WebhookOptions, IWebhooksSubscriber, ISubscriptionsRepository, IStartableService, Subscription, IWebhooksRepository, WebhookRecord, WebhookType } from '../types';
import { WebhooksSubscriber } from '../createWebhookSubscriber';
import { ExpressifyCommand, expressify } from './expressify';

const createCommands = (
    port: number,
    serverOptions: { subscriber: IWebhooksSubscriber & IWebhooksRepository } | false
) => {
    const baseUrl = `http://127.0.0.1:${port}`;

    const subscribe = new ExpressifyCommand<Subscription>(
        'subscriptions',
        serverOptions ? async (_, payload) => {
            const { streamerName, userName } = payload as { streamerName: string, userName: string };
            if (!streamerName || !userName) {
                throw new Error('Missing arguments userName or streamerName');
            }
            const sub = await serverOptions.subscriber.subscribe({ userName, streamerName: streamerName });
            console.log('Subscription created ', sub);
            return sub;
        } : false,
        { baseUrl }
    );
    const removeSubscription = new ExpressifyCommand(
        'subscriptions/:subscription',
        serverOptions ? ({ subscription}) => serverOptions.subscriber.removeSubscription(subscription).then(() => {}) : false,
        { baseUrl, method: 'delete' }
    );

    const createWebhook = new ExpressifyCommand(
        'webhhoks',
        serverOptions 
            ? ({ streamerName, type }) => {
                if (['subscription', 'user', 'stream', 'follow'].includes(type) === false) {
                    throw new Error('Invalid webhook type');
                }
                return serverOptions.subscriber.createWebhook({ 
                    streamerName: streamerName, type: type as WebhookType
                });
            }
        : false,
        { baseUrl, method: 'post' }
    );

    const findWebhook = new ExpressifyCommand(
        'webhhoks/:webhook',
        serverOptions ? x => serverOptions.subscriber.findWebhook(x.webhook) : false,
        { baseUrl, method: 'delete' }
    );

    const removeWebhook = new ExpressifyCommand(
        'webhhoks/:webhook',
        serverOptions ? x => serverOptions.subscriber.removeWebhook(x.webhook) : false,
        { baseUrl, method: 'delete' }
    );

    return  {
        subscribe,
        removeSubscription,
        createWebhook,
        findWebhook,
        removeWebhook,
    };
}; 

export const createWebhookSubscriberHttpClient = function (port: number): IWebhooksSubscriber & IWebhooksRepository {
    const commands = createCommands(port, false);

    return {
        subscribe: ({ userName, streamerName: streamerName }) => commands.subscribe.remoteCall({}, { userName: `${userName}`, streamerName: `${streamerName}` }),
        removeSubscription: async (subscription: string) => { await commands.removeSubscription.remoteCall({ subscription });},
        createWebhook: ({ type, streamerName }) => commands.createWebhook.remoteCall({}, { type, streamerName }),
        findWebhook: (webhook: string) => commands.findWebhook.remoteCall({webhook}),
        removeWebhook: (webhook: string) => commands.removeWebhook.remoteCall({ webhook }),
    };
};

export const createWebhookSubscriberOverHttp = function (
    webhookRepository: IWebhooksRepository,
    twithcCreds: TwitchCredentials,
    webhookOptions: WebhookOptions,
    subscriptions: ISubscriptionsRepository,
    port: number
): IStartableService {
    const subscriber = new WebhooksSubscriber(webhookRepository, twithcCreds, webhookOptions, subscriptions);
    const commands = createCommands(port, { subscriber });
    
    const app = expressify(
        port,
        Object.values(commands),
        () => subscriber.start(),
        () => subscriber.close()
    );
    app.serverName = 'WebhookSubscriber';

    return {
        ...app,
    };
};
