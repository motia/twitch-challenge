import * as socketIo from 'socket.io';
import { IWebhooksSubscriber, IBroadcaster, IStartableService, ISubscriptionGuard } from './types';

const validatestreamerName = (streamerName: string | number) => {
    return !!streamerName && typeof streamerName === 'string';
};

export const createEventBroacaster = function(
    webhooksSubscriber: IWebhooksSubscriber,
    client: ISubscriptionGuard,
    port: number
): IBroadcaster & IStartableService {
    const io = socketIo({});

    const subscriptionBySocketId = new Map<string, string>();

    io.on('connection', ws => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        ws.on('twitch_subscribe', async function (
            { id: subscriptionId, secret: subscriptionSecret }: { id: string, secret: string }
        ) {
            const authorization = await client.authorizeSubscription({
                subscriptionId,
                subscriptionSecret
            });

            if (!authorization.authorized) {
                ws.emit('twitch_subscribe_unauthorized');
                return;
            }
            
            if (validatestreamerName(authorization.streamerName)) {
                console.log(`[Broadcaster] subscribing to channel ${authorization.streamerName}`);
                ws.leaveAll();
                ws.join(`channel.${authorization.streamerName}`);
                subscriptionBySocketId.set(ws.id, subscriptionId);
            } else {
                console.log(`[Broadcaster] Attempted subscribing to an invalid channel Id ${authorization.streamerName}`);
            }
        });

        ws.on('disconnecting', function () {
            const subId = subscriptionBySocketId.get(ws.id);
            ws.leaveAll();
            if (subId) {
                void webhooksSubscriber.removeSubscription(subId);
            }
        });
    });

    return {
        start: async () => {
            console.log(`Broadcast websockets server is listening on ${port}`); 
            io.listen(port);
        },
        close: async () => { io.close(); },
        broadcast (payload) {
            io.to(`channel.${payload.streamerName}`).emit('twitch_event', payload);
        },
    };
};

