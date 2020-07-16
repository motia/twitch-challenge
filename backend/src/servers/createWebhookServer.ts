import * as express from 'express';
import * as getRawBody from 'raw-body';
import * as morgan from 'morgan';
import { parse as parseUrl } from 'url';
import { Server } from 'http';
import { WebhookOptions, IWebhooksHandler, IStartableService, BroadCastCallback, IWebhooksRepository } from '../types';
import { handleNotification, handleVerification } from '../createWebhookHandler';

export const createWebhookServer = function (
    webhookRepository: IWebhooksRepository,
    webhookOptions: WebhookOptions,
    port: number,
    broadcast: BroadCastCallback,
): IWebhooksHandler & IStartableService {
    const respond = (res: express.Response, status: number, message: string | undefined) => {
        res.writeHead(status);
        res.end(message);
    };
    const host = '0.0.0.0';

    let _server: Server;
    const handler = {
        start: async () => {
            _server = app.listen(port, host, () => console.log(`[WebhookHandler] listening at http://${host}:${port}`));
        },
        close: async () => { _server?.close(); },
        broadcast,
        handleVerification,
        handleNotification,
    };

    const app = express();

    app.use(morgan('combined'));
    app.all((parseUrl(webhookOptions.url).pathname || '') + '/:webhook',
        async function (req, res) {
            const { webhook } = req.params;
            if (!webhook) {
                console.error(`[WebhookSubscriber] received an invalid call on ${req.path}`);
                respond(res, 404, 'Invalid channel');
                return;
            }
            if (req.method.toUpperCase() === 'GET') {
                void handler.handleVerification(
                    webhookRepository,
                    webhook,
                    req.query as { [k: string]: string },
                    (status, message) => { respond(res, status, message); }
                );
            } else if (req.method.toUpperCase() === 'POST') {
                void handler.handleNotification(
                    webhookRepository,
                    webhookOptions,
                    webhook,
                    req.headers as { [x: string]: string },
                    req.body ? JSON.parse(await getRawBody(req.body, true)) : '',
                    (status, message) => respond(res, status, message),
                    broadcast
                );
            } else {
                respond(res, 405, 'Invalid request method');
            }
        });

    return handler;
};
