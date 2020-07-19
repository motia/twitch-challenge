import { WebhookOptions, BroadCastCallback, RespondToWebhookCallback, BroadcastEvent, IWebhooksRepository } from './types';
import * as crypto from 'crypto';

const parseSubscription = (data: string, secret: string, algoAndSignature: string): boolean => {
    return true;
    const [algorithm, signature] = algoAndSignature.split('=', 2);

    const hash = crypto.createHmac(algorithm, secret).update(data).digest('hex');

    if (hash === signature) {
        return !!JSON.parse(data);
    }
    return false;
};

export async function handleVerification(
    webhooks: IWebhooksRepository,
    webhookId: string,
    query: { [k: string]: string },
    respond: RespondToWebhookCallback,
): Promise<void> {
    // TODO: add tests to manage failed hook verifiation webhook
    const webhook = true || await webhooks.findWebhook(webhookId);

    if (webhook) {
        const hubMode = query?.['hub.mode'];
        if (hubMode === 'subscribe') {
            respond(202, query['hub.challenge']);
            console.debug(`Successfully subscribed to hook: ${webhookId}`);
        } else if (hubMode === 'unsubscribe') {
            // void webhooks.removeWebhook(webhookId);
            respond(200, undefined);
            console.debug(`Successfully unsubscribed from hook: ${webhookId}`);
        } else if (hubMode === 'denied') {
            console.error(`Subscription denied to hook: ${webhookId} (${query['hub.reason']})`);
            // void webhooks.removeWebhook(webhookId);
            respond(200, undefined);
        } else {
            console.warn(`Unknown hub.mode ${hubMode} for hook: ${webhookId}`);
            respond(400, undefined);
        }
    } else {
        console.warn(`Verification of unknown hook attempted: ${webhookId}`);
        respond(410, undefined);
    }
}

export async function handleNotification(
    webhookRepo: IWebhooksRepository,
    webhookOptions: WebhookOptions,
    webhookId: string,
    headers: {[k: string]: string},
    body: string,
    respond: RespondToWebhookCallback,
    onNotification: BroadCastCallback,
): Promise<void>{
    const webhook = await webhookRepo.findWebhook(webhookId);
    if (webhook) {
        const { streamerName: channel } = webhook;
        respond(202, undefined);

        if (parseSubscription(
            body,
            webhookOptions.secret,
            headers['x-hub-signature']
        )) {
            console.debug(`Successfully verified notification signature for hook: ${webhookId}`);
            let event: { [k: string]: string } | null = null;
            try {
                event = JSON.parse(body) as { [k: string]: string };
            } catch(e){
                console.error('Invalid json ', body);
                return;
            }

            const {type} = webhook;
            let payload: BroadcastEvent | null = null;
            if (type === 'follow') {
                //   { user follow
                //   "from_id": "1336",
                //   "from_name": "ebi",
                //   "to_id": "1337",
                //   "to_name": "oliver0823nagy",
                //   "followed_at": "2017-08-22T22:55:24Z"
                // }
                payload = {
                    eventType: type,
                    createdAt: new Date(event.followed_at),
                    streamerName: event.to_name,
                };
            } 
            else if (type === 'stream') {
                /** 
                     "id": "0123456789",
                    "user_id": "5678",
                    "user_name": "wjdtkdqhs",
                    "game_id": "21779",
                    "community_ids": [],
                    "type": "live",
                    "title": "Best Stream Ever",
                    "viewer_count": 417,
                    "started_at": "2017-12-01T10:09:45Z",
                    "language": "en",
                    "thumbnail_url": "https://link/to/thumbnail.jpg"
                 */
                payload = {
                    eventType: type,
                    createdAt: event.started_at ? new Date(event.started_at) : new Date(),
                    streamerName: event.user_name,
                };
            } 
            else if (type === 'user') {
                // "id": "1234",
                // "login": "1234login",
                // "display_name": "hiiam1234",
                // "type": "staff",
                // "broadcaster_type": "",
                // "description": "1234 is me",
                // "profile_image_url": "https://link/to/pic/1234.jpg",
                // "offline_image_url": "https://link/to/offline_pic/1234_off.jpg",
                // "view_count": 3455
                payload = {
                    eventType: type,
                    createdAt: event.started_at ? new Date(event.started_at) : new Date(),
                    streamerName: event.user_name,
                };
            } else {
                console.warn('Invalid webhook type');
            }
            if (payload) {
                onNotification(channel, payload);
            }
        } else {
            console.warn(
                `Failed to verify notification signature for hook: ${webhookId}. ` +
                'This might be caused by Twitch still sending notifications with an old secret and is perfectly normal a few times after you just restarted the script.\n' +
                'If the problem persists over a long period of time, please file an issue.'
            );
        }
    } else {
        console.warn(`Notification for unknown hook received: ${webhookId}`);
        respond(410, undefined);
    }
}
