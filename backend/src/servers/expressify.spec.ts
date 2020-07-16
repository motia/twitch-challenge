import { strictEqual } from 'assert';
import { buildUrl } from './expressify';

describe('helpers buildUrl', () => {
    it('replace parameters in relative url', () => {
        strictEqual(buildUrl(':channel', { channel: 'sTrEaM11'}), 'sTrEaM11');
    });

    it('replace parameters in absolute url', () => {
        strictEqual(
            buildUrl('http://sameple-website.com/:channel/subscribe', { channel: 'sTrEaM11' }),
            'http://sameple-website.com/sTrEaM11/subscribe'
        );
    });
});
