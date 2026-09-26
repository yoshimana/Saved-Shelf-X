import './style.css';
import type { Collection, Language, Message, Post, SyncResult } from './types';
import { jsonDownloadUrl } from './export';
import { translate as t } from './i18n';

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
const languageSelect = document.querySelector<HTMLSelectElement>('#language')!;
const fromDate = document.querySelector<HTMLInputElement>('#from-date')!;
const toDate = document.querySelector<HTMLInputElement>('#to-date')!;
const maxItems = document.querySelector<HTMLInputElement>('#max-items')!;
const monthsInput = document.querySelector<HTMLInputElement>('#months')!;
maxItems.value = localStorage.getItem('xbs.maxItems') || '';
monthsInput.value = localStorage.getItem('xbs.months') || '';
const storedLanguage = localStorage.getItem('xbs.language');
const preferredLanguage = (navigator.languages?.[0] || navigator.language || 'ja').toLowerCase();
let language: Language = storedLanguage === 'ja' || storedLanguage === 'en' || storedLanguage === 'zh-CN'
  ? storedLanguage
  : preferredLanguage.startsWith('zh') ? 'zh-CN' : preferredLanguage.startsWith('en') ? 'en' : 'ja';
let source: Collection = 'bookmark';
let order: 'newest' | 'oldest' = 'newest';
let sourcePosts: Post[] = [];
let loadedSource: Collection | null = null;
let pendingClear: Collection | null = null;
exportButton.disabled = true;
clearButton.disabled = true;

function errorText(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  const errorKeys: Record<string, Parameters<typeof t>[1]> = {
    SAVE_FAILED: 'saveFailed',
    DELETE_FAILED: 'deleteFailed',
    EXTENSION_COMMUNICATION_FAILED: 'communicationError',
    WAITING_FOR_DATA: 'waitingData',
    SYNC_ALREADY_RUNNING: 'syncAlreadyRunning',
    X_HISTORY_REQUIRED: 'historyRequired',
    X_SOURCE_MISMATCH: 'tabMismatch'
  };
  if (errorKeys[detail]) return t(language, errorKeys[detail], { details: '' });
  return detail;
}

function showError(error: unknown): void {
  status.textContent = errorText(error);
}

function fail(response: unknown): never {
  if (response && typeof response === 'object' && 'error' in response) throw new Error(errorText(response.error));
  const detail = chrome.runtime.lastError?.message;
  throw new Error(t(language, 'communicationError', { details: detail ? ` ${detail}` : '' }));
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
  if (!input.validity.valid) throw new Error(t(language, 'invalidNumber', { field: t(language, input === maxItems ? 'maxItems' : 'months') }));
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

function postLinks(post: Post): string[] {
  const found = post.links?.length ? post.links : post.text.match(/https?:\/\/[^\s<>"']+/g) || [];
  return [...new Set(found.flatMap(value => {
    try {
      const url = new URL(value);
      return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? [url.href] : [];
    } catch { return []; }
  }))];
}

function updateActionLabels(): void {
  syncButton.textContent = t(language, source === 'like' ? 'syncLikes' : 'syncBookmarks');
}

function updateTranslations(): void {
  document.documentElement.lang = language;
  languageSelect.value = language;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    element.textContent = t(language, element.dataset.i18n as Parameters<typeof t>[1]);
  });
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = t(language, element.dataset.i18nPlaceholder as Parameters<typeof t>[1]);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(element => {
    element.setAttribute('aria-label', t(language, element.dataset.i18nAria as Parameters<typeof t>[1]));
  });
  updateActionLabels();
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
  bookmarkTab.textContent = t(language, 'bookmarkCount', { count: bookmarks.length });
  likeTab.textContent = t(language, 'likeCount', { count: likes.length });
  const query = search.value.trim().toLocaleLowerCase(language);
  const start = fromDate.value ? Date.parse(`${fromDate.value}T00:00:00`) : -Infinity;
  const end = toDate.value ? Date.parse(`${toDate.value}T23:59:59.999`) : Infinity;
  const posts = allPosts.filter(post => {
    const textMatch = !query || [post.text, post.author, post.handle, post.id].some(value => value.toLocaleLowerCase(language).includes(query));
    const date = post.createdAt ? Date.parse(post.createdAt) : NaN;
    const dateMatch = start === -Infinity && end === Infinity || Number.isFinite(date) && date >= start && date <= end;
    return textMatch && dateMatch;
  }).sort((a, b) => order === 'newest' ? orderValue(b) - orderValue(a) : orderValue(a) - orderValue(b));
  countElement.textContent = t(language, 'count', { visible: posts.length, total: allPosts.length });
  sortToggle.textContent = t(language, order === 'newest' ? 'sortNewest' : 'sortOldest');
  sortToggle.setAttribute('aria-label', t(language, 'sortToggle', { order: t(language, order === 'newest' ? 'sortNewest' : 'sortOldest') }));
  postsElement.replaceChildren();
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = t(language, allPosts.length ? 'noMatches' : 'emptySaved');
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
    body.textContent = post.text || t(language, 'noPostText');
    const links = postLinks(post);
    let linkList: HTMLDivElement | null = null;
    if (links.length) {
      linkList = document.createElement('div');
      linkList.className = 'post-links';
      for (const url of links) {
        const postUrl = document.createElement('a');
        postUrl.className = 'post-url';
        postUrl.href = url;
        postUrl.target = '_blank';
        postUrl.rel = 'noopener noreferrer';
        postUrl.textContent = url;
        linkList.append(postUrl);
      }
    }
    const date = document.createElement('small');
    date.textContent = post.createdAt ? new Date(post.createdAt).toLocaleDateString(language) : '';
    item.append(link, body);
    if (linkList) item.append(linkList);
    item.append(date);
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
  } catch (error) { showError(error); return; }
  const tab = await targetTab(source);
  if (!matchingSourceTab(tab, source) || tab.id === undefined) {
    chrome.tabs.create({ url: source === 'like' ? 'https://x.com/i/history/likes' : 'https://x.com/i/history' });
    status.textContent = t(language, 'openX', { collection: t(language, source === 'like' ? 'collectionLike' : 'collectionBookmark') });
    return;
  }
  syncButton.disabled = true;
  clearButton.disabled = true;
  status.textContent = t(language, 'syncing');
  try {
    const result = await syncTab(tab.id, source, maxCount, months);
    const messages = result.saved ? [t(language, 'syncSaved', { count: result.saved })]
      : [t(language, 'noNew', { collection: t(language, source === 'like' ? 'collectionLike' : 'collectionBookmark') })];
    if (result.stoppedAtLimit) messages.push(t(language, 'limitReached'));
    else if (result.stoppedAtKnown) messages.push(t(language, 'stoppedExisting'));
    if (result.skippedOutsideRange) messages.push(t(language, 'skippedRange', { count: result.skippedOutsideRange }));
    status.textContent = messages.join(' ');
    await refresh();
  } catch (error) { showError(error); }
  finally { syncButton.disabled = false; clearButton.disabled = false; }
});

clearButton.addEventListener('click', async () => {
  if (loadedSource !== source) return;
  if (!sourcePosts.length) { status.textContent = t(language, 'nothingToDelete'); return; }
  pendingClear = source;
  clearConfirmText.textContent = t(language, 'confirmDelete', {
    collection: t(language, source === 'like' ? 'collectionLike' : 'collectionBookmark'), count: sourcePosts.length
  });
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
    status.textContent = t(language, 'deleted', {
      count: removed, collection: t(language, collection === 'like' ? 'collectionLike' : 'collectionBookmark')
    });
    await refresh();
  } catch (error) { showError(error); }
  finally { confirmClearButton.disabled = false; clearButton.disabled = false; }
});

function setSource(next: Collection): void {
  source = next;
  if (loadedSource !== source) { exportButton.disabled = true; clearButton.disabled = true; }
  updateActionLabels();
  bookmarkTab.setAttribute('aria-selected', String(source === 'bookmark'));
  likeTab.setAttribute('aria-selected', String(source === 'like'));
  status.textContent = '';
  refresh().catch(showError);
}

bookmarkTab.addEventListener('click', () => setSource('bookmark'));
likeTab.addEventListener('click', () => setSource('like'));
languageSelect.addEventListener('change', () => {
  language = languageSelect.value as Language;
  localStorage.setItem('xbs.language', language);
  updateTranslations();
  refresh().catch(showError);
});
sortToggle.addEventListener('click', () => {
  order = order === 'newest' ? 'oldest' : 'newest';
  refresh().catch(showError);
});
openTabButton.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('manager.html?view=tab') }));
if (expanded) openTabButton.hidden = true;
for (const control of [search, fromDate, toDate]) {
  control.addEventListener('input', () => { refresh().catch(showError); });
  control.addEventListener('change', () => { refresh().catch(showError); });
}

exportButton.addEventListener('click', () => {
  try {
    if (loadedSource !== source) throw new Error('WAITING_FOR_DATA');
    const exportType = source === 'like' ? 'likes' : 'bookmarks';
    const json = JSON.stringify({ version: 2, type: exportType, exportedAt: new Date().toISOString(), posts: sourcePosts }, null, 2);
    const anchor = document.createElement('a');
    const url = jsonDownloadUrl(json);
    anchor.href = url;
    anchor.download = `x-${exportType}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = t(language, 'exported', {
      count: sourcePosts.length, collection: t(language, source === 'like' ? 'collectionLike' : 'collectionBookmark')
    });
  } catch (error) {
    status.textContent = errorText(error);
  }
});

updateTranslations();
refresh().catch(showError);
