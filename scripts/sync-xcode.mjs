import { cpSync } from 'node:fs';

cpSync('dist', 'Xcode/X Bookmark Shelf/X Bookmark Shelf Extension/Resources', { recursive: true });
console.log('Xcodeの拡張リソースを更新しました。');
