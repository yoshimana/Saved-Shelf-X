import './style.css';
import type { Collection, Message, Post, SyncResult } from './types';
import { jsonDataUrl } from './export';

const expanded = new URLSearchParams(location.search).get('view') === 'tab';
document.documentElement.classList.toggle('expanded', expanded);
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const postsElement = document.querySelector<HTMLElement>('#posts')!;
const countElement = document.querySelector<HTMLElement>('#count')!;
const search = document.querySelector<HTMLInputElement>('#search')!;
const syncButton = document.querySelector<HTMLButtonElement>('#sync')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export')!;
const clearDialog = document.querySelector<HTMLDialogElement>('#clear-dialog')!;
const clearConfirmText = document.querySelector<HTMLParagraphElement>('#clear-confirm-text')!;
const confirmClearButton = document.querySelector<HTMLButtonElement>('#confirm-clear')!;
const cancelClearButton = document.querySelector<HTMLButtonElement>('#cancel-clear')!;
const bookmarkTab = document.querySelector<HTMLButtonElement>('#bookmark-tab')!;
const likeTab = document.querySelector<HTMLButtonElement>('#like-tab')!;
const sortToggle = document.querySelector<HTMLButtonElement>('#sort-toggle')!;
const openTabButton = document.querySelector<HTMLButtonElement>('#open-tab')!;
const fromDate = document.querySelector<HTMLInputElement>('#from-date')!;
const toDate = document.querySelector<HTMLInputElement>('#to-date')!;
const maxItems = document.querySelector<HTMLInputElement>('#max-items')!;
const monthsInput = document.querySelector<HTMLInputElement>('#months')!;
maxItems.value = localStorage.getItem('xbs.maxItems') || '';
monthsInput.value = localStorage.getItem('xbs.months') || '';
let source: Collection = 'bookmark';
let order: 'newest' | 'oldest' = 'newest';
let sourcePosts: Post[] = [];
let loadedSource: Collection | null = null;
let pendingClear: Collection | null = null;
exportButton.disabled = true;
clearButton.disabled = true;

function fail(response: unknown): never {
  if (response && typeof response === 'object' && 'error' in response) throw new Error(String(response.error));
  throw new Error(chrome.runtime.lastError?.message || '拡張との通信に失敗しました');
}

function message<T>(request: Message): Promise<T> {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(request, response => {
    if (chrome.runtime.lastError || response === undefined || (response && typeof response === 'object' && 'error' in response)) {
      try { fail(response); } catch (error) { reject(error); }
    } else resolve(response as T);
  }));
}

function matchingSourceTab(tab: { id?: number; url?: string }, collection: Collection): boolean {
  try {
    const url = new URL(tab.url || '');
    const path = url.pathname.replace(/\/+$/, '');
    return url.hostname === 'x.com' && (collection === 'like'
      ? path === '/i/history/like' || path === '/i/history/likes'
      : path === '/i/history' || path === '/i/bookmarks');
  } catch { return false; }
}

function targetTab(collection: Collection): Promise<{ id?: number; url?: string }> {
  return new Promise(resolve => chrome.tabs.query(
    expanded ? { currentWindow: true } : { active: true, currentWindow: true },
    tabs => resolve(expanded ? tabs.filter(tab => matchingSourceTab(tab, collection)).at(-1) || {} : tabs[0] || {})
  ));
}

function setting(input: HTMLInputElement): number | null {
  if (!input.value) return null;
  if (!input.validity.valid) throw new Error(`${input.labels?.[0]?.textContent || input.id}は範囲内の数値を入力してください`);
  return Number(input.value);
}

function syncTab(tabId: number, collection: Collection, maxCount: number | null, months: number | null): Promise<SyncResult> {
  return new Promise((resolve, reject) => chrome.tabs.sendMessage(tabId, { type: 'SYNC', source: collection, maxCount, months }, response => {
    if (chrome.runtime.lastError || !response || (typeof response === 'object' && 'error' in response)) {
      try { fail(response); } catch (error) { reject(error); }
    } else resolve(response as SyncResult);
  }));
}

function orderValue(post: Post): number {
  return post.orderAt || -Date.parse(post.savedAt);
}

function updateActionLabels(): void {
  const name = source === 'like' ? 'いいね' : 'ブックマーク';
  syncButton.textContent = `${name}を取り込む`;
  document.querySelector<HTMLButtonElement>('#export')!.textContent = 'JSONを書き出す';
  clearButton.textContent = '保存データを削除';
}

async function refresh(): Promise<Post[]> {
  const [allPosts, bookmarks, likes] = await Promise.all([
    message<Post[]>({ type: 'LIST', source }),
    message<Post[]>({ type: 'LIST', source: 'bookmark' }),
    message<Post[]>({ type: 'LIST', source: 'like' })
  ]);
  sourcePosts = allPosts;
  loadedSource = source;
  exportButton.disabled = false;
  clearButton.disabled = false;
  bookmarkTab.textContent = `ブックマーク ${bookmarks.length}`;
  likeTab.textContent = `いいね ${likes.length}`;
  const query = search.value.trim().toLocaleLowerCase();
  const start = fromDate.value ? Date.parse(`${fromDate.value}T00:00:00`) : -Infinity;
  const end = toDate.value ? Date.parse(`${toDate.value}T23:59:59.999`) : Infinity;
  const posts = allPosts.filter(post => {
    const textMatch = !query || [post.text, post.author, post.handle, post.id].some(value => value.toLocaleLowerCase().includes(query));
    const date = post.createdAt ? Date.parse(post.createdAt) : NaN;
    const dateMatch = start === -Infinity && end === Infinity || Number.isFinite(date) && date >= start && date <= end;
    return textMatch && dateMatch;
  }).sort((a, b) => order === 'newest' ? orderValue(b) - orderValue(a) : orderValue(a) - orderValue(b));
  countElement.textContent = `${posts.length}件 / ${allPosts.length}件`;
  sortToggle.textContent = `Xの表示順：${order === 'newest' ? '新しい順' : '古い順'}`;
  sortToggle.setAttribute('aria-label', `並び順を切り替え。現在は${order === 'newest' ? '新しい順' : '古い順'}`);
  postsElement.replaceChildren();
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = allPosts.length ? '条件に一致する投稿はありません' : 'まだ保存した項目はありません';
    postsElement.append(empty);
    return posts;
  }
  for (const post of posts) {
    const item = document.createElement('article');
    const link = document.createElement('a');
    link.href = post.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${post.author} · @${post.handle}`;
    const body = document.createElement('p');
    body.textContent = post.text || '本文なし（画像・動画などの投稿）';
    const date = document.createElement('small');
    date.textContent = post.createdAt ? new Date(post.createdAt).toLocaleDateString('ja-JP') : '';
    item.append(link, body, date);
    postsElement.append(item);
  }
  return posts;
}

syncButton.addEventListener('click', async () => {
  let maxCount: number | null;
  let months: number | null;
  try {
    maxCount = setting(maxItems);
    months = setting(monthsInput);
    localStorage.setItem('xbs.maxItems', maxItems.value);
    localStorage.setItem('xbs.months', monthsInput.value);
  } catch (error) { status.textContent = String(error); return; }
  const tab = await targetTab(source);
  if (!matchingSourceTab(tab, source) || tab.id === undefined) {
    chrome.tabs.create({ url: source === 'like' ? 'https://x.com/i/history/likes' : 'https://x.com/i/history' });
    status.textContent = `Xの${source === 'like' ? 'いいね' : 'ブックマーク'}画面を開きました。読み込み後、もう一度取り込んでください。`;
    return;
  }
  syncButton.disabled = true;
  clearButton.disabled = true;
  status.textContent = '条件に合う新しい項目を確認中です。';
  try {
    const result = await syncTab(tab.id, source, maxCount, months);
    status.textContent = result.saved
      ? `${result.saved}件を新しく保存しました。${result.stoppedAtLimit ? '件数上限に達して停止しました。' : result.stoppedAtKnown ? '既存の項目で停止しました。' : ''}${result.skippedOutsideRange ? ` 期間外など${result.skippedOutsideRange}件は保存しませんでした。` : ''}`
      : `新しい${source === 'like' ? 'いいね' : 'ブックマーク'}はありません。${result.skippedOutsideRange ? ` 期間外など${result.skippedOutsideRange}件は保存しませんでした。` : ''}`;
    await refresh();
  } catch (error) { status.textContent = String(error); }
  finally { syncButton.disabled = false; clearButton.disabled = false; }
});

clearButton.addEventListener('click', async () => {
  if (loadedSource !== source) return;
  if (!sourcePosts.length) { status.textContent = '削除する保存データはありません。'; return; }
  pendingClear = source;
  clearConfirmText.textContent = `${source === 'like' ? 'いいね' : 'ブックマーク'}の保存データ${sourcePosts.length}件を削除しますか？この操作は取り消せません。`;
  clearDialog.showModal();
});

cancelClearButton.addEventListener('click', () => clearDialog.close());
confirmClearButton.addEventListener('click', async () => {
  if (!pendingClear) return;
  const collection = pendingClear;
  pendingClear = null;
  clearDialog.close();
  confirmClearButton.disabled = true;
  clearButton.disabled = true;
  try {
    const removed = await message<number>({ type: 'CLEAR', source: collection });
    status.textContent = `${removed}件の${collection === 'like' ? 'いいね' : 'ブックマーク'}を削除しました。`;
    await refresh();
  } catch (error) { status.textContent = String(error); }
  finally { confirmClearButton.disabled = false; clearButton.disabled = false; }
});

function setSource(next: Collection): void {
  source = next;
  if (loadedSource !== source) { exportButton.disabled = true; clearButton.disabled = true; }
  updateActionLabels();
  bookmarkTab.setAttribute('aria-selected', String(source === 'bookmark'));
  likeTab.setAttribute('aria-selected', String(source === 'like'));
  status.textContent = '';
  refresh().catch(error => status.textContent = String(error));
}

bookmarkTab.addEventListener('click', () => setSource('bookmark'));
likeTab.addEventListener('click', () => setSource('like'));
sortToggle.addEventListener('click', () => {
  order = order === 'newest' ? 'oldest' : 'newest';
  refresh().catch(error => status.textContent = String(error));
});
openTabButton.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('manager.html?view=tab') }));
if (expanded) openTabButton.hidden = true;
for (const control of [search, fromDate, toDate]) {
  control.addEventListener('input', () => { refresh().catch(error => status.textContent = String(error)); });
  control.addEventListener('change', () => { refresh().catch(error => status.textContent = String(error)); });
}

exportButton.addEventListener('click', () => {
  try {
    if (loadedSource !== source) throw new Error('保存データを読み込み中です。少し待ってから再度お試しください。');
    const exportType = source === 'like' ? 'likes' : 'bookmarks';
    const json = JSON.stringify({ version: 2, type: exportType, exportedAt: new Date().toISOString(), posts: sourcePosts }, null, 2);
    const anchor = document.createElement('a');
    anchor.href = jsonDataUrl(json);
    anchor.download = `x-${exportType}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    status.textContent = `${sourcePosts.length}件の${source === 'like' ? 'いいね' : 'ブックマーク'}を書き出しました。`;
  } catch (error) { status.textContent = String(error); }
});

refresh().catch(error => status.textContent = String(error));
