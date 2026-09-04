# honomi-board — 開発・QA・レビュー・出荷の共通ルール

> このセクションは Claude Code を手放しで自走運用するための共通ルールです。
> ここに書いてあるのは**コード・設定ファイル・本番の実測で確認できた事実のみ**です。確認できない項目は明示的に「未確認」と記載しています。推測で運用ルールを増やさないこと。

## 共通運用ルール（_shared_claude 参照）

> **本リポジトリは `_shared_claude` 参照運用の横展開リポジトリである。**
> 全リポジトリ共通の運用ルール（姿勢・禁止事項・agent 役割・出荷/DB/報告の手順）は
> [`../_shared_claude/`](../_shared_claude/) を **single source of truth** として参照する。本 AGENTS.md には
> **honomi-board 固有の事実とルール** を残し、共通項は重複させず参照に寄せる。共通ルールと矛盾した場合は、
> **honomi-board 固有の「事実」（下記各セクションの記載）を優先**する。

honomi-board は技術構成タイプ **Type C（Firebase + GitHub Pages）**。timecard-git と同型。

| 参照ファイル | honomi-board での扱い |
|---|---|
| [`../_shared_claude/RULES.md`](../_shared_claude/RULES.md) | そのまま適用 |
| [`../_shared_claude/AGENTS.md`](../_shared_claude/AGENTS.md) | 適用（migration-agent → **firebase-agent** に読み替え） |
| [`../_shared_claude/DEPLOY.md`](../_shared_claude/DEPLOY.md) | **読み替え必須**（Vercel READY 判定なし。GitHub Pages の反映確認に置換） |
| [`../_shared_claude/DB.md`](../_shared_claude/DB.md) | **ほぼ非適用**（Supabase/migration/RLS の概念なし）。汎用原則のみ |
| [`../_shared_claude/REPORT.md`](../_shared_claude/REPORT.md) | そのまま適用 |

---

## 何のアプリか

社長（谷口）と現場責任者が、部屋（room）単位で非同期にやりとりする共有ボード。
1部屋の中に4つの投稿枠がある。

| キー | 見出し | 書ける人 |
|---|---|---|
| `ceoMind` | 「〇〇ビジョン」 | 社長のみ |
| `toCeo` | 「現場からの報告」 | 全員 |
| `mgrAsk` | 「〇〇への相談」 | 全員 |
| `toManager` | 「〇〇からの指針」 | 社長のみ |

別タブに「現場マネジメント」（`field`: 施設・スタッフ・案件）があり、これは**部屋をまたいで全員共通**。

- 本番URL: https://rsb79692-create.github.io/honomi-board/
- リポジトリ: https://github.com/rsb79692-create/honomi-board （GitHub Pages / main / ルート配信）

---

## 構成

**単一ファイル**。`index.html` に HTML・CSS・JS が全て入っている（ビルドなし・npm なし・依存なし）。
Firebase は CDN の compat SDK を script タグで読む（`firebase-app` / `firebase-auth` / `firebase-database` 10.12.2）。

```
honomi-board/
├── index.html            ← アプリ本体。これが本番そのもの
├── database.rules.json   ← RTDB のアクセスルール（timecard と共有・後述）
├── firebase.json         ← database.rules.json を指すだけ
├── .firebaserc           ← default: honomi-timecard
├── docs/
├── _old/                 ← 旧版の控え（gitignore 済み）
└── _backup_*/            ← 移行前バックアップ（gitignore 済み）
```

⚠ **GitHub Pages はリポジトリ直下を丸ごと配信する。** 旧版 HTML をコミットすると本番URLから
誰でも閲覧できてしまう（Firebase の apiKey も含まれる）。`_old/` `_backup_*/` は必ず gitignore のまま維持すること。

---

## 最重要: Firebase プロジェクトを timecard と共有している

**`honomi-timecard`（RTDB は `honomi-timecard-default-rtdb` / asia-southeast1）を timecard と再利用している。**
この共有関係はコードを読んでも気づけない。片方の設定変更がもう片方を壊す。

### RTDB ルールは1ファイルに全系統が同居

| トップレベル | 用途 |
|---|---|
| `honomi` | **timecard 専用**（`tc5_records` に `.indexOn: ["date"]`。実データ4400件超） |
| `rooms` / `members` / `config` / `field` | ボード |
| `mileage` / `authz` / `ratelimit` | ルール未定義＝クライアントからは不可視。Admin SDK 経由で使用 |

`firebase deploy --only database` は**ルール全体を置換する**。ボード側だけをデプロイすると timecard が即死する。

**変更手順（必須）**
1. 本番の現行ルールを取得する
   `GET https://honomi-timecard-default-rtdb.asia-southeast1.firebasedatabase.app/.settings/rules.json`
   （サービスアカウントの OAuth2 アクセストークンを `Authorization: Bearer` で渡す）
2. 既存キーを保持したままマージする
3. デプロイ後に取得し直し、**`honomi` ブロックが不変であること**を照合する

### Firebase Auth
- **匿名認証は timecard の起動経路。絶対に無効化しない。**
- ボード用にメール／パスワードも有効化してある（両方 on が正しい状態）。
  招待フローが `createUserWithEmailAndPassword` を使うため、サインアップ自体は無効化できない。

---

## データ構造

旧 `/board` は 2026-09-04 に部屋対応へ移行して廃止・削除済み。

```
rooms/{rid}   = { name, members:{uid:true}, board:{ ceoMind, toCeo, mgrAsk, toManager } }
  投稿        = { id, text, by:<UID>, createdAt, done, seenBy:{uid:true},
                  replies:[{ id, text, by, createdAt }] }
members/{uid} = { name, mail, role:"ceo"|"mgr", active, rooms:{rid:true} }
config/ceoName
field/{ facilities, staff, cases }
```

- 旧形式の `author:"ceo"/"mgr"` は `by:<UID>`、`seen:true` は `seenBy:{相手UID:true}` へ変換済み。
- 社長 = `zhTcuHSahOXKHwWY7tQjV5FzptO2`（rsb79692@gmail.com）
- 谷村 = `4Ir6ivrl1ROiUdX4xPo4u0AThJz1`（honomi1209izumi@gmail.com）

---

## アクセス制御

アプリはログイン後 `members/{uid}` を購読し、**レコードが無いか `active === false` なら自動 signOut** する。
- **締め出しは `active` を false にするだけ**（アカウント削除やパスワード変更は不要）
- 社長は `rooms` 全体を購読。mgr は `members/{uid}/rooms` に列挙された部屋だけを個別購読する

### ルール設計で踏んだ罠（本番で再現確認済み・繰り返さないこと）

**1. `.write` はカスケードし、下位で剥奪できない**
上位ノードで `.write` を許可すると、下位ノードの厳しい `.write` では取り消せない（下位は加算のみ）。
`rooms/$rid` に「社長 or メンバー」の `.write` を置き、配下の `name`/`members` を「社長のみ」に
していたため、mgr が**部屋名の改変・第三者UIDの追加・社長の締め出し・部屋ごと削除**まで実行できた。

正: `rooms/$rid` の `.write` は**社長限定**。メンバーの書き込みは `rooms/$rid/board` に**下位で足す**。
`board` 側の条件は `data` ではなく `root.child('rooms').child($rid).child('members')` で判定する。

**2. `members` の自己登録は権限昇格になる**
`members/$uid` の `.write` に `auth.uid === $uid && !data.exists()` を入れてはいけない。
`role` の `.validate` が `'ceo'` を許すため、**認証さえ通れば誰でも自分を ceo として登録できる**。
timecard が匿名認証を使っており無効化できないので、条件は実質ゼロ。

正: `members/$uid` の `.write` は**社長のみ**。招待フローは `createUserWithEmailAndPassword` を
別名アプリ（`"invite"`）で実行したあと、**社長のセッションのままの primary app** から
`members/{新UID}` を書くので問題なく動く。`.validate": "newData.hasChildren(['role','active'])"` も併せて付ける。

---

## デプロイ

`DEPLOY.md` の commit→push→health→commit ID 記載 という骨子は流用可。ただし **Vercel は使っていない**。

1. `index.html` を編集
2. commit → push（main / ルート）
3. **GitHub Pages の反映を待つ**（数十秒〜数分。`curl` でサイズか特定文字列が変わるまでポーリングする）
4. 本番URLを `curl` して HTTP 200 と内容を確認
5. 報告に commit ID を記載

ルール変更を伴う場合のみ `firebase deploy --only database --project honomi-timecard`
（上記「変更手順」を必ず守る）。

---

## QA

npm script は無い。型チェック・build・lint・Playwright・Jest はいずれも使わない。

- **構文チェック**: `node --check` は HTML には使えない。JS を切り出すか、ブラウザの console エラー0件で代替する
- **JSON 検証**: `database.rules.json`
- **本番 smoke**: 本番URLを curl（HTTP 200・想定文字列の有無）＋ ブラウザで実ログインし、
  部屋・投稿・タブ表示と console エラー0件を確認
- **権限テスト**: 下記の「パスワード無しで各ユーザーとして検証する方法」を使い、
  社長・mgr・未登録ユーザーそれぞれで期待どおりの 200 / 401 になることを確認する。
  **UI で見えないことと、ルールで読めないことは別**。必ずルール層で確認する

---

## 作業上の落とし穴（実際に踏んだもの）

- **Git Bash の curl に日本語を `-d` で渡すと CP932 で送られて文字化けする。**
  日本語を RTDB へ書くときは node など UTF-8 が保証される経路を使う
- **シェル変数が空のまま `curl -X DELETE ".../members/$UID.json"` を実行すると `/members` 丸ごと削除になる。**
  UID を使う破壊的操作の前に必ず空チェックする
- **`/members` が消えるとアプリの購読が `!m` を検知して全ユーザーを自動 signOut する**
- ユーザーの idToken は `?auth=<idToken>` クエリで渡す。`Authorization: Bearer <idToken>` は 401
  （Bearer はサービスアカウントの OAuth2 アクセストークン専用）
- **削除系の UI は `confirm()` を出す**（投稿削除・部屋削除・締め出し）。ブラウザ自動操作は固まるので押さない

### パスワード無しで各ユーザーとして本番検証する方法

サービスアカウントでカスタムトークンを作り `signInWithCustomToken` で idToken に交換する。
ページ内で試すときは `firebase.initializeApp(FIREBASE_CONFIG, "別名")` ＋
`Persistence.NONE` にすれば**本人のセッションを壊さずに**検証できる。

---

## 禁止事項（固有の上乗せ）

- `honomi` ブロックを含まないルールをデプロイしない
- 匿名認証・メール／パスワード認証を無効化しない
- 旧版 HTML やサービスアカウント鍵をコミットしない
- 部屋のメンバー構成・投稿は業務データ。検証で書いたものは必ず消す
