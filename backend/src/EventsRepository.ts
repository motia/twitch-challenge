import { Pool, QueryResult } from 'pg';
import { TwitchUserId, BroadcastEvent } from './types';
import { promisify } from 'util';

type EventsCountByTypeAndStreamer = {[streamerName: string]: {[eventType: string]: number}};

export class EventsRepository {
  constructor(private pgPool: Pool){}

  async saveEvents(streamerName: TwitchUserId, event: BroadcastEvent): Promise<void> {

    const query = `insert into events (streamer_name, event_type, viewer_name, created_at)
    SELECT '$1', '$2', subscriptions.viewer_name, $3 
    from subscriptions WHERE subscriptions.streamer_name = $4`;

    const values = [
        event.streamerName, event.eventType,
        event.createdAt, streamerName
    ];
    await this.query(query, values);
  }

  private query<T>(text: string, vars: (string | number | Date)[]) {
    return promisify<QueryResult<T>>(cb => {
      this.pgPool.query(text, vars, cb);
    })()
      .catch(e => { console.error(`Query ${text} failed`, e); throw e; });
  }

  async countEventsByStreamers(): Promise<{[streamerName: string]: number}> {
    return this.query<{ streamer_name: string, count: number }>(`
        SELECT count(id) as count, streamer_name from events 
        GROUP BY streamer_name
    `, []).then(res => res.rows.reduce((acc, x) => {
            acc[x.streamer_name] = x.count;
            return acc;
          }, {}));
  }

  async countEventsByStreamersAndEventType(): Promise<EventsCountByTypeAndStreamer> {
    return await this.query<{ event_type: string, streamer_name: string, count: number }>(`
        SELECT count(id) as count, streamer_name, event_type as count from events 
        where streamer_name = ?
        GROUP BY streamer_name, event_type
    `, []).then(res => res.rows.reduce<EventsCountByTypeAndStreamer>((acc, x) => {
        if (!acc[x.streamer_name]) {
          acc[x.streamer_name] = {};
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        acc[x.streamer_name][x.event_type] = x.count;
        return acc;
    }, {}));
  }
}