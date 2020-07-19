import {parseSubscription, handleNotification} from './createWebhookHandler';
import { strictEqual, fail } from 'assert';
import { WebhooksRepository } from './WebhookRepository';
import { BroadcastEvent, WebhookType, WebhookRecord } from './types';

const dummyWebhookEvent = [
    'sha256=3a784332fb389f22cf1dae667161877039c2be0c03b6427f6a004e4a33ced55b',
    '{"data":[{"followed_at":"2020-07-19T20:06:52Z","from_id":"169081942","from_name":"campeaox7","to_id":"67931625","to_name":"Amar"}]}',
    'xxxxxxxxxxxxxxxxx'
];


describe('test check webhook validity', function () {
    it('should return true when valid payload', function () {
        strictEqual(
            parseSubscription(dummyWebhookEvent[1], dummyWebhookEvent[2], dummyWebhookEvent[0]),
            true
        );
    });

    it('should return true when tampered payload', function () {
        strictEqual(
            parseSubscription('{}', dummyWebhookEvent[2], dummyWebhookEvent[0]),
            false
        );
    });
});


describe('test handleNotification', function () {
    const dummyRepo = {
        createWebhook: () => { throw new Error('not implemented'); },
        findWebhook: () => { return {type: 'follow', id: '55', streamerName: 'amar'} as WebhookRecord; },
        removeWebhook: () => { throw new Error('not implemented'); },
    } as any as WebhooksRepository;

    it('broadcasts valid follow event', async function() {
        let event: BroadcastEvent | null = null;
        let status = -1;
        await  handleNotification(
            dummyRepo,
            { secret: dummyWebhookEvent[2], url: '/webook' },
            'dummy id',
            { 'x-hub-signature': dummyWebhookEvent[0] },
            dummyWebhookEvent[1],
            st => {status = st;},
            payload => { event = payload; },
        );

        strictEqual(status, 202);
        if(!event) {
            fail('Event shouldnt be null');
        }
        strictEqual((event as BroadcastEvent).streamerName, 'amar');
        strictEqual((event as BroadcastEvent).createdAt.getTime(), new Date('2020-07-19T20:06:52Z').getTime());
        strictEqual((event as BroadcastEvent).eventType, WebhookType.follow);

        console.log('ok');
    });
});
