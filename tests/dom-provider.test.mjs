import assert from 'node:assert/strict';
import { statusFromHref } from '../src/provider.ts';
import { migratePostRecord } from '../src/db.ts';
import { jsonDownloadUrl } from '../src/export.ts';

const json = '{"text":"日本語🌱"}';
const legacyUrl = jsonDownloadUrl(json, 'Mozilla/5.0 Version/18.0 Safari/605.1.15');
assert.equal(Buffer.from(legacyUrl.split(',')[1], 'base64').toString(), json);
const blobUrl = jsonDownloadUrl(json, 'Mozilla/5.0 Version/18.1 Safari/605.1.15');
assert.ok(blobUrl.startsWith('blob:'));
assert.equal(await (await fetch(blobUrl)).text(), json);
URL.revokeObjectURL(blobUrl);

const legacyPost = {
  id: '123', url: 'https://x.com/someone/status/123', handle: 'someone',
  author: 'Someone', text: 'saved', createdAt: null, savedAt: '2024-01-02T03:04:05.000Z'
};
const migratedPost = migratePostRecord(legacyPost, 1);
assert.equal(migratedPost.key, 'bookmark:123');
assert.equal(migratedPost.source, 'bookmark');
assert.equal(migratedPost.orderAt, -Date.parse(legacyPost.savedAt));
assert.deepEqual(migratePostRecord({ ...migratedPost, key: 'like:123', source: 'like' }, 2), { ...migratedPost, key: 'like:123', source: 'like' });

assert.deepEqual(statusFromHref('/someone/status/123?s=20'), { id: '123', url: 'https://x.com/someone/status/123', handle: 'someone' });
assert.equal(statusFromHref('https://evil.example/someone/status/123'), null);
assert.equal(statusFromHref('/someone/likes'), null);

const clicked = [];
const button = (testId, label) => ({
  getAttribute: name => name === 'data-testid' ? testId : name === 'aria-label' ? label : null,
  textContent: label,
  click: () => clicked.push(label)
});
const articles = [
  [button('tweet-text-show-more-link', ''), button('', '返信を表示')],
  [button('', 'さらに表示')]
];
globalThis.document = { querySelectorAll: () => articles.map(controls => ({ querySelectorAll: () => controls })) };
const { XDomBookmarkProvider } = await import('../src/provider.ts');
assert.equal(new XDomBookmarkProvider().expandLongPosts(), 2);
assert.deepEqual(clicked, ['', 'さらに表示']);
