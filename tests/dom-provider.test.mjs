import assert from 'node:assert/strict';
import { statusFromHref } from '../src/provider.ts';
import { jsonDataUrl } from '../src/export.ts';

assert.equal(Buffer.from(jsonDataUrl('{"text":"日本語🌱"}').split(',')[1], 'base64').toString(), '{"text":"日本語🌱"}');

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
