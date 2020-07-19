import { IWebhooksSubscriber, IBroadcaster, IStartableService, ISubscriptionGuard, BroadcastEvent } from '../types';
import { ExpressifyCommand, expressify } from './expressify';
import { createEventBroacaster } from '../createSocketIoBroadcaster';


const createCommands = (port: number, serverOptions: {io: IBroadcaster} | false) => {
    const baseUrl = `http://127.0.0.1:${port}`;

    return {
        broadcast: new ExpressifyCommand(
            'broadcast',
            serverOptions ? async (_, payload) => {
                if (typeof payload === 'string') {
                    throw new Error('Payload should not be a string');
                }
                serverOptions.io.broadcast(payload as any as BroadcastEvent);
            } : false,
            { baseUrl }
        )
    };
};

export const createEventBroacasterHttpClient = function (port: number): IBroadcaster {
    const commands = createCommands(port, false);

    return {
        broadcast: payload => commands.broadcast.remoteCall({}, payload)
    };
};

export const createEventBroacasterOverHttp = function (
    webhooksSubscriber: IWebhooksSubscriber,
    publicClient: ISubscriptionGuard,
    wsPort: number,
    httpPort: number
): IStartableService {
    const io = createEventBroacaster(webhooksSubscriber, publicClient, wsPort);
    const commands = createCommands(httpPort, { io });

    const expressified = expressify(
        httpPort,
        Object.values(commands),
        () => io.start(),
        () => io.close()
    );

    expressified.serverName = 'EventsBroadcaster';

    return {
        ...expressified,
    };
};
