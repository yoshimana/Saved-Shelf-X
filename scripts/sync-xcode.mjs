import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const resources = 'Xcode/X Bookmark Shelf/X Bookmark Shelf Extension/Resources';
if (existsSync(resources)) {
  for (const entry of readdirSync(resources)) rmSync(join(resources, entry), { recursive: true, force: true });
}
cpSync('dist', resources, { recursive: true });
console.log('Xcodeの拡張リソースを更新しました。');
