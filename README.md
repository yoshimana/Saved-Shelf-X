# X Bookmark Shelf

SafariでXのブックマークといいねを読み取り、投稿を別々にローカル保存するmacOS用Web Extensionです。保存済み投稿は一覧・本文/投稿者検索・期間指定・JSON出力ができます。X公式APIやXの非公開Web APIは使いません。

## 必要なもの

- macOSのXcodeとSafari
- Node.js 22.18以上、npm
- Xにログイン済みのSafari

## ビルドと有効化

1. このフォルダで `npm ci --cache ./work/npm-cache`、`npm run check`、`npm run xcode:sync` を実行します。
2. `Xcode/X Bookmark Shelf/X Bookmark Shelf.xcodeproj` を開きます。
3. Xcodeの **Signing & Capabilities** でアプリと拡張の両ターゲットに自分のTeamを設定します。Bundle Identifierの重複エラーが出たら、アプリを固有のIDにし、拡張をそのIDに `.Extension` を付けたものに変更します。
4. スキーム **X Bookmark Shelf**、実行先 **My Mac** を選び、**Run** します。起動したアプリの案内に従ってSafari設定を開きます。
5. Safariの **設定 → 機能拡張** で **X Bookmark Shelf** をオンにし、`x.com` へのアクセスを許可します。

ソース変更後は `npm run xcode:sync` を実行し、Xcodeで再ビルドします。署名なしのコンパイル確認には次を使えます。

```sh
xcodebuild -project 'Xcode/X Bookmark Shelf/X Bookmark Shelf.xcodeproj' -scheme 'X Bookmark Shelf' -configuration Debug -destination 'generic/platform=macOS' CODE_SIGNING_ALLOWED=NO build
```

## 使い方

1. Safariで `https://x.com/i/history`（ブックマーク）または `https://x.com/i/history/likes`（いいね）を開きます。旧`/i/bookmarks`は履歴画面へ転送されます。
2. 拡張の **ブックマーク / いいね** タブを選び、必要なら新規取り込み件数の上限と投稿日時の範囲（月数）を指定して、取り込みボタンを押します。空欄は無制限・全期間です。履歴画面内の対応タブを選択してから読み込みます。
3. 初回は保存済みIDがないため一覧を一度読み込みます。次回から先頭側にある既存IDを見つけた時点で止め、新しく追加された項目だけを保存します。
4. 画面下の並び順をクリックすると新しい順 / 古い順が切り替わります。取り込み範囲は投稿日時（`createdAt`）で判定し、日時が取得できない投稿は指定期間では保存しません。Xの一覧はブックマーク・いいねをした日時順なので、期間外投稿を飛ばしながら既存IDか件数上限に届くまでスクロールする場合があります。JSON出力は選択中の種類だけを書き出し、ブックマークといいねで別ファイルになります。
5. 保存データの削除は選択中のブックマークまたはいいねだけを確認後に削除します。削除したデータは復元できません。必要な投稿は先にJSONへ保存してください。
6. **別タブで一覧** を押すと、Safariの通常タブで保存済み投稿を表示し、検索・期間絞り込みができます。別タブからの取り込みも、同じウインドウに対象のX履歴タブが開いていれば実行できます。

同じ種類では同じ投稿IDを重複登録せず、既存IDを見つけると読み込みを止めます。ローカル保存先は拡張のIndexedDBです。Safariの拡張データを消去すると保存済み投稿も消えるため、必要に応じてJSONを書き出してください。

## 制約と依存箇所

- Xの履歴画面のDOMに依存します。`src/provider.ts` のタブ名、`article[data-testid="tweet"]`、`[data-testid="tweetText"]`、`[data-testid="tweet-text-show-more-link"]`、`[data-testid="User-Name"]`、投稿URL、`time` の読み取り箇所が、Xの画面変更で壊れる可能性があります。取り込み時に表示中の「さらに表示」を展開して全文を取得します。取得処理は `BookmarkProvider` と `XDomBookmarkProvider` に分離しています。
- 非公開Web APIには依存しません。画面が表示した投稿だけを取得するため、X側で読み込まれない投稿、削除済み投稿、引用元の内容、メディア本体は保存しません。本文がない画像・動画投稿は投稿URLと投稿者を保存します。
- Xの一覧で新しいものから古いものへ並ぶことを前提に、既存IDを境に増分取得します。Xの表示順が変わると、最初の既存IDより後ろにある新規項目を見落とす可能性があります。初回のみ最大250画面まで自動スクロールして取り込みます。
- Xの一覧順を保存時刻の代わりに記録します。期間指定は保存日ではなく、投稿日時を使います。
- Safariの実セッションでの取得動作は環境に依存します。このプロジェクトでは型チェック、取得URLの小テスト、Webビルド、署名なしXcodeビルドまで確認しています。

外部サーバーへの送信処理はありません。拡張が要求するサイト権限は `https://x.com/*` だけです。
