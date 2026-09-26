# X Bookmark Shelf

[English](README.en.md) | [简体中文](README.zh-CN.md)

SafariでXのブックマークと「いいね」を読み取り、Mac内に別々に保存するSafari Web Extensionです。保存した投稿の一覧・検索・期間絞り込み・JSON出力ができます。X公式APIや非公開Web APIは使いません。

## ダウンロードして使う

1. [最新リリースのZIP](https://github.com/yoshimana/Saved-Shelf-X/releases/latest/download/X-Bookmark-Shelf-macos.zip)をダウンロードして解凍し、`X Bookmark Shelf.app` を「アプリケーション」フォルダへ移動します。
2. 初回はFinderでControlキーを押しながらアプリをクリックし、**開く** を選びます。macOSが起動を止めた場合は、「システム設定」→「プライバシーとセキュリティ」で **このまま開く** を選び、再度開きます。
3. Safariの「設定」→「開発」で **未署名の機能拡張を許可** をオンにします。「開発」タブがない場合は、「詳細」からWeb開発者向け機能を有効にします。
4. Safariの「設定」→「機能拡張」で **X Bookmark Shelf** をオンにし、`x.com` へのアクセスを許可します。

この配布版はSandbox entitlementを埋め込むAd-hoc署名をしていますが、Developer ID署名・公証はしていません。初回起動時にGatekeeperの警告が出た場合は上記のGUI手順で許可してください。Safariの **未署名の機能拡張を許可** はSafariを終了するとリセットされるため、Safariを再起動するたびに手順3を行ってください。Xcodeで自分の署名用Teamを設定してビルドすれば、開発署名付きの拡張として使えます。

## 配布用ZIPを生成

macOS、Xcode、Node.js 22.18以降がある環境で、次を実行します。

`npm run package:release -- ~/Downloads/X-Bookmark-Shelf-macos.zip`

型チェック・テスト、ユニバーサルビルド、アプリと拡張へのAd-hoc署名、Sandbox entitlementの検証、ZIP生成を行います。Developer ID署名・公証は行いません。指定先に同名ファイルがある場合は上書きしません。

## ソースからビルド

必要なもの: macOS 12以降、Safari 15.4以降、Xcode、Node.js 22.18以降、npm。

1. このリポジトリで `npm ci --cache ./work/npm-cache`、`npm run check`、`npm run xcode:sync` を実行します。
2. `Xcode/X Bookmark Shelf/X Bookmark Shelf.xcodeproj` をXcodeで開きます。
3. **Signing & Capabilities** でアプリと拡張の両ターゲットに自分のTeamを選びます。証明書がない場合は両ターゲットの **Signing Certificate** を **Sign to Run Locally** にして、上記のSafari未署名拡張設定を使います。
4. **X Bookmark Shelf** スキームと **My Mac** を選び、**Run** します。

Bundle Identifierが自分のTeamで使えない場合は、アプリと拡張のIDを変更し、`X Bookmark Shelf/ViewController.swift` の `extensionBundleIdentifier` も拡張のIDに合わせてください。

## 使い方

1. Safariで `https://x.com/i/history`（ブックマーク）または `https://x.com/i/history/likes`（いいね）を開きます。旧`/i/bookmarks`は履歴画面へ転送されます。
2. 拡張の「ブックマーク」または「いいね」を選び、必要なら取り込み件数と対象期間（月）を指定して取り込みます。空欄は無制限・全期間です。
3. 初回は一覧を読み込みます。次回からは既存項目を見つけると止まり、新しい項目を保存します。
4. 保存した項目は検索、投稿期間の絞り込み、新しい順・古い順の切り替えができます。JSONは選択中の種類だけを出力します。
5. 「一覧を別タブで開く」から通常のSafariタブで表示できます。削除は選択中の種類だけが対象です。

右上の言語メニューで日本語・English・简体中文を選べます。初回はSafariの優先言語を使い、選択は保存されます。

## データと制約

- 投稿データはSafari拡張のIndexedDBに保存され、外部サーバーへ送信されません。Safariの拡張データを消去すると保存内容も消えるため、必要に応じてJSONへ書き出してください。
- Safari 18.1以降ではJSON出力にBlob URLを使います。Safari 18.0以前ではdata URLへ切り替えるため、大量データではブラウザのURL長制限に達する場合があります。
- Xの画面に表示された投稿を読み取ります。Xの画面構造が変わると取得できなくなる可能性があります。非公開Web APIには依存しません。
- 画面に読み込まれない投稿、削除済み投稿、引用元の本文、メディア本体は保存しません。期間指定は保存日ではなく投稿日時で判定します。
- Xの一覧が新しい順に並ぶことを前提に、既存項目を境に増分取得します。Xの並び順が変わると、新しい投稿を見落とす場合があります。
- X Bookmark ShelfはX Corp.と提携・承認を受けた製品ではありません。

## ライセンス

MIT License。詳細は[LICENSE](LICENSE)を参照してください。
