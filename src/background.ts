import { clearCollection, insertUntilKnown, list } from './db';
import type { Message } from './types';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type !== 'INSERT_UNTIL_KNOWN' && message.type !== 'LIST' && message.type !== 'CLEAR') return;
  const task = message.type === 'INSERT_UNTIL_KNOWN'
    ? insertUntilKnown(message.posts, new Set(message.eligibleKeys))
    : message.type === 'CLEAR' ? clearCollection(message.source) : list(message.source);
  task.then(sendResponse).catch(error => sendResponse({ error: String(error) }));
  return true;
});
