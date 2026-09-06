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

経営ボードは**左右で人を完全に分ける**（`.duo`。PC は2列、719px 以下は縦積み）。

```
経営ボード
┌────────────────┬────────────────┐
│ 谷口           │ 共有相手       │
│  ビジョン      │  ビジョン      │
│  タスク        │  タスク        │
│  アウトプット  │  アウトプット  │
│  ルーティーン  │  ルーティーン  │
└────────────────┴────────────────┘
```

- **左は常に谷口、右は常に共有相手。** 見る人によって入れ替わらない
- **項目の中で人を混ぜない。** ビジョンのカードに谷口と相手が同居することはない
- 8枚がばらばらに見えないよう、人ごとの列を枠（`.side`）で囲み、
  見出し（`.side-h` / `.who-tag`）を `position:sticky` で上に貼り付ける
- 相手が複数いるときだけ、右列の見出しに切り替えボタン（`.side-pick`）が出る。1人なら出ない
- 行ごとの「だれが・いつ」は**出さない**（列そのものが誰の欄かを表すため）。
  `by` / `createdAt` は今までどおり保存する

**役割表（これと `canWriteKey()` と `database.rules.json` が完全一致していること）**

| 編集者 | 谷口側 `board/owner` | 相手側 `board/guest/{sid}` |
|---|---|---|
| 谷口（ceo） | 編集可 | **編集可** |
| 共有相手（guest） | **編集不可**（ルールで拒否） | 自分の sid のみ編集可 |
| 正式メンバー（mgr） | 不可 | 不可 |
| 第三者・未認証 | 不可 | 不可 |

⚠ **mgr は既存データにしか居ない。**旧「利用者」管理を 2026-09-06 に撤去したので、
アプリから新しく作ることはできない（「アクセス制御」節）。

| 閲覧者 | 谷口側 | 相手側 |
|---|---|---|
| 谷口 | 可 | 可 |
| 共有相手 | **可** | 可 |
| 第三者・未認証 | 不可 | 不可 |

⚠ **お互いのカードは常に見える。** 「共有したのに特定のカードだけ見えない」という
限定はしない（旧「閲覧リンク」はビジョンとアウトプットだけだったが、その方式は廃止した）。

⚠ **右列は相手と谷口の共同の場。** 行ごとの持ち主判定は入れていない。
列を書ける人は、その列の中身をどれでも直せる（`canEditRow` は `canWriteKey` に一本化）。

⚠ DB のキーは `vision` / `task` / `output` / `routine`。
旧キー（`ceoMind` / `toManager` / `toCeo` / `mgrAsk`）は**読まないが消さない**。
`normBoard()` が画面用のモデルから落としているだけで、DB には残っている。

別タブに「現場マネジメント」（`field`: 施設・スタッフ・課題）があり、これは**部屋をまたいで全員共通**。
⚠ **共有相手は現場マネジメントを読めない**（ルールで拒否）。タブごと出さない。
施設メモもノート形式で、**書き足しは全員、人が書いた行を直す・消せるのは本人と社長だけ**。

「課題・対応事項」は `field.cases` の一覧で、**内容 / 担当 / 状態**の3つだけを持つ。
状態は `status`（`todo` / `doing` / `done`）で、古いデータ用に `done`（真偽）も併せて書く。
`status` を持たない古い行は `stat()` が `done` から読み替える。**期限・優先順位・タグ・サブタスクは作らない。**

### 経営ボード

**メンバーが谷口ひとりのボード**（旧称「社長の一人部屋」）。左右2列の構造は上記のとおり。

- **DBキー・room ID・データ構造は通常のボードと同じ。** 名称だけの区別ではなく、
  「owner ＝ボードの持ち主、guest ＝共有相手」という1つのモデルで全ボードを扱う
- 名前を付けていないボードは、タブ・設定・共有パネル・招待ページで「経営ボード」と表示する
- ⚠ 名称変更を理由に room ID や DB キーを作り直してはならない

### 共有リンク（`join.html`・2026-09-06 に RCM 方式へ作り替え）

RCM の**施設スタッフ招待リンク**（`/facility/invite/[token]`）と同じ考え方・同じ手数にした。

**共有する側**（RCM の「スタッフアカウント管理」に相当。ボタン2回・入力1項目）

1. 経営ボードで「共有」を押す
2. 宛先の名前を入れる（**名前だけ**。メールアドレスもパスワードも登録しない）
3. 「共有リンクを作成」→ 自動でクリップボードへ入るので、そのまま送る

**共有される側**（RCM の「PIN設定」に相当。入力2・ボタン1）

1. `join.html#<32文字のあいことば>` を開く
2. **あいことばを自分で決める**（8文字以上・確認で2回）
3. 「決めて開く」→ そのまま経営ボードへ入り、右列を書ける
4. **2回目以降は開くだけ**（Firebase Auth が端末に残る）

⚠ **RCM の欠陥は写していない。** 相違点は3つ、いずれも意図的:

| | RCM | honomi-board |
|---|---|---|
| 相手の本人確認 | Cookie のみ。**PIN は保存するだけで照合していない**（`bcrypt.compare` がリポジトリに 0 件） | **Firebase Auth で実際に照合する**。あいことばを知らなければ入れない |
| セッションが切れたら | **行き止まり**（`/facility/login` に入力欄が無く、社長へ再招待を頼むしかない） | 同じURLをもう一度開けば、あいことばで入り直せる |
| token の置き場所 | URL の**パス**（アクセスログ・リファラに残る） | URL の **`#` のあと**（サーバーにもリファラにも送られない） |

**データ構造**

```
shares/{sid}      = { rid, name, token, acct, uid?, createdAt }   台帳。社長だけが読み書きする
shareKeys/{token} = { sid, acct, rid, name, board, owner, claimBy? }
                    あいことばを知っている人だけが引ける（親に .read が無いので列挙できない）
guestOf/{uid}/{rid} = sid    相手が自分で作る索引。**認可の正ではない**（下記）
rooms/{rid}/partners/{sid} = { name }   右列の見出し。社長だけが書く
```

**相手が結び付く手順**（`join.html` の `bind()`。この順序を入れ替えてはならない）

1. `createUserWithEmailAndPassword("<acct>@honomi-board.example", あいことば)`
   （再入場は `signInWithEmailAndPassword`）
2. `shareKeys/{token}/claimBy = auth.uid` … **未設定のときだけ**書ける＝あいことばを知っている証拠
3. `shares/{sid}/uid = auth.uid` … ルールが 2 を見て、**未設定のときだけ**通す
4. `guestOf/{uid}/{rid} = sid` … 本人だけが書ける。`.validate` が `shares` 側と突き合わせる

⚠ **`acct` は相手のログイン用アドレスの素。あいことば（token）とは別にする。**
同じにすると Firebase コンソールの一覧にあいことばが並ぶ。
⚠ **作り直す（`sredo`）では `acct` と `uid` を引き継ぐ。**
引き継がないと、相手が決めたあいことばで入れなくなる。

**失効**

| 操作 | 効果 |
|---|---|
| 「共有をやめる」 | `shares/{sid}` と `shareKeys/{token}` を同じ update で落とす。読み書きとも**その場で**拒否される |
| 「作り直す」 | 新しいあいことばを発行し、旧 `shareKeys/{token}` を落とす。アカウントと列はそのまま |
| ボードを「削除」 | そのボードの共有を全部落とす |

⚠ **`guestOf` の索引が残っていても失効する。** ルールは `guestOf` を信用せず、
必ず `shares/{sid}` の `uid` と `rid` を引き直すため。索引は「どのボードの相手か」を
相手自身が知るための便宜にすぎない。

⚠ **共有をやめても、相手が書いた右列の中身は消さない。** 消すのは「この列を消す」だけ。

- 本番URL: https://rsb79692-create.github.io/honomi-board/
- リポジトリ: https://github.com/rsb79692-create/honomi-board （GitHub Pages / main / ルート配信）

---

## 構成

**単一ファイル**。`index.html` に HTML・CSS・JS が全て入っている（ビルドなし・npm なし・依存なし）。
Firebase は CDN の compat SDK を script タグで読む（`firebase-app` / `firebase-auth` / `firebase-database` 10.12.2）。

```
honomi-board/
├── index.html            ← アプリ本体。これが本番そのもの
├── join.html             ← 共有リンクを受け取った人の入口（あいことばを決める／入り直す）
├── tools/                ← 移行・巻き戻し（node。管理者資格で RTDB を直接書く）
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
| `shares` / `shareKeys` / `guestOf` | ボード（共有）。**マージ時に落とすと全員の共有が死ぬ** |
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
rooms/{rid} = {
  name, ownerName,                       ← ownerName は左列の見出し。相手は config を読めないので写す
  members:{uid:true},                    ← 正式メンバー（mgr）。共有相手はここに入らない
  partners:{ {sid}:{ name } },           ← 右列の見出し。社長だけが書く
  board: {
    owner: { vision:[], task:[], output:[], routine:[] },        ← 左＝谷口
    guest: { {sid}: { vision:[], task:[], output:[], routine:[] } },  ← 右＝共有相手
    ceoMind / toManager / toCeo / mgrAsk                          ← 旧データ。読まない・消さない
  }
}
  行 = { id, text, by:<UID>, createdAt }

members/{uid} = { name, mail, role:"ceo"|"mgr", active, rooms:{rid:true} }
config/ceoName
field/{ facilities, staff, cases }

shares/{sid}      = { rid, name, token, acct, uid?, createdAt }   ← 台帳。社長だけ
shareKeys/{token} = { sid, acct, rid, name, board, owner, claimBy? }  ← あいことばを知る人だけ
guestOf/{uid}/{rid} = sid                                        ← 相手が自分で作る索引
```

⚠ 旧 `views` / `viewLinks`（閲覧専用リンク）と `view.html` は 2026-09-06 に廃止・削除した。
本番にデータは無かった（`views` / `viewLinks` / `shares` とも空を実測）。

- 旧4欄からの移行は `tools/migrate-duo.js`（コピーのみ・旧キーは残す）。
  巻き戻しは `tools/rollback-duo.js`。どちらも `--apply` を付けるまで確認だけを出す。
  `ceoMind→owner.vision` / `toManager→owner.task` / `toCeo→owner.output`。
  ⚠ **旧「やりとり」(`mgrAsk`) は「ルーティーン」へ移さない**（別物のため）。
  中身が残っていたら migrate は止まる。`routine` は空で始める。
- 実際の UID・メールアドレスは**このリポジトリが public のため記載しない**。
  必要なときは Firebase コンソールか `members` ノードを直接見ること。

---

## アクセス制御

アプリはログイン後 `members/{uid}` を購読し、**レコードが無いか `active === false` なら自動 signOut** する。

- ⚠⚠ **旧「利用者」管理は 2026-09-06 に撤去した。**
  設定画面から「利用者」一覧・「人を追加する」・名前／メールアドレス／最初のパスワードの入力欄と、
  `doinvite`（`createUserWithEmailAndPassword` で Auth アカウントを作り `members/{uid}` へ
  `role:"mgr"` を書く旧登録）・`delmember`（旧利用者の削除）・部屋作成時のメンバー選択を消した。
  **人にボードを見せる手段は「共有」リンクだけ**になった。

  そのため `mgr` を**新しく作る経路はアプリに無い**。役割の分岐（`role === "ceo" ? "ceo" : "mgr"`）と
  `rooms/$rid` の `.read` にある「その部屋のメンバーなら読める」条件は、
  既存データのために残してある。**ルール（`database.rules.json`）は無変更**。

- **残っているもの（消してはならない）**

  | 残したもの | なぜ必要か |
  |---|---|
  | `members/{自分のuid}` の**単独購読** | ログイン判定・役割・表示名の正。谷口のログインがこれに乗っている |
  | `members/{uid}` の `name` を書く欄（`data-mname`） | 自分の表示名。**自分以外は書かないガードあり**（`mu !== me.uid` で return） |
  | `config/ceoName` と `rooms/*/ownerName` への同期 | 左列の見出し。相手は `config` も `members` も読めないので、各ボードへ写す |
  | `rooms/{rid}/members` / `members/{uid}/rooms` | 谷口自身の部屋登録。ルールの読み条件と部屋の購読が今も見る |
  | `active` フィールド | ルール条文（`members` / `config` / `field` / `shares` / `shareKeys` / `rooms`）が今も見る。**フィールドごと消してはならない** |

  ⚠ **`members` ノードの「全体購読」は撤去した。** 旧「利用者」一覧と部屋のメンバー選択だけが
  使っていた。全部を読むと、ほかの人のメールアドレスと UID まで画面へ持ってくることになる。
  一覧が要る画面を復活させるときは、**露出が増えることを承知のうえで**入れ直すこと。

- ⚠ **部屋の「変える」は名前だけを直す。** 以前は `rooms/{rid}/members` を選択内容で
  丸ごと書き直していたが、選ぶ画面を撤去したので、書き直すと手元に無い登録を黙って消してしまう。

- ⚠ **Firebase Auth のアカウントはアプリから消せない**（消す仕組みを持たせていない）。
  名簿から外れたアカウントも**ログインはでき、`honomi` ブロックの条件が
  「認証済み かつ `guestOf` に居ない」だけなので、timecard 側の勤怠データを読み書きできる**
  （「既知の未解決事項」と同じ穴）。止めるには Firebase コンソールでアカウントを無効化する。

  ⚠⚠ **既存の mgr を失効させるには、Auth アカウントの無効化だけでは足りない。**
  `delmember`（旧「利用者」削除）を撤去したので、アプリから名簿を消す導線はもう無い。
  失効させるときは **Firebase コンソールか REST で `members/{uid}` を削除**すること
  （`rooms/{rid}/members/{uid}` の残骸は、`rooms/$rid` の `.read` が
  `members/{uid}.active === true` を併せて要求するため、それだけでは通らない）。
  順序は **`members/{uid}` を消す → Auth アカウントを無効化する**。

  ⚠ **2026-09-06 時点で、旧利用者由来のメール／パスワードのアカウントが 3 件残っている**
  （名簿には居ない）。UID とアドレスは公開リポジトリへ書かない。Firebase コンソールで確認すること。

- 社長は `rooms` 全体を購読。mgr は `members/{uid}/rooms` に列挙された部屋だけを個別購読する

### 共有の認可（サーバーが無い作りでどう絞るか）

GitHub Pages の静的配信なので、**サーバー側で「読んでよい人か」を判定する場所が無い**。
RTDB のルールは「読もうとしているパス」と `root` からの引き直ししか材料にできない。

そこで、**あいことばで Firebase Auth のアカウントを1つ結び付け、以後はそのアカウントで判定する**。
あいことばそのものは認可に使わない（＝匿名 token だけでは何も書けない）。

- **`shares`（台帳）の `.read` / `.write` は社長だけ。** あいことばの一覧は誰にも取れない
- **`shareKeys/$token` の `.read` は形が合っていれば誰でも**。親に `.read` を置いていないので
  **子を列挙できない**（1件も取れない）。あいことばは 192 ビットなので当てられない
- ⚠ **`shareKeys/$token` に秘密を入れてはならない。** ここに入ってよいのは
  `sid` / `acct` / `rid` / 表示名だけ。あいことばの持ち主にしか渡らないが、
  持ち主＝相手本人なので、相手に見せてよいものだけを置く
- **`shares/$sid/uid` の `.write`** は「未設定 かつ 自分の uid かつ
  `shareKeys/{そのsidのtoken}/claimBy` が自分」。
  ⚠ この `claimBy` の条件が**あいことばを知っている証拠**になる。
  外すと、同じボードの別の相手が `sid` だけを見て未使用の枠を横取りできる
- **`board/guest/$sid` の `.write`** は `shares/{sid}.uid === auth.uid && shares/{sid}.rid === $rid`。
  ⚠ **`guestOf` を信用しない。** 索引は相手が自分で書けるので、認可に使うと偽造できる
- **`rooms/$rid` の `.read`** は `guestOf` から `sid` を引き、その `shares/{sid}` を
  もう一度引き直して `uid` と `rid` を照合する。索引を偽造しても `shares` 側で落ちる
- ⚠⚠ **`rooms/$rid` の `.write` は社長だけ。** RTDB の `.write` は上位から下位へ
  カスケードし下位で剥奪できないので、`board/owner` には**何も足さない**。
  相手が書けるのは、下位で足した `board/guest/$sid` だけ。
  ここに親（`board` や `rooms/$rid`）で相手を許すと、**左列まで書けるようになる**
- **失効はサーバー側で効く。** `shares/{sid}` を消せば、読み（`rooms/$rid`）も
  書き（`board/guest/$sid`）も条件が成立しなくなる。`guestOf` が残っていても関係ない
- あいことばは `crypto.getRandomValues` の24バイト（192ビット）を base64url にした32文字。
  連番・氏名・メールアドレス・UID は使わない。`crypto` が無いブラウザでは**作らない**
- あいことばは URL の **`#` のあと**に置く。`#` から先はサーバーにもリファラにも送られない。
  `?query` やパスにすると GitHub のアクセスログに残る（RCM はパスに置いている。真似ない）
- ⚠ **クリップボードは「押した操作」の流れの中でしか書けない**（Safari）。
  DB の返事を待ってから `navigator.clipboard.writeText()` を呼ぶと必ず失敗する。
  `snew` はクリック直後に `clipWrite()` を呼び、その Promise を後で解決させている

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
**現場側が社長のビジョンまで REST から書き換え・全消去できる**。
下位（`ceoMind` など）で剥奪はできない。

正: `board` 自体には `.write` を**置かない**。**現場が書く欄にだけ**
「社長 or その部屋のメンバー」を置く。現在は `board/toManager`（タスク）と
`board/mgrAsk`（やりとり）の2つ。`ceoMind`（ビジョン）と `toCeo`（アウトプット）は
`rooms/$rid` の `.write`（社長のみ）だけが効くので、現場側からは書けない。

⚠ **欄の書き手を入れ替えるときは、UI（`cards()` の `write`）とこの `.write` を必ず同時に直す。**
UI だけ直すと、現場の書き込みが `PERMISSION_DENIED` で無音のまま落ちる。
**ルールを先にデプロイしてから `index.html` を push すること**（GitHub Pages は push で即反映されるが、
ルールは別途 `firebase deploy` が要るため、逆順にすると書けない時間帯ができる）。

正: `members/$uid` の `.write` は**社長のみ**。招待フローは `createUserWithEmailAndPassword` を
別名アプリ（`"invite"`）で実行したあと、**社長のセッションのままの primary app** から
`members/{新UID}` を書くので問題なく動く。`.validate": "newData.hasChildren(['role','active'])"` も併せて付ける。

---

## デプロイ

`DEPLOY.md` の commit→push→health→commit ID 記載 という骨子は流用可。ただし **Vercel は使っていない**。

1. `index.html` を編集
2. **ルールを変えたなら、先に `firebase deploy --only database --project honomi-timecard`**
   （上記「変更手順」を必ず守る）
3. commit → push（main / ルート）
4. **GitHub Pages の反映を待つ**（数十秒〜数分。`curl` でサイズか特定文字列が変わるまでポーリングする）
5. 本番URLを `curl` して HTTP 200 と内容を確認
6. 報告に commit ID を記載

⚠⚠ **ルールが先、`index.html` が後。順番を逆にしてはならない。**
GitHub Pages は push で即反映されるが、ルールは別途 `firebase deploy` が要る。
逆順にすると、新しい `index.html` が書こうとするパス（`board/owner` / `board/guest`、
`shares` / `shareKeys` / `guestOf`）を古いルールが知らず、**書き込みが全滅する**。

⚠ **DB の形を変えたときは、ルール deploy より前にデータ移行を済ませる。**
`tools/migrate-duo.js` は旧キーを**コピーする**だけなので、古い `index.html` が
動いている間に実行しても何も壊れない。順序は
**移行（--apply）→ ルール deploy → push → Pages 反映確認 → 社長でログイン**。

---

## QA

npm script は無い。型チェック・build・lint・Playwright・Jest はいずれも使わない。

- **構文チェック**: `node --check` は HTML には使えない。`<script>` の中身を切り出して `node --check` する。
  **`index.html` と `join.html` の両方**が対象（`join.html` を忘れやすい）
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
- **共有リンクの確認（未認証で実測する）**: `?auth=` を付けずに REST を叩き、
  ① `shareKeys/{生きている token}` が 200（相手が招待ページを開けること）、
  ② `shares` / `rooms` / `members` / `config` / `field` の一覧が 401、
  ③ `rooms/{rid}/board/owner/*` と `board/guest/*` への PUT が 401、
  ④ 「共有をやめる」直後に `shareKeys/{token}` が **200 のまま本文 `null`** になること、を確かめる。
  ⚠ ここを 401 と書いてはならない（2026-09-06 に実測）。`shareKeys/$token` の `.read` は
  **形が合っていれば通す**ので、消えたあとも 200 が返り、中身だけが `null` になる。
  これは `join.html` が「このリンクは使えません」を出すために必要な挙動で、欠陥ではない。
  失効の証明は 401 ではなく、⑤ **同じ相手の idToken で `rooms/{rid}/board/owner/*` の GET と
  `board/guest/{sid}/*` の PUT が 401 になること**で行う（`guestOf` の索引が残っていても拒否される）。
  さらに**共有中の相手の idToken**で `rooms/{rid}/board/owner/vision` へ PUT して 401 になること。
  **画面が読み取り専用に見えることは、書けないことの証明にならない**
- ⚠ **RTDB の REST は `.validate` 失敗も 401 "Permission denied" で返す**（400 ではない）。
  「400 が返らないから検証が効いていない」と読み違えないこと（2026-09-06 に実測）。

---

## 作業上の落とし穴（実際に踏んだもの）

- **Git Bash の curl に日本語を `-d` で渡すと CP932 で送られて文字化けする。**
  日本語を RTDB へ書くときは node など UTF-8 が保証される経路を使う
- **シェル変数が空のまま `curl -X DELETE ".../members/$UID.json"` を実行すると `/members` 丸ごと削除になる。**
  UID を使う破壊的操作の前に必ず空チェックする
- **`/members` が消えるとアプリの購読が `!m` を検知して全ユーザーを自動 signOut する**
- ユーザーの idToken は `?auth=<idToken>` クエリで渡す。`Authorization: Bearer <idToken>` は 401
  （Bearer はサービスアカウントの OAuth2 アクセストークン専用）
- **削除系の UI は `confirm()` を出す**（部屋削除・案件/スタッフ/施設の削除）。ブラウザ自動操作は固まるので押さない。
  検証で押す必要があるときは `window.confirm` を差し替えてから押す（戻り値で「やめる」も試せる）。
  ただし**ノート内の行の削除だけは `confirm()` を使わない**（× → 行の下に出る「消す / やめる」の2段階）
- **保存を遅らせる（debounce）ときは、書き込む中身を「予約した時点」で確定させる。**
  `set()` のクロージャの中で `board()` を評価すると、発火までに部屋を切り替えた場合に
  **別の部屋の内容を書き込んで元の部屋を全消去する**（2026-09-05 に修正）。
  部屋切替・ログアウトの直前には `flushSaves()` で保留中の保存を出しきる
- **書き込みは触った欄だけに絞る。** `rooms/{rid}/board/{key}` と `field/{facilities|staff|cases}`
  単位で `set()` する。`board` や `field` を丸ごと `set()` すると、
  ① 触っていない欄（ビジョン／タスク／アウトプット／相談）まで巻き添えにする ② debounce 中に届いた
  他の人の更新を消す。**上位ノードを丸ごと `set()` しないこと**。
  知らない欄を渡されたときは、`field` を丸ごと書く代わりに書かずに知らせる
- **`textarea` の高さを測るとき、`height:auto` の一瞬でスクロールバーが消えると本文幅が変わり、
  行数を読み違えて最後の行が切れる。** `html { scrollbar-gutter: stable }` で幅を固定し、
  `requestAnimationFrame` でもう一度測る
- **ボタンを押している最中に `innerHTML` を差し替えるとクリックが消える。**
  mousedown と mouseup の間に再描画が入ると click が発火しない。`held()` ガードで押している間は描き直さない
- **入力中（IME 変換中）に再描画してはいけない。** `composing` の間は `pendingRender` に退避し、
  `compositionend` で描く。末尾の空欄が実体化するときも再描画せず `promoteRow()` で DOM を直接作り替える

- **`join.html` であいことばを URL から消してはいけない。** `history.replaceState` で `#` を消すと
  見た目は安全になるが、**開き直し・ブックマーク・引っぱって更新で入り直せなくなる**。
  端末に控えを残す作りにすると、共有の端末で次の人に残る。URL に置いたままにする
- **あいことばをパスへ連結する前に必ず形を確かめる**（`/^[A-Za-z0-9_-]{22,64}$/`。
  `join.html` と `database.rules.json` の両方で同じ形に揃えること）。
  緩めるとスラッシュや `..` を混ぜて別のパスを読みにいける
- **同じ URL でフラグメントだけ変えても、ブラウザはページを読み込み直さない。**
  検証で別のあいことばを試すときは、クエリを変えるなどして必ず読み込み直させること

### 共有で受け入れているリスク（欠陥ではなく設計上の判断）

- ⚠⚠ **失効させる操作は「共有をやめる」「作り直す」「ボードを削除する」の3つだけ。**
  **部屋のメンバーから外しても、共有は止まらない**（ボードに紐づき、相手は `members` に載らないため）。
  本当に止めたいときは、必ずそのボードの「共有」→「共有をやめる」を押すこと。
  ⚠ 旧「利用者」削除の導線は 2026-09-06 に撤去したので、そこから止まると誤解する余地も無くなった
- ⚠ **未使用のURLが漏れると、拾った人が先にあいことばを決めて枠を取れる。**
  RCM も同じ性質（URL の所持がそのまま本人性）。
  ただし**一度決まったあとは、URLだけでは入れない**（あいことばが要る）ので、
  漏れの被害は「渡す前」に限られる。相手が開いたかどうかは共有パネルに出している
  （「まだ開かれていません」／「使えるようになっています」）
- **有効期限は設けていない**（恒久的な共有手段のため）。**漏れたことを検知する手段も無い**
- **ボード名と社長の表示名は相手に見える**（`shareKeys/{token}` と `rooms/{rid}` に入る）。
  ボード名に人名・施設名を入れる運用では、宛先以外の名前が相手に見える
- ⚠ **右列は相手と谷口の共同の場。** 行ごとの持ち主は判定していないので、
  谷口は相手が書いた行を書き換え・削除できる（仕様）。逆はできない
- **相手どうしは互いの列を読めない**（2026-09-06 に本番で実測）。`board/guest/$sid` と
  `partners/$sid` の `.read` は `shares/$sid/uid === auth.uid` を要求するので、
  同じボードに複数人へ共有しても、相手Aから相手Bの列・見出しは 401 になる。
  `board/guest` と `partners` をまとめて読むこともできない。
  ⚠ 旧記載「相手は同じボードの他の相手の列も読める」は誤りだったので削除した
- ⚠ **`board/guest/$sid` に行数の上限が無い。** 1行あたりは `.validate` が縛る
  （欄名は4種、キーは `id`/`text`/`by`/`createdAt` のみ、`text` は4000字まで、それ以外は拒否）が、
  **行をいくつ足せるかは制限していない**ので、相手は自分の列を際限なく伸ばせる
- `FIREBASE_CONFIG` が `index.html` と `join.html` に二重にある（ビルドが無いため）。
  プロジェクトを移すときは**両方**直すこと

## 既知の未解決事項（今回の変更範囲外）

- ⚠ **`by` は本人申告。** 画面には作成者を出さないが、`board` 配下に `by` の `.validate` は無い。
  ただし**書ける場所そのものがルールで分かれている**ので、
  「谷口の列に相手が書く」ことはできない。`by` の詐称でできるのは、
  自分が書ける列の中で別人の UID を名乗ることだけ
- ⚠ **正式メンバー（mgr）は経営ボードに自分の列を持たない。** 読むことはできる
  （`rooms/{rid}/members` に居れば）が、書ける欄が無い。
  ⚠ 2026-09-06 に旧「利用者」管理を撤去したので、**mgr を新しく作る経路はアプリに無い**。
  現場責任者に書いてもらうときは**共有リンクを渡す**（それが唯一の手段）
- `members/{uid}` が更新されるたびに `rooms` / `members` / `config` / `field` の購読が
  多重登録される（`off()` されない）。1回のスナップショットで render が複数回走る
- 部屋の「変える」で保存すると、capture 側の更新に続いて bubble 側の `makeroom` も走り、
  **同名の空部屋が二重に作られる**（capture 側で `stopPropagation()` していないため）
- ⚠ **施設メモ・課題の担当者名は名簿に居る人全員が読み書きできる。** `database.rules.json` の `field` は
  `.read` / `.write` とも「有効な利用者全員」なので、mgr が居れば REST から他人の行を編集・削除・全消去できる。
  ⚠ 2026-09-06 現在、名簿に居るのは谷口ひとりで、mgr を作る経路も無いため実害は出ていない。
  ただし**ルールは緩いままなので、mgr を復活させるならここを先に絞ること**。
  `items[].by` を自分の UID へ書き換えれば画面上でも編集可能になる（共有相手は `field` を読めない）
- ⚠⚠ **`honomi` ブロックの条件が `auth != null && !root.child('guestOf').child(auth.uid).exists()` しかない。**
  そのため **`guestOf` に載っていない Firebase Auth アカウントを持つ人は、誰でも
  timecard の勤怠データを読み書きできる**。メール／パスワードのサインアップは
  （招待フローが使うため）無効化できないので、**公開 API キーで自分のアカウントを作れば誰でも通る**。
  ✅ **共有相手（guest）は 2026-09-06 の変更で除外済み**（`honomi` の読み書きとも 401 を本番で実測）。
  同じ理由で、名簿に居ないアカウントは `guestOf` に載らないため**除外されない**（上記「アクセス制御」参照）。
  ⚠ ただし**この穴の本体は今回の変更で作ったものではない**。以前から、
  誰でも公開 API キーでアカウントを作れば同じことができた。
  直すなら `honomi` の条件へ timecard 側のレコード確認を足す必要があるが、
  **`honomi` は timecard-git の持ち物**なので、あちらと合わせて直すこと
- `field/*` の `id` など DB 由来の値は、ノート以外の描画箇所でも属性に入る。
  現在は `esc()` を通しているが、`id` の形式検証（ルール側の `.validate`）は入っていない
- 空にした行の自動削除は「**その画面で今作った行**（`ui.fresh`）」だけ。
  前のセッションから在る行は空にしても消えず、× →「消す」が要る
- 圏外でログアウトすると、直前（最大700ms）の入力が無音で失われうる。
  ログアウトは保留中の保存を出しきるのを 1.5 秒だけ待って打ち切る仕様のため
  （待たないとログアウト不能になる）。打ち切った分は再接続時に未認証で拒否される

### パスワード無しで各ユーザーとして本番検証する方法

⚠ **カスタムトークンは使えない**（2026-09-06 実測）。`iam.serviceAccounts.signJwt` が 403 で、
このアカウントではサービスアカウントの署名ができない。鍵ファイルも持たない方針なので、
「サービスアカウントでカスタムトークンを作る」という手は**この環境では成立しない**。

実際に使える手は3つ。目的で使い分ける。

**1. 共有相手・第三者 … 公開 apiKey で本物のアカウントを作る**
`POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<apiKey>` に
`{email, password, returnSecureToken:true}` を投げると idToken が返る。これが
`join.html` のやっていることそのものなので、**本物の共有相手として**ルールを試せる。
RTDB へは `?auth=<idToken>` を付けて REST を叩く（`Authorization: Bearer` は 401）。
後始末は `POST /v1/accounts:delete` に `{idToken}` で**自分で消せる**（アプリからは消せないが、
本人の idToken があれば消える）。検証用の部屋・共有は Admin 経由で作り、最後に必ず全部消す。

**2. 社長（谷口） … 本人のブラウザに生きているセッションを borrow する**
本番を開いた状態で `firebase.auth().currentUser.getIdToken()` を取り、
そのページ内から `fetch` で REST を叩く。**実データではなく検証用の部屋に対して**行うこと。
⚠ 重い処理を1回の評価にまとめるとレンダラが固まる。トークン取得と fetch は分けて、
結果はグローバルへ置いて後から読む。

**3. RTDB のルール本文を読む … firebase CLI の資格情報を使う**
`~/.config/configstore/firebase-tools.json` の `refresh_token` を
`oauth2.googleapis.com/token`（client_id / client_secret は firebase-tools の
`lib/api.js` にある既定値）でアクセストークンへ交換し、
`GET https://honomi-timecard-default-rtdb.asia-southeast1.firebasedatabase.app/.settings/rules.json`
を `Authorization: Bearer` で叩く。**ルール変更の前後で `honomi` ブロックを照合するのに使う**。
⚠ トークンを表示・保存・commit しないこと。

ページ内で別人として試すときは `firebase.initializeApp(FIREBASE_CONFIG, "別名")` ＋
`Persistence.NONE` にすれば**本人のセッションを壊さずに**検証できる。

---

## 禁止事項（固有の上乗せ）

- `honomi` ブロックを含まないルールをデプロイしない
- 匿名認証・メール／パスワード認証を無効化しない
- 旧版 HTML やサービスアカウント鍵をコミットしない
- 部屋のメンバー構成・投稿は業務データ。検証で書いたものは必ず消す
