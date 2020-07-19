import * as express from 'express';
import { Server } from 'http';
import Axios from 'axios';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';

export const buildUrl = function (route: string, params: { [k: string]: string | number } = {}): string {
    const path = Object.keys(params).reduce((acc, k) => {
        return acc.replace(new RegExp(`:${k}(/|$)`), `${params[k]}/`);
    }, route);

    if (path.endsWith('/')) {
        return path.substr(0, path.length - 1);
    }

    return path;
};


export class ExpressifyCommand<ResponseData> {
    readonly baseUrl: string;
    readonly method: 'get' | 'post' | 'delete';
    
    constructor(
        readonly path: string,
        readonly localCall: false | ((
            params: {[k: string]: string},
            payload: string | { [j: string]: string },
            req: express.Request,
            res: express.Response
        ) 
            => Promise<ResponseData>),
        requestOptions?: { baseUrl?: string, method?: 'get' | 'delete' | 'post' }
    ) {
        this.baseUrl = requestOptions?.baseUrl || '127.0.0.1';
        this.method = requestOptions?.method || 'post';
    }

    async remoteCall(
        params: { [k: string]: string | number },
        payload?: {[k: string]: string } | any
    ): Promise<ResponseData> {
        console.debug(`[ExpressifyRequest] ${this.method} ${this.baseUrl}/${this.path} with ${JSON.stringify(params)}, ${JSON.stringify(payload)}`);

        const axiosPayload = {
            baseURL: this.baseUrl,
            method: this.method,
            url: buildUrl(this.path, params),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            data: payload,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        try {
            const { data } = await Axios.request<ResponseData>(axiosPayload);
            console.info(`[ExpressifyRequest] ${this.method} ${this.baseUrl}/${this.path} success`, data);
            return data;
        } catch (e) {
            console.error(`[ExpressifyRequest] ${this.method} ${this.baseUrl}/${this.path} failed`);

            throw e;
        }
    }
}

interface Expressified {
    serverName?: string;
    start(): Promise<void>
    close(): Promise<void>
}

export const expressify = function(
    hostConfig: number | { host: string, port: number },
    commands: ExpressifyCommand<unknown>[],
    startUp?: () => Promise<void>,
    cleanUp?: () => Promise<void>,
): Expressified {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true,
    }));
    app.use(morgan('combined'));


    commands.forEach(cmd => {
        app[cmd.method]('/'+cmd.path, async (req, res) => {
            console.log(`[ExpressifyHandler] ${cmd.method} ${req.url} payload:`, req.body);

            let result = '';
            let status = 500;
            try {
                result = cmd.localCall ? (await cmd.localCall(
                    { ...req.params },
                    req.body,
                    req, res
                )) as string: '';
                status = 200;
            } catch (e) {
                console.log(`[ExpressifyHandler] error ${cmd.method} ${req.url} payload:`, req.body);
            }

            if (!res.finished) {
                res.status(status).json(result).end();
            }
        });
    });

    let _server: Server;

    const { host, port } = typeof hostConfig === 'number' 
        ? { host: '0.0.0.0', port: hostConfig } 
        : hostConfig;

    return {
        serverName: undefined,
        start: async function() {
            if (startUp) {
                await startUp();
            }
            _server = app.listen(
                port,
                host,
                () => console.log(`[${this.serverName || ''}-Expressify] listening at http://${host}:${port}`)
            );
        },
        close: async () => { 
            _server?.close();
            if (cleanUp) {
                await cleanUp();
            }
        },
    };
};
