import { isBookmarkSurface, isLikeSurface, selectHistoryTab, XDomBookmarkProvider } from './provider';
import type { Message, SyncResult } from './types';

let syncing = false;

function send(message: Message): Promise<unknown> {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error('EXTENSION_COMMUNICATION_FAILED'));
    else if (response && typeof response === 'object' && 'error' in response) reject(new Error(String(response.error)));
    else resolve(response);
  }));
}

function monthsAgo(months: number): number {
  const date = new Date();
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return date.getTime();
}

async function sync(requestedSource: 'bookmark' | 'like', maxCount: number | null, months: number | null): Promise<SyncResult> {
  if (syncing) throw new Error('SYNC_ALREADY_RUNNING');
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const routeSource = isLikeSurface(path) ? 'like' : 'bookmark';
  const source = requestedSource;
  if (!isBookmarkSurface(path) && !isLikeSurface(path)) throw new Error('X_HISTORY_REQUIRED');
  if ((routeSource === 'like') !== (source === 'like') && path !== '/i/history') throw new Error('X_SOURCE_MISMATCH');
  if (path === '/i/history' || isLikeSurface(path)) {
    // 履歴のURL自体が分類を示す。対応タブがDOMにあれば念のため選択する。
    selectHistoryTab(source);
    await new Promise(resolve => setTimeout(resolve, 900));
  }
  syncing = true;
  const provider = new XDomBookmarkProvider();
  const seen = new Set<string>();
  const startedAt = Date.now();
  let sequence = 0;
  let unchanged = 0;
  let saved = 0;
  let scanned = 0;
  let skippedOutsideRange = 0;
  let previousHeight = 0;
  const cutoff = months ? monthsAgo(months) : null;
  try {
    // 既存IDを見つけた地点で止める。初回のみ既存IDがなく最下部まで読む。
    // ponytail: 初回走査は最大250画面。より広い収集が必要ならX側のページ境界に合わせて上限を見直す。
    for (let turn = 0; turn < 250; turn++) {
      if (!isBookmarkSurface(location.pathname) && !isLikeSurface(location.pathname)) break;
      if (provider.expandLongPosts()) await new Promise(resolve => setTimeout(resolve, 150));
      const fresh = provider.collect(source).filter(post => !seen.has(post.id));
      fresh.forEach(post => seen.add(post.id));
      const ordered = fresh.map(post => ({ ...post, orderAt: startedAt - sequence++ }));
      const eligible = ordered.filter(post => {
        if (cutoff === null) return true;
        const date = post.createdAt ? Date.parse(post.createdAt) : NaN;
        if (Number.isFinite(date) && date >= cutoff) return true;
        skippedOutsideRange++;
        return false;
      });
      const room = maxCount === null ? eligible.length : Math.max(0, maxCount - saved);
      const eligibleKeys = eligible.slice(0, room).map(post => post.key);
      const result = fresh.length
        ? await send({ type: 'INSERT_UNTIL_KNOWN', posts: ordered, eligibleKeys }) as { saved: number; hitKnown: boolean }
        : { saved: 0, hitKnown: false };
      saved += result.saved;
      scanned += fresh.length;
      if (maxCount !== null && saved >= maxCount) return { saved, scanned, stoppedAtKnown: false, stoppedAtLimit: true, skippedOutsideRange };
      if (result.hitKnown) return { saved, scanned, stoppedAtKnown: true, stoppedAtLimit: false, skippedOutsideRange };
      const height = provider.height();
      if (fresh.length === 0 && height === previousHeight) unchanged++;
      else unchanged = 0;
      if (unchanged >= 4) return { saved, scanned, stoppedAtKnown: false, stoppedAtLimit: false, skippedOutsideRange };
      previousHeight = height;
      provider.scroll();
      await new Promise(resolve => setTimeout(resolve, 850));
    }
    return { saved, scanned, stoppedAtKnown: false, stoppedAtLimit: false, skippedOutsideRange };
  } finally { syncing = false; }
}

chrome.runtime.onMessage.addListener((message: Message, _sender, respond) => {
  if (message.type !== 'SYNC') return;
  sync(message.source, message.maxCount, message.months).then(respond).catch(error => respond({ error: String(error) }));
  return true;
});
