import { EventsRepository } from './EventsRepository';
import { Client, Pool } from 'pg';
import { deepStrictEqual, fail } from 'assert';

describe('insert events', function() {
    const client = new Client;
    const streamerName = `streamer${(Math.random() * 10000).toFixed()}`;

    it('inserts events', async function() {
        await client.connect();

        try {
            await client.query('BEGIN');

            await Promise.all([
                client.query(
                    'INSERT INTO subscriptions (viewer_name, streamer_name, secret, created_at) VALUES ($1, $2, $3, $4)',
                    ['viewer_1', streamerName, 'xxxx', new Date()]
                ),
                client.query(
                    'INSERT INTO subscriptions (viewer_name, streamer_name, secret, created_at) VALUES ($1, $2, $3, $4)',
                    ['viewer_2', streamerName, 'xxxx', new Date()]
                ),
                client.query(
                    'INSERT INTO subscriptions (viewer_name, streamer_name, secret, created_at) VALUES ($1, $2, $3, $4)',
                    ['viewer_3', streamerName, 'xxxx', new Date()]
                ),
            ]);

            const repo = new EventsRepository(client as any as Pool);
            await repo.saveEvents({ streamerName, eventType: 'follow', createdAt: new Date() });

            const savedEvents = await client.query<{ viewer_name: string }>(
                'SELECT viewer_name FROM events WHERE streamer_name = $1 ORDER BY viewer_name ASC',
                [streamerName]
            );
            deepStrictEqual(savedEvents.rows.map(x => x.viewer_name), ['viewer_1', 'viewer_2', 'viewer_3']);
            await client.query('ROLLBACK');
        } catch (e) {
            await client.query('ROLLBACK');
            fail(e);
        }
    });

    this.afterAll(async () => {
        await client.end();
    });
});

