# X Bookmark Shelf — ビルドとセットアップ手順

このプロジェクトは macOS アプリ + Safari App Extension の構成です。以下の手順でローカル実行と拡張の有効化ができます。

## 1. 前提確認
- Xcode の Signing & Capabilities で、アプリターゲットと拡張ターゲットの両方に Team を設定してください。
- 拡張ターゲットの Bundle Identifier は `ViewController.swift` の `extensionBundleIdentifier` と一致させてください。
  - 例: `com.yoshimana.xbookmarkshelf.Extension`

## 2. リソース確認
- `Main.html` がアプリバンドルに含まれている必要があります。
  - Xcode の Build Phases > Copy Bundle Resources に `Main.html` が入っているか確認してください。

## 3. 実行（Run）
1. Xcode 左上の Scheme で「アプリ（macOS App）」ターゲットを選択します。
2. Command + R でビルド＆実行します。
3. アプリが起動し、WebView に UI が表示されます。
4. 画面の指示に従い、Safari の拡張機能設定を開いて拡張を有効化してください。
   - 初回は Safari から許可ダイアログが表示される場合があります。

## 4. Safari 側の有効化
- Safari > 設定 > 拡張機能 から対象の拡張を有効にします。
- 有効化後、アプリの表示は拡張の状態に応じて更新されます。

## 5. トラブルシューティング
- 拡張の状態が取得できない: Bundle Identifier の不一致や Signing 設定を確認してください。
- `Main.html` が表示されない: リソースがバンドルされているか、ファイル名・拡張子が正しいか確認してください。
- JavaScript 連携エラー: コンソールに `[ViewController] JS evaluation error` のログが出ていないか確認し、`Main.html` 側の `show(isEnabled, isAtLeast13)` 実装を確認してください。

## 6. アーカイブ（配布準備）
1. ターゲット（アプリ/拡張）の Version と Build を更新。
2. Scheme をアプリにして Product > Archive。
3. 配布方法に応じて署名/Notarization を実施してください（App Store 配布 or Developer ID + Notarization）。

必要に応じて、より詳細なサインや配布の設定をお手伝いします。Issues やご質問をお知らせください。
