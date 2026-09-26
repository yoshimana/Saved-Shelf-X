export type Collection = 'bookmark' | 'like';

export type Post = {
  key: string;
  id: string;
  source: Collection;
  orderAt: number;
  url: string;
  author: string;
  handle: string;
  text: string;
  createdAt: string | null;
  savedAt: string;
};

export type Message =
  | { type: 'SYNC'; source: Collection; maxCount: number | null; months: number | null }
  | { type: 'INSERT_UNTIL_KNOWN'; posts: Post[]; eligibleKeys: string[] }
  | { type: 'CLEAR'; source: Collection }
  | { type: 'LIST'; source: Collection };

export type SyncResult = { saved: number; scanned: number; stoppedAtKnown: boolean; stoppedAtLimit: boolean; skippedOutsideRange: number };

declare global {
  const chrome: {
    runtime: {
      onMessage: { addListener: (fn: (message: Message, sender: unknown, sendResponse: (value: unknown) => void) => boolean | void) => void };
      sendMessage: (message: Message, callback: (response: unknown) => void) => void;
      getURL: (path: string) => string;
      lastError?: { message: string };
    };
    tabs: {
      query: (query: { active?: boolean; currentWindow?: boolean }, callback: (tabs: { id?: number; url?: string }[]) => void) => void;
      sendMessage: (tabId: number, message: Message, callback: (response: unknown) => void) => void;
      create: (details: { url: string }) => void;
    };
  };
}
