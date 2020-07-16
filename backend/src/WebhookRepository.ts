// TODO: verify webhooks created by us

import { IWebhooksRepository, WebhookRecord, WebhookType, } from './types';
import { Pool, QueryResult } from 'pg';
import { promisify } from 'util';

type DBWebhookRecord = { id: number, streamer_name: number, type: WebhookType }


// always assume webhook exists for now
export class WebhooksRepository implements IWebhooksRepository {
    constructor(private pgPool: Pool) { }
    createWebhook({ streamerName, type }: { type: WebhookType; streamerName: string; }): Promise<WebhookRecord> {
        return this.query<DBWebhookRecord>(`
            INSERT INTO webhooks (type, streamer_name) VALUES ($1, $2) RETURNING *
        `,
            [type, streamerName]
        ).then(res => this._serializeItems(res.rows)[0])
            .catch(e => { console.error(e); throw e; });
    }


    findWebhook(id: string): Promise<WebhookRecord> {
        return this.query<DBWebhookRecord>(`
            SELECT * from webhooks where id = $1
            `, [id])
            .then(res => this._serializeItems(res.rows)[0] || null);
    }


    removeWebhook(id: string): Promise<void> {
        return this.query<DBWebhookRecord>(`
        DELETE from webhooks where id = $1
        `, [id]
        ).then(() => { });
    }

    private query<T>(text: string, vars: (string | number | Date)[]) {
        return promisify<QueryResult<T>>(cb => {
            this.pgPool.query(text, vars, cb);
        })()
            .catch(e => {
                console.error(`Query ${text} failed`, e); throw e;
            });
    }


    private _serializeItems(rows: DBWebhookRecord[]): WebhookRecord[] {
        return rows.map(x => ({
            streamerName: `${x.streamer_name}`,
            id: `${x.id}`,
            type: x.type,
        }));
    }

}