import * as express from 'express';
import * as morgan from 'morgan';
import { parse as parseUrl } from 'url';
import { Server } from 'http';
import { WebhookOptions, IWebhooksHandler, IStartableService, BroadCastCallback, IWebhooksRepository } from '../types';
import { handleNotification, handleVerification } from '../createWebhookHandler';
import bodyParser = require('body-parser');

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
            _server = app.listen(port, () => console.log(`[WebhookHandler] listening at http://${host}:${port}`));
        },
        close: async () => { _server?.close(); },
        broadcast,
        handleVerification,
        handleNotification,
    };

    const app = express();

    app.use(morgan('dev'));
    const path = (parseUrl(webhookOptions.url).pathname || '').replace(/\/$/, '') + '/:webhook';
    app.get(path, async function(req, res) {
        const { webhook } = req.params;
        if (!webhook) {
            console.error(`[WebhookSubscriber] received an invalid call on ${req.path}`);
            respond(res, 404, 'Invalid channel');
            return;
        }

        void handler.handleVerification(
            webhookRepository,
            webhook,
            req.query as { [k: string]: string },
            (status, message) => { respond(res, status, message); }
        );
    });
    app.post(path,
        async function (req, res) {
            const { webhook } = req.params;
            if (!webhook) {
                console.error(`[WebhookSubscriber] received an invalid call on ${req.path}`);
                respond(res, 404, 'Invalid channel');
                return;
            }

            bodyParser.text({ type: '*/*' })(req, res, () => {
                console.log('Request body as string' , req.body);
                void handler.handleNotification(
                    webhookRepository,
                    webhookOptions,
                    webhook,
                    req.headers as { [x: string]: string },
                    req.body,
                    (status, message) => respond(res, status, message),
                    broadcast
                );
            });
        });

    return handler;
};
