export interface TwitchCredentials {
    clientSecret: string,
    clientId: string,
}

export interface WebhookOptions {
    secret: string,    
    url: string,
}

export type TwitchUserId = string;

export interface IWebhooksSubscriber {
    subscribe(obj: {
        userName: string,
        streamerName: TwitchUserId,
    }): Promise<Subscription>;

    removeSubscription(id :string): Promise<void>;
}


export enum WebhookType {
    follow = 'follow',
    user = 'user',
    stream = 'stream',
    subscription = 'subscription',
}
export interface WebhookRecord {
    id: string,
    streamerName: string,
    type: WebhookType,
}

export interface IWebhooksRepository {
    createWebhook(obj: { type: WebhookType, streamerName: string }): Promise<WebhookRecord>
    findWebhook(webhookId: string): Promise<WebhookRecord | null>
    removeWebhook(id: string): Promise<void>
}


export interface Subscription {
    id: string,
    secret: string,
    userName: string,
    streamerName: TwitchUserId,
}

export interface ISubscriptionsRepository {
    findSubscription(id: string): Promise<Subscription | null>;
    addSubscription(obj: {
        streamerName: TwitchUserId,
        userName: string,
    }): Promise<Subscription>;

    removeSubscription(id: string): Promise<void>;

    hasChannel(channel: TwitchUserId): Promise<boolean>;
}

export type BroadcastEvent = {
    eventType: 'follow' | 'stream' | 'user',
    streamerName: string,
    createdAt: Date,
    details?: { [k: string]: string | number }
};
export type BroadCastCallback = (payload: BroadcastEvent) => void;

export type RespondToWebhookCallback = (status: number, message: string | undefined) => void;

export interface IWebhooksHandler {
}

export interface IBroadcaster {
    broadcast: BroadCastCallback
}

export interface IStartableService {
    start: () => Promise<void>;
    close: () => Promise<void>;
}

export interface ISubscriptionGuard {
    authorizeSubscription(obj: {
        subscriptionSecret: string,
        subscriptionId: string,
    }
    ): Promise<{authorized: false} | {streamerName: string, authorized: true}>;
}
