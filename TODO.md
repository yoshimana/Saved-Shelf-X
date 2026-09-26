# Project TODOs

## Current Goal
- [/] Sandbox entitlement付きAd-hoc署名でSafari拡張ZIPを作り直し、再リリースする

## Tasks
- [x] 取得・保存・一覧・検索・JSON出力
- [x] 日本語・英語・簡体字中国語の拡張UI
- [x] READMEを3言語化し、未署名版の手順を記載
- [x] macOSアプリをビルドし、GitHub Release用ZIPを作成・公開
- [/] アプリと拡張にSandbox entitlementを埋め込み、再現可能な配布ZIP生成を追加

## Notes / Blockers
- Safariでのログイン済みXを使う実動作はユーザー環境で確認が必要
- Safariの未署名拡張許可はSafari終了後にリセットされる
- v0.1.1のZIPではSandbox entitlement不足によりSafari拡張が登録されない問題を確認
