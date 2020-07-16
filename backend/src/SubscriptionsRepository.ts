// TODO: verify subscriptions created by us

import { ISubscriptionsRepository, Subscription, TwitchUserId } from './types';
import { Pool, QueryResult } from 'pg';
import { promisify } from 'util';

type DBSubscriription = { id: number, secret: string, streamer_name: number, viewer_name: string}

function makeid(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


// always assume subscription exists for now
export class SubscriptionsRepository implements ISubscriptionsRepository {    
    constructor(private pgPool: Pool){}

    private query<T>(text: string, vars: (string | number | Date)[]) {
        return promisify<QueryResult<T>>(cb => {
            this.pgPool.query(text, vars, cb);
        })()
        .catch(e => { 
            console.error(`Query ${text} failed`, e); throw e; 
        });
    }
    
    async addSubscription(
        {userName, streamerName}: { userName: string, streamerName: TwitchUserId}
        ): Promise<Subscription> {
        return this.query<DBSubscriription>(`
            INSERT INTO subscriptions (viewer_name, streamer_name, secret, created_at) VALUES ($1, $2, $3, $4) RETURNING *
        `,
        [userName, streamerName, makeid(15), new Date]
        ).then(res => this._serializeItems(res.rows)[0])
            .catch(e => {console.error(e); throw e;});
    }


    private _serializeItems(rows: DBSubscriription[]): Subscription[] {
        return rows.map(x => ({
            userName: x.viewer_name,
            streamerName: `${x.streamer_name}`,
            id: `${x.id}`,
            secret: x.secret
        }));
    }
        
    async findSubscription(id: string): Promise<Subscription | null> {
        return this.query<DBSubscriription>(`
            SELECT * from subscriptions where id = $1
            `, [id])
            .then(res => this._serializeItems(res.rows)[0] || null);
    }
    
    async removeSubscription(id: string): Promise<void> {
        return this.query<DBSubscriription>(`
        DELETE from subscriptions where id = $1
        `, [id]
        ).then(() => {});
    }
    
    async hasChannel(id: string): Promise<boolean> {
        return this.query<{count: number}>(`
        SELECT count(*) as count from subscriptions where streamer_name = $1 LIMIT 1
        `, [id]).then(res => res.rows[0].count > 0);
    }
}