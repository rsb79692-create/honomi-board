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

社長（谷口）と現場責任者が、部屋（room）単位で共有するボード。

**1項目＝1枚のノート**で、中身は複数のブロック（行）として並ぶ。
書く欄をそのままクリックして直接編集し、自動保存する（「書く」「保存」ボタンは無い）。
ブロックは左のハンドル（⣿）で上下に並べ替えでき、右の × →「消す」で1行ずつ消す。
**コメント・返信・「見た」（既読）・未読バッジは持たない**（2026-09-05 に UI から撤去）。

共有ボードは**1つの画面**で、PC では左右2列にする（`.cols`。719px 以下は縦1列）。
**左が「自分側」、右が「相手側」**で、ログインした人によって左右の意味が入れ替わる。
双方がまったく同じURL・同じ中身を見る（ページを分けない）。
どの欄を誰が書くかは**欄で決まっている**ので、左右の振り分けに `by` は使わない。

| キー | 見出し（閲覧者から見た向き） | 列 | 書ける人 |
|---|---|---|---|
| `ceoMind` | 「わたしの／〇〇のビジョン」 | 社長側 | 社長のみ |
| `toManager` | 「〇〇への／〇〇からの指針」 | 社長側 | 社長のみ |
| `toCeo` | 「〇〇への／〇〇からの報告」 | 現場側 | その部屋の現場側 |
| `mgrAsk` | 「〇〇への／〇〇からの相談」 | 現場側 | その部屋の現場側 |

⚠ **4欄すべてを画面に出す**（2026-09-05 に `toCeo` / `mgrAsk` を復活。本番の `toCeo` に実データあり）。
`saveBoard` は `rooms/{rid}/board/{key}` と**欄ごとに** `set()` する。
配列を丸ごと置換するので、**同じ欄を同時に書くと後勝ちになる**（社長と現場は別の欄なので通常はぶつからない）。
`board` を丸ごと `set()` する書き方へ戻すと、触っていない欄まで巻き添えにする。

書き足せるのは自分側の欄だけ。**人が書いた行を直す・消せるのは本人と社長だけ**（施設メモと同じ規則）。
他人の行があるときは「自分が書いた行だけ直せます。」と出す。

別タブに「現場マネジメント」（`field`: 施設・スタッフ・課題）があり、これは**部屋をまたいで全員共通**。
施設メモもノート形式で、**書き足しは全員、人が書いた行を直す・消せるのは本人と社長だけ**。

「課題・対応事項」は `field.cases` の一覧で、**内容 / 担当 / 状態**の3つだけを持つ。
状態は `status`（`todo` / `doing` / `done`）で、古いデータ用に `done`（真偽）も併せて書く。
`status` を持たない古い行は `stat()` が `done` から読み替える。**期限・優先順位・タグ・サブタスクは作らない。**
⚠ 旧「次にすること」（`cases[].next`）は画面から外したが**データは残す**
（2026-09-05 時点で本番の `field.cases` は 0 件なので、実データの滞留は無い）。

### 閲覧リンク（`view.html`・2026-09-05 追加）

利用者ごとに**専用の閲覧URL**を発行できる。ログイン不要で、その人向けの内容だけを読める。

```
https://rsb79692-create.github.io/honomi-board/view.html#<32文字のあいことば>
```

- 社長の設定画面「利用者」の各行から、発行／コピー／作り直す／やめる ができる
- 見せるのは**その人がいる部屋のビジョンと指針の本文だけ**。UID・メールアドレス・他の人・
  その人がいない部屋・`toCeo` / `mgrAsk`・`field` は入れない。
  ⚠ これは**意図的な線引き**であって、画面に出していないからではない（4欄とも画面には出る）。
  `viewPayload()` の許可リスト（`VIEW_KEYS`）を画面側の `sections()` と共通化してはならない
- 閲覧ページは**書き込みのコードを持たず**、`firebase-auth` も読み込まない
- 現場側の利用者のログインは今までどおり（撤去していない）。閲覧リンクはその部分集合

- 本番URL: https://rsb79692-create.github.io/honomi-board/
- リポジトリ: https://github.com/rsb79692-create/honomi-board （GitHub Pages / main / ルート配信）

---

## 構成

**単一ファイル**。`index.html` に HTML・CSS・JS が全て入っている（ビルドなし・npm なし・依存なし）。
Firebase は CDN の compat SDK を script タグで読む（`firebase-app` / `firebase-auth` / `firebase-database` 10.12.2）。

```
honomi-board/
├── index.html            ← アプリ本体。これが本番そのもの
├── view.html             ← 閲覧専用ページ（ログイン不要・読むだけ）
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
| `views` / `viewLinks` | ボード（閲覧リンク・2026-09-05 追加）。**マージ時に落とすと全員の閲覧リンクが死ぬ** |
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

viewLinks/{uid}  = { token, createdAt }        ← 台帳。社長だけが読み書きできる
views/{token}    = { uid, who, updatedAt,      ← 見せてよい中身の写し（平文テキストのみ）
                                                  uid はルールが失効を判定するために必須
                     rooms:[{ name, secs:[{ title, items:[本文,…] }] }] }
```

- 旧形式の `author:"ceo"/"mgr"` は `by:<UID>`、`seen:true` は `seenBy:{相手UID:true}` へ変換済み。
- 実際の UID・メールアドレスは**このリポジトリが public のため記載しない**。
  必要なときは Firebase コンソールか `members` ノードを直接見ること。

---

## アクセス制御

アプリはログイン後 `members/{uid}` を購読し、**レコードが無いか `active === false` なら自動 signOut** する。

- **利用者を外す操作は「削除」だけ**（2026-09-05 に変更。一時的に止める `active=false` の操作は撤去した）。
  設定画面の「利用者」欄は `使えます` ＋ `削除` で、`confirm()` を挟む。
  削除は**1回の multi-path update** で次を落とす。部屋そのもの・共有ボードの中身・`field` は消さない。

  | 消すノード | 意味 |
  |---|---|
  | `rooms/{その人が入っている全部屋}/members/{uid}` | 部屋のメンバー登録（**認可の正**） |
  | `members/{uid}` | 名簿。配下の `rooms` も一緒に消える（**購読の正**） |
  | `viewLinks/{uid}` と `views/{token}` | 渡してある閲覧リンク（台帳と写しの両方） |

  この2系統は**二重管理**なので、`Object.keys(rooms)` と `members[uid].rooms` の**和集合**から消す。
  片方だけだと部屋の側に幽霊のメンバー行が残る。

- ⚠ **Firebase Auth のアカウントは消さない**（アプリに消す仕組みを持たせない）。
  そのため削除しても**その人はログインでき、ルールの `honomi` ブロックが `auth != null` しか
  要求しないので timecard 側の勤怠データを読み書きできる**（AGENTS.md「既知の未解決事項」と同じ穴）。
  削除の完了メッセージで「Firebase コンソールでそのアカウントを無効化してください」と案内している。
- ⚠ **削除した人を戻すときは、そのアカウントのパスワードが要る。**
  「人を追加する」は `createUserWithEmailAndPassword` が `auth/email-already-in-use` で落ちたあと、
  同じメール・パスワードで `signInWithEmailAndPassword` して UID を取り直し、名簿へ入れ直す。
  **UID が変わらないので、過去の投稿の `by` とも整合する。**
  パスワードが分からないときは、本人にログイン画面の「パスワードを忘れた」から再設定してもらう。
- `active` はルール条文（`members` / `config` / `field` / `viewLinks` / `views` / `rooms`）が
  今も見ているので**フィールドごと消してはならない**。招待時に `true` を書くだけで、
  `false` を作る経路はもう無い（`members/$uid` の `.validate` も `role` と `active` を必須にしている）。
  古いデータに `false` が残っている場合に備え、表示と `newRoomHtml` / `syncViews` の分岐は残してある。
- 社長は `rooms` 全体を購読。mgr は `members/{uid}/rooms` に列挙された部屋だけを個別購読する

### 閲覧リンクの認可（サーバーが無い作りでどう絞るか）

GitHub Pages の静的配信なので、**サーバー側で「読んでよい人か」を判定する場所が無い**。
RTDB のルールは「読もうとしているパス」しか判定材料にできず、
「あいことばを知っているから `rooms/xxx` を読ませる」という条件は**書けない**。

そこで、見せてよい中身だけを `views/{あいことば}` へ写し、閲覧ページにはそこ1パスだけを読ませる。

- `views` の `.read` は**社長だけ**。あいことばを知らない他人は**子を列挙できない**（1件も取れない）
- ⚠⚠ **`views/$token` の `.read` を `true` にしてはいけない。** 失効がクライアント任せになる。
  実際の条文は「**台帳が今もこのあいことばを指していて、その人が `active` である**」:

  ```
  data.child('uid').exists()
  && root.child('viewLinks').child(data.child('uid').val()).child('token').val() === $token
  && root.child('members').child(data.child('uid').val()).child('active').val() === true
  ```

  これにより、写しを消し損ねても・回線が切れても、**台帳を消すか `active` を false にした時点で読めなくなる**。
  そのために写しへ本人の `uid` を入れている（見るのは本人なので露出しても実害はない）。
  失効すると読み取りが拒否されるので、`view.html` は `PERMISSION_DENIED` を
  「このリンクは使えません」として案内する（通信不良と区別する）
- `.write` は社長のみ。`.validate` で形（`uid` / `updatedAt` / `rooms` 必須、余分な子は不可）を縛る
- ⚠ 社長に `views` の `.read` を与えているのは**置き土産を片づけるため**。
  写しは token を知らないと読めないので、台帳から外れた写しは社長からも見えないと誰も消せない。
  入り直したときに1回だけ `sweepViews()` が `viewLinks` に無い写しを消す
- **見せる部屋が無くなったら写しごと消す。** 名前だけの写しを残すと、氏名が読めたままになる
- **画面を離れる前に `flushViews()` で予約中の更新を出しきる。**
  取りこぼすと「消したはずの行」が閲覧リンク側に残る
- あいことばは `crypto.getRandomValues` の24バイト（192ビット）を base64url にした32文字。
  連番・氏名・メールアドレス・UID は使わない
- ⚠ **台帳を `members/{uid}` に置いてはいけない。** `members` は全 active 利用者が読めるので、
  他人のあいことばを読んで他人の閲覧ページを開けてしまう。`viewLinks`（社長だけ）へ置くこと
- あいことばは URL の **`#` のあと**に置く。`#` から先はサーバーにもリファラにも送られない。
  `?query` やパスにすると GitHub のアクセスログに残る
- 写しは社長のブラウザが書く。中身が変わったときだけ書き、社長がアプリを開き直すと追いつく
- 失効は写しを消すこと（`views/{token}` を削除）。作り直す・やめる・利用者を止める、のいずれでも消える

### ルール設計で踏んだ罠（本番で再現確認済み・繰り返さないこと）

**1. `.write` はカスケードし、下位で剥奪できない**
上位ノードで `.write` を許可すると、下位ノードの厳しい `.write` では取り消せない（下位は加算のみ）。
`rooms/$rid` に「社長 or メンバー」の `.write` を置き、配下の `name`/`members` を「社長のみ」に
していたため、mgr が**部屋名の改変・第三者UIDの追加・社長の締め出し・部屋ごと削除**まで実行できた。

正: `rooms/$rid` の `.write` は**社長限定**。メンバーの書き込みは
`rooms/$rid/board/toCeo` と `rooms/$rid/board/mgrAsk` に**下位で足す**（下記 3 も参照）。
条件は `data` ではなく `root.child('rooms').child($rid).child('members')` で判定する。

**2. `members` の自己登録は権限昇格になる**
`members/$uid` の `.write` に `auth.uid === $uid && !data.exists()` を入れてはいけない。
`role` の `.validate` が `'ceo'` を許すため、**認証さえ通れば誰でも自分を ceo として登録できる**。
timecard が匿名認証を使っており無効化できないので、条件は実質ゼロ。

**3. `board` の `.write` は欄ごとに置く（2026-09-05）**
`rooms/$rid/board` に「社長 or 部屋メンバー」の `.write` を置くと、`.write` がカスケードして
**現場側が社長のビジョン・指針まで REST から書き換え・全消去できる**。
下位（`ceoMind` など）で剥奪はできない。

正: `board` 自体には `.write` を**置かない**。`board/toCeo` と `board/mgrAsk` にだけ
「社長 or その部屋のメンバー」を置く。`ceoMind` / `toManager` は `rooms/$rid` の
`.write`（社長のみ）だけが効くので、現場側からは書けない。

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

- **構文チェック**: `node --check` は HTML には使えない。`<script>` の中身を切り出して `node --check` する。
  **`index.html` と `view.html` の両方**が対象（`view.html` を忘れやすい）
- **JSON 検証**: `database.rules.json`
- **CSS の指定順**: `@media` ブロックは、上書きしたい規則より**後ろ**に置く。
  同じ詳細度なら後勝ちなので、前に置くとあとから来る通常規則に負ける
  （`.pline button` の 480px 指定で実際に踏んだ）
- **本番データに触らない機能確認**: `index.html` の CDN Firebase を、メモリ上の偽実装
  （`initializeApp` / `auth` / `database.ref().on|set|update`）へ差し替えたページを作り、
  ローカルの HTTP サーバーで開いて実操作する。UI・CSS は本番と同一のまま検証できる。
  偽実装は**変更のあったパスの購読者だけへ通知**すること（全購読者へ通知すると、
  本番では起きない再描画が起きて検証結果が変わる）
- **本番 smoke**: 本番URLを curl（HTTP 200・想定文字列の有無）＋ ブラウザで実ログインし、
  部屋・投稿・タブ表示と console エラー0件を確認
- **狭い画面の確認**: ブラウザのウィンドウは最小幅の制限で 400px まで縮まらない。
  同一オリジンの `iframe`（`width:390px`）へ同じページを読み込み、`contentDocument` を見る。
  `resize_window` の結果を信じないこと（変わっていなくても成功と返る）
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
- **削除系の UI は `confirm()` を出す**（部屋削除・利用者削除・案件/スタッフ/施設の削除）。ブラウザ自動操作は固まるので押さない。
  検証で押す必要があるときは `window.confirm` を差し替えてから押す（戻り値で「やめる」も試せる）。
  ただし**ノート内の行の削除だけは `confirm()` を使わない**（× → 行の下に出る「消す / やめる」の2段階）
- **保存を遅らせる（debounce）ときは、書き込む中身を「予約した時点」で確定させる。**
  `set()` のクロージャの中で `board()` を評価すると、発火までに部屋を切り替えた場合に
  **別の部屋の内容を書き込んで元の部屋を全消去する**（2026-09-05 に修正）。
  部屋切替・ログアウトの直前には `flushSaves()` で保留中の保存を出しきる
- **書き込みは触った欄だけに絞る。** `rooms/{rid}/board/{key}` と `field/{facilities|staff|cases}`
  単位で `set()` する。`board` や `field` を丸ごと `set()` すると、
  ① 触っていない欄まで巻き添えにする ② debounce 中に届いた
  他の人の更新を消す。**上位ノードを丸ごと `set()` しないこと**。
  知らない欄を渡されたときは、`field` を丸ごと書く代わりに書かずに知らせる
- **`textarea` の高さを測るとき、`height:auto` の一瞬でスクロールバーが消えると本文幅が変わり、
  行数を読み違えて最後の行が切れる。** `html { scrollbar-gutter: stable }` で幅を固定し、
  `requestAnimationFrame` でもう一度測る
- **ボタンを押している最中に `innerHTML` を差し替えるとクリックが消える。**
  mousedown と mouseup の間に再描画が入ると click が発火しない。`held()` ガードで押している間は描き直さない
- **入力中（IME 変換中）に再描画してはいけない。** `composing` の間は `pendingRender` に退避し、
  `compositionend` で描く。末尾の空欄が実体化するときも再描画せず `promoteRow()` で DOM を直接作り替える

- **`view.html` であいことばを URL から消してはいけない。** `history.replaceState` で `#` を消すと
  見た目は安全になるが、**開き直し・ブックマーク・引っぱって更新で読めなくなる**。
  端末に控えを残す作りにすると、共有の端末で次の人に残る。URL に置いたままにする
- **あいことばをパスへ連結する前に必ず形を確かめる**（`/^[A-Za-z0-9_-]{22,64}$/`。
  `view.html` と `database.rules.json` の両方で同じ形に揃えること）。
  緩めるとスラッシュや `..` を混ぜて別のパスを読みにいける
- **同じ URL でフラグメントだけ変えても、ブラウザはページを読み込み直さない。**
  検証で別のあいことばを試すときは、クエリを変えるなどして必ず読み込み直させること

### 閲覧リンクで受け入れているリスク（欠陥ではなく設計上の判断）

- ⚠ **失効させる操作は「作り直す」「リンクを止める」「利用者を削除する」の3つだけ。**
  部屋から外しても台帳（`viewLinks`）は残る。写しは消えるので一時的に読めなくなるが、
  **部屋へ入れ直すと同じURLがまた読めるようになる**。渡したURLを本当に無効にしたいときは
  必ず「リンクを止める」か「作り直す」を押すこと（画面にもその旨を出している）
- ⚠ **台帳から外れた写しを掃除するときは、写しを先に、台帳をあとに読む。**
  逆にすると、読んでいる間に別のタブで作られたリンクの写しを消してしまう
- **URL を知っている人は誰でも読める。** 転送・スクショ・端末の紛失で漏れる。
  **有効期限は設けていない**（恒久的な閲覧手段のため）。**漏れたことを検知する手段も無い**。
  失効は社長が「作り直す」「やめる」「利用者を削除する」を押したときだけ
- `FIREBASE_CONFIG` が `index.html` と `view.html` に二重にある（ビルドが無いため）。
  プロジェクトを移すときは**両方**直すこと

## 既知の未解決事項（今回の変更範囲外）

- ⚠ **写しを書くのは社長のブラウザだけ。** mgr が自分の欄（`toCeo` / `mgrAsk`）を書いても
  `views/{token}` は追いつかない。ただし閲覧リンクへ載せるのはビジョンと指針だけなので、
  実害は「社長が最後に開いた時点の内容が出る」ことに留まる

- ⚠ **`by` の詐称は今も可能。** 画面には作成者も日時も出さないので、`by` を自分の UID へ
  書き換えれば「本人だけが直せる」判定を回せる。`board` / `field` とも `.validate` を持たないため、
  ルール側でも止まらない。**「直せるのは本人だけ」は UI 層の担保にとどまる**
- ⚠ **同じ欄を同時に書くと後勝ちになる。** `saveBoard` / `saveField` は配列を丸ごと置換する。
  同じ部屋に現場側が2人いる場合、`toCeo` を同時に書くと片方の行が消えうる
  （2026-09-05 時点の本番は各部屋に現場側1名なので発生しない）
- `members/{uid}` が更新されるたびに `rooms` / `members` / `config` / `field` の購読が
  多重登録される（`off()` されない）。1回のスナップショットで render が複数回走る
- 部屋の「変える」で保存すると、capture 側の更新に続いて bubble 側の `makeroom` も走り、
  **同名の空部屋が二重に作られる**（capture 側で `stopPropagation()` していないため）
- ⚠ **施設メモ・課題の担当者名は全利用者が読み書きできる。** `database.rules.json` の `field` は
  `.read` / `.write` とも「有効な利用者全員」なので、mgr は REST から他人の行を編集・削除・全消去できる。
  `items[].by` を自分の UID へ書き換えれば画面上でも編集可能になる
- ⚠ **board の利用者は timecard 側のデータも読み書きできる。** ルールの `honomi` ブロックは
  `auth != null` だけを条件にしているため、board のアカウントの idToken で
  `/honomi.json?auth=<idToken>` にアクセスできる（逆方向は `members/{uid}` を要求するので遮断済み）
- `field/*` の `id` など DB 由来の値は、ノート以外の描画箇所でも属性に入る。
  現在は `esc()` を通しているが、`id` の形式検証（ルール側の `.validate`）は入っていない
- 空にした行の自動削除は「**その画面で今作った行**（`ui.fresh`）」だけ。
  前のセッションから在る行は空にしても消えず、× →「消す」が要る
- 圏外でログアウトすると、直前（最大700ms）の入力が無音で失われうる。
  ログアウトは保留中の保存を出しきるのを 1.5 秒だけ待って打ち切る仕様のため
  （待たないとログアウト不能になる）。打ち切った分は再接続時に未認証で拒否される

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
