import { WebhooksSubscriber } from './createWebhookSubscriber';
import { loadDotEnv, throwEnvVarRequired, parseUrlFromEnv } from './helpers';
import { fail } from 'assert';
import { ISubscriptionsRepository, Subscription, TwitchUserId, WebhookType } from './types';

// always assume subscription exists for now
class InMemorySubscriptionsRepository implements ISubscriptionsRepository {    
    _subscriptions = new Map<string, Subscription>();
    async addSubscription(
        {userName, streamerName}: {userName: string, streamerName: TwitchUserId}
    ): Promise<Subscription> {
        console.log('[SubscriptionsRepository] add subscription for ', { userName, streamerName });
        const sub = { id: `${this._subscriptions.size + 1}`, secret: 'xxxx', userName, streamerName };
        this._subscriptions.set(sub.id, sub);
        return sub;
    }

    async getSubscription(id: string): Promise<Subscription|null> {
        return this._subscriptions.get(id) || null;
    }

    async findSubscription(id: string): Promise<Subscription | null> {
        return this._subscriptions.get(id) || null;
    }

    async removeSubscription(id: string): Promise<void> {
        this._subscriptions.delete(id);
    }

    async hasChannel(id: string): Promise<boolean> {
        for (const k in this._subscriptions) {
            if (this._subscriptions.get(k)?.streamerName === id) {
                return true;
            }
        }
        return false;
    }
}

const dummyWebhookRepo = {
    createWebhook: async () => { return { id: '1', type: WebhookType.stream, streamerName: 'k1ng' }; },
    findWebhook: async () => { return { id: '1', type: WebhookType.stream, streamerName: 'k1ng' }; },
    removeWebhook: async () => { },
};

loadDotEnv();

const clientId = process.env.TWITCH_CLIENT_ID || throwEnvVarRequired('TWITCH_CLIENT_ID') || '';
const clientSecret = process.env.TWITCH_CLIENT_SECRET || throwEnvVarRequired('TWITCH_CLIENT_SECRET') || '';

const WEBHOOK_HANDLER_URL = parseUrlFromEnv('WEBHOOK_HANDLER_URL') || throwEnvVarRequired('WEBHOOK_HANDLER_URL') || '';

describe('test subscribe/unsubscribe to a channel', () => {
    // TODO: mock and test subscriptions
    let subId = '';
    const subscriptions = new InMemorySubscriptionsRepository;
    it('subscribe to channel', async function() {
        this.timeout(5000);
        const x = new WebhooksSubscriber(
            dummyWebhookRepo,
            {clientId, clientSecret},
            { url: WEBHOOK_HANDLER_URL, secret: 'oooooooo' },
            subscriptions,
        );

        try {
            subId = (await x.subscribe({ streamerName: 'k1ng', userName: '11111' })).id;
        } catch (e) {
            fail(e);
        }
    });

    it('unsubscribe from channel', async function () {
        if (!subId) {
            return;
        }
        this.timeout(5000);
        const x = new WebhooksSubscriber(
            dummyWebhookRepo,
            { clientId, clientSecret },
            { url: WEBHOOK_HANDLER_URL, secret: 'oooooooo' },
            subscriptions,
        );

        try {
            await x.removeSubscription(subId);
        } catch (e) {
            fail(e);
        }
    });
});

