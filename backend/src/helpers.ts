import { parse as parseUrl } from 'url';
import * as dotEnv from 'dotenv';
import * as path from 'path';
import * as ngrok from 'ngrok';

export const validatestreamerName = (streamerName: string): boolean=> {
    return !!streamerName;
};

export const throwEnvVarRequired = (key: string): void => { throw new Error(`${key} env variable is required`); };

export const parsePortNumberFromEnv = (key: string): number | null => {
    const str = process.env[key];
    if (!str) {
        return null;
    }
    const n = parseInt(str);
    if (!isNaN(n) && n) {
        return n;
    }
    throw new Error(`${key} is an invalid port number`);
};

export const parseUrlFromEnv = (key: string): string | null => {
    const str = process.env[key];
    if (!str) {
        return null;
    }
    const url = parseUrl(str);
    if (url.hostname && (url.protocol === 'http:' || url.protocol === 'https:')) {
        return url.href;
    }
    throw new Error(`${key} is an invalid url`);
};

export const loadDotEnv = function(): void {
    // TODO: disable in AWS Lambdas
    dotEnv.config({ path: path.join(__dirname, '..', '.env') });
};

export function loadConfig(): {
    WEBSERVER_PORT: number,
    TWITCH_REDIRECT_URI: string,
    BROADCASTING_SERVER_PORT: number,
    BROADCASTING_WS_PORT: number,
    WEBHOOK_HANDLER_LOCAL_PORT: number,
    WEBHOOK_SUBSCRIBER_PORT: number,
    WEBHOOK_HANDLER_URL: string | undefined,
    WEBHOOK_HANDLER_SECRET: string,
    TWITCH_CLIENT_ID: string,
    TWITCH_CLIENT_SECRET: string,
    WEBHOOK_HANDLER_OVER_NGROK: boolean,
} {
    const BROADCASTING_WS_PORT = parsePortNumberFromEnv('BROADCASTING_WS_PORT') || 9000;
    const BROADCASTING_SERVER_PORT = parsePortNumberFromEnv('BROADCASTING_SERVER_PORT') || 9001;
    const WEBHOOK_SUBSCRIBER_PORT = parsePortNumberFromEnv('WEBHOOK_SUBSCRIBER_PORT') || 9002;
    const WEBHOOK_HANDLER_LOCAL_PORT = parsePortNumberFromEnv('WEBHOOK_HANDLER_LOCAL_PORT') || 9003;

    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || throwEnvVarRequired('TWITCH_CLIENT_ID') || '';
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || throwEnvVarRequired('TWITCH_CLIENT_SECRET') || '';

    const WEBHOOK_HANDLER_SECRET = process.env.WEBHOOK_HANDLER_SECRET || throwEnvVarRequired('WEBHOOK_HANDLER_SECRET') || '';
    const WEBHOOK_HANDLER_URL = process.env.WEBHOOK_HANDLER_OVER_NGROK
        ? undefined
        : parseUrlFromEnv('WEBHOOK_HANDLER_URL') || throwEnvVarRequired('WEBHOOK_HANDLER_URL') || '';

    const TWITCH_REDIRECT_URI = parseUrlFromEnv('TWITCH_REDIRECT_URI') 
        || throwEnvVarRequired('TWITCH_REDIRECT_URI') || '';

    const WEBSERVER_PORT = parsePortNumberFromEnv('WEBSERVER_PORT') || 9005;

    return {
        WEBSERVER_PORT,
        TWITCH_REDIRECT_URI,
        BROADCASTING_SERVER_PORT,
        BROADCASTING_WS_PORT,
        WEBHOOK_HANDLER_LOCAL_PORT,
        WEBHOOK_SUBSCRIBER_PORT,
        WEBHOOK_HANDLER_URL,
        WEBHOOK_HANDLER_SECRET,
        TWITCH_CLIENT_ID,
        TWITCH_CLIENT_SECRET,
        WEBHOOK_HANDLER_OVER_NGROK: !!process.env.WEBHOOK_HANDLER_OVER_NGROK,
    };
}


export const prepareNgrokProxy = function (port: number): Promise<string> {
    return ngrok.connect({ proto: 'http', port });
};