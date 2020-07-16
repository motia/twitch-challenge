import TwitchClient, * as twitch from 'twitch';
import { TwitchCredentials, WebhookOptions, IWebhooksSubscriber, ISubscriptionsRepository, TwitchUserId, IStartableService, Subscription, IWebhooksRepository, WebhookRecord, WebhookType } from './types';


export class WebhooksSubscriber implements IWebhooksSubscriber, IStartableService, IWebhooksRepository {
    apiClient: TwitchClient;

    _webhhoks = new Map<string, WebhookRecord>();

    constructor(
        private webhookRepository: IWebhooksRepository,
        private twithcCreds: TwitchCredentials,
        private webhookOptions: WebhookOptions,
        private subscriptions: ISubscriptionsRepository,
        private enableApiCalls: boolean = true,
    ) {}

    createWebhook(x: { type: WebhookType, streamerName: string }): Promise<WebhookRecord> {
        return this.webhookRepository.createWebhook(x);
    }
    
    findWebhook(webhookId: string): Promise<WebhookRecord | null> {
        return this.webhookRepository.findWebhook(webhookId);
    }

    removeWebhook(id: string): Promise<void> {
        return this.webhookRepository.removeWebhook(id);
    }

    async start(): Promise<void> {
    }

    private async initApi() {
        if (this.apiClient) {
            return;
        }
        const {clientId, clientSecret} = this.twithcCreds;
        const  obj = await TwitchClient.getAppAccessToken(clientId, clientSecret).catch(e => {
            console.error('-- Twitch login failed', e);
            throw e;
        });
        const { accessToken, refreshToken } = obj;
        console.debug('-- Twitch token obtained successfully');
        const authProvider = new twitch.RefreshableAuthProvider(
            new twitch.StaticAuthProvider(clientId, accessToken),
            {
                refreshToken,
                clientSecret: clientSecret,
                onRefresh: (token: twitch.AccessToken) => {
                    console.debug('-- Token refreshed');
                    // do things with the new token data, e.g. save them in your database
                }
            }
        );

        this.apiClient = new TwitchClient({ authProvider });
    }

    async close(): Promise<void> {}

    async subscribe({
        userName,
        streamerName    
    }: {
        userName: string,
        streamerName: TwitchUserId,
    }): Promise<Subscription>{
        const channelId = await this.getstreamerNameByName(streamerName);

        const newSubscription = await this.subscriptions.addSubscription({
            userName,
            streamerName,
        });

        const webhookIds = (await Promise.all([
            await this.createWebhook({ type: WebhookType.follow, streamerName }),
            await this.createWebhook({ type: WebhookType.stream, streamerName }),
            await this.createWebhook({ type: WebhookType.user, streamerName }),
        ])).map(x => x.id);

        if (this.enableApiCalls) {
            await Promise.all([
                this.apiClient.helix.webHooks.subscribeToUserFollowsTo(
                    channelId,
                    this.getWebhoookOpts(webhookIds[0])
                ),
                this.apiClient.helix.webHooks.subscribeToStreamChanges(
                    channelId,
                    this.getWebhoookOpts(webhookIds[1])
                ),
                this.apiClient.helix.webHooks.subscribeToUserChanges(
                    channelId,
                    this.getWebhoookOpts(webhookIds[2])
                ),
            ]);
        }

        return newSubscription;
    }

    private getWebhoookOpts(webhookId: string) {
        return {
            secret: this.webhookOptions.secret,
            callbackUrl: this.webhookOptions.url + '/'+ webhookId
        };
    }

    private async _removeWebhook(webhook: WebhookRecord) {
        // TODO: restore this
        const channelId = await this.getstreamerNameByName(webhook.streamerName);
        const opts = this.getWebhoookOpts(webhook.id);


        await this.initApi();
        if (this.enableApiCalls) {
            void Promise.all([
                this.apiClient.helix.webHooks.unsubscribeFromUserFollowsTo(channelId, opts),
                this.apiClient.helix.webHooks.unsubscribeFromStreamChanges(channelId, opts),
                this.apiClient.helix.webHooks.unsubscribeFromUserChanges(channelId, opts),
            ]);
        }
    }


    async removeSubscription(id: string): Promise<void> {
        const sub = await this.subscriptions.findSubscription(id);
        if (!sub) {
            return;
        }
        await this.subscriptions.removeSubscription(id);
        if (!(await this.subscriptions.hasChannel(sub.streamerName))) {
            const webhooks = await this.findWebhooksByChannel(sub.streamerName);
            webhooks.forEach(x => void this._removeWebhook(x));
        }
    }

    async findWebhooksByChannel(channel: TwitchUserId): Promise<WebhookRecord[]> {
        const whs: WebhookRecord[] = [];
        this._webhhoks.forEach(element => {
            if (element.streamerName === channel) {
                whs.push(element);
            }
        });

        return whs;
    }


    private async getstreamerNameByName(channelName: string): Promise<string> {
        await this.initApi();
        const id = (await this.apiClient.helix.users.getUserByName(channelName))?.id;
        if (!id) {
            throw new Error('User not found');
        }
        return id;
    }
}

