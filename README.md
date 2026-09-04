# honomi-board（穂乃味ボード）

社長と現場責任者が、部屋（room）単位で非同期にやりとりする共有ボード。

- **本番**: https://rsb79692-create.github.io/honomi-board/
- **リポジトリ**: https://github.com/rsb79692-create/honomi-board
- **構成タイプ**: Type C（Firebase + GitHub Pages）— timecard-git と同型

## 使い方

社長がメンバーを招待し、部屋を作って相手を入れる。部屋の中に4つの枠がある。

| 枠 | 書ける人 |
|---|---|
| 〇〇ビジョン | 社長のみ |
| 現場からの報告 | 全員 |
| 〇〇への相談 | 全員 |
| 〇〇からの指針 | 社長のみ |

**部屋に入れた人だけがその部屋を見られる。** 別タブの「現場マネジメント」（施設・スタッフ・案件）は
部屋をまたいで全員共通。

メンバーを外したいときは、設定から `active` を false にする（アカウント削除は不要）。

## 開発

ビルドなし・npm なし・依存なし。**`index.html` 1ファイルが本番そのもの**。
Firebase は CDN の compat SDK を script タグで読んでいる。

```bash
# 編集して push するだけ。GitHub Pages が main のルートを配信する
git add index.html && git commit -m "..." && git push

# 反映を待ってから本番を確認する（数十秒〜数分かかる）
curl -s https://rsb79692-create.github.io/honomi-board/ | head
```

アクセスルールを変えるときだけ:

```bash
firebase deploy --only database --project honomi-timecard
```

## ⚠ 触る前に必ず読むこと

**Firebase プロジェクト `honomi-timecard` を timecard と共有している。**
RTDB のルールは1ファイルに timecard（`honomi`）とボード（`rooms`/`members`/`config`/`field`）が
同居しており、`firebase deploy --only database` は**ルール全体を置換する**。
ボード側だけをデプロイすると timecard が止まる。

また **GitHub Pages はリポジトリ直下を丸ごと配信する**ため、旧版 HTML をコミットすると
本番URLから誰でも閲覧できてしまう。`_old/` と `_backup_*/` は gitignore のまま維持すること。

詳細な運用ルール・データ構造・過去に踏んだ罠は [`AGENTS.md`](AGENTS.md) を参照。

## ディレクトリ

```
honomi-board/
├── index.html            アプリ本体（これが本番）
├── database.rules.json   RTDB のアクセスルール（timecard と共有）
├── firebase.json
├── .firebaserc
├── AGENTS.md             運用ルール・固有の事実
├── CLAUDE.md             _shared_claude への参照
├── docs/
├── _old/                 旧版の控え（gitignore）
└── _backup_*/            移行前バックアップ（gitignore）
```
