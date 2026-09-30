# AGENTS.md — honomi-board

<!-- 雛形: _shared_claude/templates/AGENTS.template.md。載せる基準・各節の目安・置き場所は
     _shared_claude/README.md「AGENTS.md の構造とサイズ管理」。この注記は残してよい（1 行）。 -->

## 共通運用ルール（_shared_claude 参照）

共通ルールは `../_shared_claude/`（RULES / AGENTS / PROJECT_TYPES / AUTH）を正とする。本書はこのリポジトリ固有の
事実・禁止事項・不変条件だけを置き、共通ルールを言い換えて再掲しない。Type は C（Firebase + GitHub Pages。timecard-git と同型）。

- 共通ルールと矛盾したら honomi-board 固有の「事実」を優先する。**ただし「レビュー範囲」は例外**で、共通 `AGENTS.md`「レビュー範囲」を正本とし、本書・`CLAUDE.md`・`.claude/**`・`docs/**` で同節より狭い範囲を定めない。
- 読み替え: migration-agent → **firebase-agent**。`DEPLOY.md` の Vercel READY は GitHub Pages の反映確認に置換。`DB.md` は汎用原則のみ。
- 本書はコード・設定・本番の実測で確認できた事実だけを書く。確認できない項目は「未確認」と書き、推測で運用ルールを増やさない。

## 構成と環境

- 本番 URL: https://rsb79692-create.github.io/honomi-board/ （GitHub Pages / main / ルート配信・Actions なし）。**public repo**。
- **Pages はリポジトリ直下を丸ごと配信する**（`docs/` も公開される）。旧版 HTML をコミットすると本番URLから誰でも閲覧できる（apiKey も含む）。`_old/` `_backup_*/` は必ず gitignore のまま維持する。
- ビルドなし・npm なし・依存なし。画面は `index.html`（本体＝本番そのもの）と `join.html`（共有リンクの入口）の 2 ファイル。`tools/*.js` は Admin 資格で RTDB を直接書く移行・巻き戻し（`--apply` を付けるまで確認だけ）。
- Firebase: プロジェクト `honomi-timecard`（RTDB `honomi-timecard-default-rtdb` / asia-southeast1）を **timecard と共有**。`FIREBASE_CONFIG` は `index.html` と `join.html` に二重にあるので、移すときは**両方**直す。
- 認証: Firebase Auth のメール／パスワード（社長・共有相手）。匿名認証は timecard の起動経路で、同じプロジェクトで有効。`join.html` が `createUserWithEmailAndPassword` を使うため、メール／パスワードのサインアップも無効化できない。
- 実際の UID・メールアドレス・あいことばは public のため**リポジトリに書かない**（Firebase コンソールか `members` を直接見る）。

## 禁止事項

- `honomi` / `tenants` ブロックを含まないルールをデプロイしない
- 匿名認証・メール／パスワード認証を無効化しない
- 旧版 HTML やサービスアカウント鍵をコミットしない
- 部屋のメンバー構成・投稿は業務データ。検証で書いたものは必ず消す

## DB・共有・データ保護の不変条件

**最重要: Firebase プロジェクトを timecard と共有している**（コードを読んでも気づけない。片方の設定変更がもう片方を壊す。変更前に読む: `docs/features/firebase-shared-rules.md`）

- RTDB ルールは 1 ファイルに全系統が同居。`honomi` / `tenants` / `srv` / `tenantReg` は timecard、`rooms` / `members` / `config` / `field` / `shares` / `shareKeys` / `guestOf` はボード。**マージで `shares` / `shareKeys` / `guestOf` を落とすと全員の共有が死ぬ**。
- `firebase deploy --only database` は**ルール全体を置換する**。ボード側だけを deploy すると timecard が即死し、手元の古い控えのまま deploy すると timecard 側の変更を巻き戻す。**手元の控えは古くなっている前提で扱う**。
- ルール変更の手順（deploy はユーザーの明示承認後）: ① deploy 前に**本番を取得**（`.settings/rules.json`）→ ② 本番へボード側の変更を**マージ**（既存キーを保持）→ ③ deploy 後に取り直し、`honomi` / `tenants` が不変であることを**照合** → ④ **timecard-git の `database.rules.json` と揃える**（逆も同じ）。
- `honomi` / `tenants` の認可の正は `database.rules.json` と timecard-git の `AGENTS.md`。変えるときは必ず両リポジトリを同時に扱う（現況と残る穴: `docs/records/2026-09-06-timecard-honomi-authz.md`）。
  ⚠ `honomi` の起動面（`tc5_pins` 等）は匿名で読める穴が残っている。**緩めない。締めるときは timecard-git と同時に扱う**（役割つきの領域は昇格を待ってから読む）。
- `tenantReg` / `srv` / `mileage` / `authz` / `ratelimit` はルール未定義＝クライアントから見えない（ルールを足さない）。
- DB 由来の値を属性・HTML へ入れるときは必ず `esc()` を通す（`field/*` の `id` はルール側で形式を検証していない）。
- サービスアカウントのアクセストークンは**ルールを全部迂回**し、ボード側まで届く。この鍵を置く場所を増やさない。timecard-git の `FIREBASE_API_KEY` の GitHub Secret は消さない（morning-check が使う）。
- DB のキーは `vision` / `task` / `output` / `routine`。旧キー（`ceoMind` / `toManager` / `toCeo` / `mgrAsk`）は**読まないが消さない**（`normBoard()` が画面から落とすだけ）。名称変更を理由に room ID や DB キーを作り直さない。
- **上位ノードを丸ごと `set()` しない。** 書き込みは `rooms/{rid}/board/{key}` と `field/{facilities|staff|cases}` 単位に絞る（丸ごと書くと他の欄と他人の更新を消す）。知らない欄は書かずに知らせる。
- **保存を遅らせる（debounce）ときは、書き込む中身を「予約した時点」で確定させる**（発火時に `board()` を評価すると別の部屋の内容で元の部屋を全消去する）。部屋切替・ログアウトの直前に `flushSaves()` で出しきる。
- **シェル変数が空のまま `curl -X DELETE ".../members/$UID.json"` を実行すると `/members` 丸ごと削除になる。** 空 UID で DELETE しない（UID を使う破壊的操作の前に必ず空チェック）。`/members` が消えると全ユーザーが自動 signOut する。
- 日本語を RTDB へ書くときは node など UTF-8 が保証される経路を使う（Git Bash の `curl -d` は CP932 で文字化けする）。
- DB の形を変えるときは移行を先に済ませる（`tools/migrate-duo.js` はコピーのみ・旧キーは残す。旧 `mgrAsk` は `routine` へ移さない）。

## 認証・認可の不変条件

**役割表（これと `canWriteKey()` と `database.rules.json` が完全一致していること）**

| 編集者 | 谷口側 `board/owner` | 相手側 `board/guest/{sid}` | 閲覧 |
|---|---|---|---|
| 谷口（ceo） | 編集可 | 編集可 | 両側 |
| 共有相手（guest） | **編集不可**（ルールで拒否） | 自分の sid のみ | 両側（他の相手の列・見出しは不可） |
| 正式メンバー（mgr） | 不可 | 不可 | その部屋のメンバーで `members/{uid}.active === true` なら読める |
| 第三者・未認証 | 不可 | 不可 | 不可 |

- 右列は相手と谷口の共同の場。行ごとの持ち主判定は入れない（`canEditRow` は `canWriteKey` に一本化）。お互いのカードは常に見える（特定のカードだけ隠す限定はしない）。
- **`.write` はカスケードし、下位で剥奪できない**（下位は加算のみ）。上位を厳しくし、下位で足す。条件は `data` ではなく `root` からの引き直しで判定する。
- ⚠⚠ **`rooms/$rid` の `.write` は社長のみ。** `board/owner` には何も足さない。相手が書けるのは下位で足した `board/guest/$sid` だけ（親で相手を許すと左列まで書ける）。
- **`members` の自己登録禁止**: `members/$uid` の `.write` に `auth.uid === $uid && !data.exists()` を入れない（`role` の `.validate` が `'ceo'` を許すため、認証さえ通れば誰でも ceo になれる。匿名認証は無効化できない）。`.write` は社長のみ、`.validate` の `hasChildren(['role','active'])` を併せて保つ。
- 欄の書き手を入れ替えるときは、UI（`canWriteKey()`）と `.write` を**必ず同時に**直す（UI だけ直すと書き込みが `PERMISSION_DENIED` で無音のまま落ちる）。経緯: `docs/records/2026-09-05-rules-design-traps.md`。
- ログイン後 `members/{uid}` を購読し、**レコードが無いか `active === false` なら自動 signOut**。`members/{自分のuid}` の単独購読・`active` フィールドを**消さない**（ルール条文が今も `active` を見る）。`members` の全体購読は撤去済み。戻すなら他人のメール・UID の露出増を承知のうえで。
- mgr を新しく作る経路はアプリに無い（旧「利用者」管理は撤去済み）。**mgr を復活させるなら、先に `field` のルールを絞る**（今は有効な利用者全員が読み書きできる）。
- **既存の mgr の失効は `members/{uid}` を削除する → Auth アカウントを無効化する、の順**（Auth の無効化だけでは足りない）。Auth アカウントは削除せず**無効化**する（理由: `docs/decisions/0002-disable-not-delete-auth-accounts.md`）。
- 共有相手は `field`（現場マネジメント）を読めない（ルールで拒否）。タブごと出さない。
- 詳細（残した購読・部屋の購読・Auth の扱い）: `docs/features/access-control.md`。

## 機能別の不変条件

- **共有リンク（`join.html`）**（変更前に読む: `docs/features/sharing.md`・`docs/decisions/0001-share-link-design.md`）
  - `bind()` の順序（①サインイン／作成 → ② `shareKeys/{token}/claimBy` → ③ `shares/{sid}/uid` → ④ `guestOf/{uid}/{rid}`）を入れ替えてはならない。`claimBy` の条件（あいことばを知っている証拠）をルールから外さない。
  - **`acct` とあいことば（token）は別にする**（同じにすると Firebase コンソールにあいことばが並ぶ）。**作り直す（`sredo`）では `acct` と `uid` を引き継ぐ**（引き継がないと相手が入れなくなる）。
  - **`guestOf` を信用しない。** 認可は必ず `shares/{sid}` の `uid` と `rid` を引き直す（索引は相手が自分で書けるので偽造できる）。
  - `shares`（台帳）の `.read` / `.write` は社長だけ。`shareKeys` の親に `.read` を置かない（列挙させない）。**`shareKeys/$token` に秘密を入れてはならない**（`sid` / `acct` / `rid` / 表示名だけ）。
  - あいことばは `crypto.getRandomValues` の 24 バイトを base64url にした 32 文字（`crypto` が無いブラウザでは作らない）。URL の `#` のあとに置き、`?query`・パスにしない。`join.html` で `#` を消さない（`history.replaceState` で消すと入り直せない）。
  - パスへ連結する前に形を確かめる（`/^[A-Za-z0-9_-]{22,64}$/`）。`join.html` と `database.rules.json` で同じ形に揃える。
  - 失効は「共有をやめる」（`shares/{sid}` と `shareKeys/{token}` を同じ update で落とす）「作り直す」「ボードを削除」の 3 つだけ。部屋のメンバーから外しても止まらない。共有をやめても相手が書いた右列の中身は消さない。
  - クリップボードは押した操作の流れの中でしか書けない（Safari）。`snew` はクリック直後に `clipWrite()` を呼ぶ。
- **経営ボード（左右 2 列）**（変更前に読む: `docs/features/board.md`）: 左は常に谷口、右は常に共有相手。項目の中で人を混ぜない。`by` / `createdAt` は保存を続ける（画面には出さない。`by` は本人申告）。
- **部屋の「作る」「変える」**: 同じボタン（`data-act="makeroom"`）。分岐は `act === "makeroom"` の中の 1 か所だけに置き、「変える」は同じ rid の `name` だけを update する（`rooms/{rid}/members` を書き直さない）。
- **課題・対応事項（`field.cases`）**: 内容 / 担当 / 状態（`status` と旧 `done` を併記）だけ。期限・優先順位・タグ・サブタスクは作らない。施設メモの書き足しは全員、人の行を直す・消すのは本人と社長だけ。
- **削除の確認**: 部屋・案件・スタッフ・施設の削除は `confirm()` を出す（自動操作では押さず `window.confirm` を差し替える）。ノート内の行の削除だけは `confirm()` を使わず 2 段階（× →「消す / やめる」）。
- UI 実装の落とし穴（IME 変換中の再描画・押下中の `innerHTML` 差し替え・`textarea` の高さ・CSS `@media` の順序）: `docs/features/operations.md`「作業上の落とし穴」。

## QA・出荷の固有手順

- npm script は無い（型チェック・build・lint・Playwright・Jest は使わない。build は非該当）。
- 構文: `index.html` と `join.html` の**両方**の `<script>` を切り出して `node --check`（`join.html` を忘れやすい）。
- `tools/*.js` はそのまま `node --check`。
- `database.rules.json` を変えたら JSON 検証し、**ルール層で** 200 / 401 を実測する（社長・mgr・共有相手・未登録）。UI で見えない・読み取り専用に見えることは、読めない・書けないことの証明にならない。
- 共有の失効確認: 失効後の `shareKeys/{token}` は **200 のまま本文 `null`**（401 と書かない）。失効の証明は、同じ相手の idToken で `board/owner` の GET と `board/guest/{sid}` の PUT が 401 になること。RTDB の REST は `.validate` 失敗も 401 で返す。
- ユーザーの idToken は `?auth=<idToken>` で渡す（`Authorization: Bearer` はサービスアカウントの OAuth2 アクセストークン専用）。トークンを表示・保存・commit しない。
- 本番へのアカウント・検証用の部屋の作成と書込みは、経路（CLI・REST・Admin SDK・`tools/*.js`）を問わず**実行前にユーザーの承認**を得る。既存利用者の実トークンは借用しない。`auth_variable_override` は本当に書かれるので捨て値のキーへ書き、後で消す。手順: `docs/features/operations.md`「パスワード無しで各ユーザーとして本番検証する方法」。
- デプロイ（変更前に読む: `docs/features/operations.md`「デプロイ」）:
  - ⚠⚠ **ルールが先、`index.html` が後。** 逆順にすると新しい `index.html` の書き込みを古いルールが拒否し、全滅する。
  - DB の形を変えたときは**移行が先**: 移行（`--apply`）→ ルール deploy → push → Pages 反映確認 → 社長でログイン。
  - push 後は Pages の反映を `curl` でポーリングし、HTTP 200 と内容を確認、報告に commit ID を書く。
- 本番 smoke: 本番URLを curl ＋ ブラウザで実ログイン（入力は人）し、部屋・投稿・タブ表示と console エラー 0 件を確認。

## 文書索引

- 機能詳細: `docs/features/`
- 設計判断: `docs/decisions/`
- 記録: `docs/records/`
- 整理前の AGENTS.md 原文: `docs/records/2026-10-01-agents-md-before-restructure.md`
- 既知の未解決事項: `docs/records/2026-10-01-known-open-issues.md`
