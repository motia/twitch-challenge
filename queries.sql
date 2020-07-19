/* Sample queries, the same are used inside EventsRepository.ts  */
/* Insert event viewers  */
insert into events
    (streamer_name, event_type, viewer_name, created_at)
SELECT 'a0streamer0name', 'follow', subscriptions.viewer_name, '2020-10-12 12:00:00'
from subscriptions
WHERE subscriptions.streamer_name = 'a0streamer0name';

/* Select events queried by streamer */
SELECT count(id) as count, streamer_name
from events
GROUP BY streamer_name


/* Select events queried by streamer and type */
SELECT count(id) as count, streamer_name, event_type
from events
GROUP BY streamer_name, event_type;

