import type { Collection, Post } from './types';

// Xの公開DOMに依存する箇所。UI変更時はここを差し替える。
export interface BookmarkProvider {
  collect(source: Collection): Post[];
  expandLongPosts(): number;
  scroll(): void;
  height(): number;
}

export function isBookmarkSurface(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/i/bookmarks' || path === '/i/history';
}

export function isLikeSurface(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/i/history/like' || path === '/i/history/likes';
}

export function selectHistoryTab(source: Collection): boolean {
  const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
  const tab = tabs.find(element => {
    const label = [element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent]
      .filter(Boolean).join(' ').toLocaleLowerCase();
    return source === 'bookmark'
      ? /bookmarks?|ブックマーク|保存済み|书签|已添加书签/.test(label)
      : /likes?|いいね|喜欢|赞/.test(label);
  });
  if (!tab) return false;
  if (tab.getAttribute('aria-selected') !== 'true') tab.click();
  return true;
}

export function statusFromHref(href: string): { id: string; url: string; handle: string } | null {
  try {
    const url = new URL(href, 'https://x.com');
    const match = /^\/([^/]+)\/status\/(\d+)(?:\/|$)/.exec(url.pathname);
    if (url.hostname !== 'x.com' || !match) return null;
    return { id: match[2], url: `https://x.com/${match[1]}/status/${match[2]}`, handle: match[1] };
  } catch { return null; }
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function extractTweetLinks(article: Element): string[] {
  const urls = new Set<string>();
  for (const link of article.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = safeHttpUrl(link.href);
    if (!href) continue;
    let host = '';
    try { host = new URL(href).hostname; } catch { continue; }
    const expanded = safeHttpUrl(link.getAttribute('data-expanded-url'));
    if (link.getAttribute('data-testid') !== 'urlLink' && host !== 't.co' && !expanded) continue;
    const titled = safeHttpUrl(link.title);
    urls.add(expanded || titled || href);
  }
  return [...urls];
}

function readPost(article: Element, source: Collection): Post | null {
  const timeLink = article.querySelector('time')?.closest('a');
  const statusLinks = timeLink ? [timeLink] : [...article.querySelectorAll('a[href*="/status/"]')];
  const status = statusLinks.map(link => statusFromHref(link.getAttribute('href') || '')).find(Boolean);
  if (!status) return null;
  const author = article.querySelector('[data-testid="User-Name"] span')?.textContent?.trim() || status.handle;
  const tweetText = article.querySelector('[data-testid="tweetText"]');
  const text = tweetText?.textContent?.trim() || '';
  const links = extractTweetLinks(article);
  const createdAt = article.querySelector('time')?.getAttribute('datetime') || null;
  return { ...status, key: `${source}:${status.id}`, source, orderAt: 0, author, text, links, createdAt, savedAt: new Date().toISOString() };
}

export class XDomBookmarkProvider implements BookmarkProvider {
  expandLongPosts(): number {
    let expanded = 0;
    for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
      const button = [...article.querySelectorAll<HTMLElement>('[data-testid="tweet-text-show-more-link"], button, [role="button"]')].find(element =>
        element.getAttribute('data-testid') === 'tweet-text-show-more-link' ||
        /^(show more|もっと見る|続きを読む|さらに表示|显示更多|展开)$/i.test((element.getAttribute('aria-label') || element.textContent || '').trim())
      );
      if (button) { button.click(); expanded++; }
    }
    return expanded;
  }

  collect(source: Collection): Post[] {
    return [...document.querySelectorAll('article[data-testid="tweet"]')]
      .map(article => readPost(article, source)).filter((post): post is Post => post !== null);
  }
  scroll(): void { window.scrollTo(0, document.scrollingElement?.scrollHeight || document.body.scrollHeight); }
  height(): number { return document.scrollingElement?.scrollHeight || document.body.scrollHeight; }
}
