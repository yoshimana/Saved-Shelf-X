# X Bookmark Shelf

[日本語](README.md) | [简体中文](README.zh-CN.md)

A Safari Web Extension that reads your X bookmarks and likes and stores them separately on your Mac. Browse, search, filter by post date, and export saved posts as JSON. It does not use the official X API or X's private web APIs.

## Download and install

1. Download and unzip the [latest release](https://github.com/yoshimana/Saved-Shelf-X/releases/latest/download/X-Bookmark-Shelf-macos.zip), then move `X Bookmark Shelf.app` to Applications.
2. Open the app. If macOS blocks it, go to **System Settings → Privacy & Security**, choose **Open Anyway** for this app, then open it again.
3. In Safari, open **Settings → Developer** and enable **Allow unsigned extensions**. If Developer is missing, enable web developer features in **Settings → Advanced** first.
4. In **Safari → Settings → Extensions**, enable **X Bookmark Shelf** and allow it to access `x.com`.

This build is not signed with a Developer ID or notarized. Safari resets **Allow unsigned extensions** when Safari quits, so enable it again after each restart. To use a development-signed extension, build from source in Xcode and select your own signing Team for both targets. If you build without a signing identity, the Safari setting is still required.

## Build from source

Requirements: macOS 12 or later, Safari 15.4 or later, Xcode, Node.js 22.18 or later, and npm.

1. In the repository, run `npm ci --cache ./work/npm-cache`, `npm run check`, and `npm run xcode:sync`.
2. Open `Xcode/X Bookmark Shelf/X Bookmark Shelf.xcodeproj` in Xcode.
3. In **Signing & Capabilities**, select your Team for both the app and extension targets. If you don’t have a signing certificate, choose **Sign to Run Locally** for both targets and use the Safari unsigned-extension setting above.
4. Select the **X Bookmark Shelf** scheme and **My Mac**, then click **Run**.

If a Bundle Identifier is unavailable for your Team, change the app and extension identifiers. Also update `extensionBundleIdentifier` in `X Bookmark Shelf/ViewController.swift` to match the extension identifier.

## Use

1. In Safari, open `https://x.com/i/history` for bookmarks or `https://x.com/i/history/likes` for likes. The old `/i/bookmarks` URL redirects to the history page.
2. Choose **Bookmarks** or **Likes** in the extension. Optionally set an import limit and date range in months; leave them empty for no limit and all dates.
3. The first import scans the list. Later imports stop when they reach an already saved post and add only new posts.
4. Search saved posts, filter by post date, and switch between newest-first and oldest-first. JSON export includes only the selected collection.
5. Choose **Open list in a new tab** to browse in a regular Safari tab. Delete affects only the selected collection.

Choose Japanese, English, or Simplified Chinese from the language menu. The extension initially follows Safari’s preferred language and remembers your selection.

## Data and limitations

- Posts are stored in the Safari extension’s IndexedDB and are not sent to an external server. Clearing Safari extension data also deletes saved posts; export JSON for a backup.
- Safari 18.1 and later use Blob URLs for JSON downloads. Safari 18.0 and earlier fall back to data URLs, so very large exports may still hit browser URL-length limits.
- The extension reads posts rendered on X’s page. X may change its page structure and break importing. It does not rely on private web APIs.
- Posts not loaded on the page, deleted posts, quoted-post contents, and media files are not saved. Date range filtering uses the post’s creation date, not the date it was bookmarked or liked.
- Incremental import assumes X displays the newest items first. If X changes the order, newer posts may be missed.
- X Bookmark Shelf is not affiliated with or endorsed by X Corp.

## License

MIT License. See [LICENSE](LICENSE).
