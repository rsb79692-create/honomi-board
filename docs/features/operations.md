# デプロイ・QA・検証手順・作業上の落とし穴

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。


## デプロイ

`DEPLOY.md` の commit→push→health→commit ID 記載 という骨子は流用可。ただし **Vercel は使っていない**。

1. `index.html` を編集
2. **ルールを変えたなら、先に `firebase deploy --only database --project honomi-timecard`**（ユーザーの明示承認後）
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

---

### パスワード無しで各ユーザーとして本番検証する方法

⚠ **カスタムトークンは使えない**（2026-09-06 実測）。`iam.serviceAccounts.signJwt` が 403 で、
このアカウントではサービスアカウントの署名ができない。鍵ファイルも持たない方針なので、
「サービスアカウントでカスタムトークンを作る」という手は**この環境では成立しない**。

実際に使える手は4つ。目的で使い分ける。

★ 1・3 は本番の Auth / RTDB を使う（2 は禁止）。**本番へのアカウント・検証用の部屋の作成と書込みは、経路（CLI・REST・Admin SDK・`tools/*.js`）を問わず実行前にユーザーの承認を得る**（共通 `AGENTS.md`「UIの完了判定（deploy 後）」）。承認不要なのはルール判定と検証用パスの読み取りだけで、実データ（部屋・投稿・名簿）を出力・報告しない。ログインの入力は人が行う（`AUTH.md` §4）。

**1. 共有相手・第三者 … 公開 apiKey で本物のアカウントを作る**
`POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<apiKey>` に
`{email, password, returnSecureToken:true}` を投げると idToken が返る。これが
`join.html` のやっていることそのものなので、**本物の共有相手として**ルールを試せる。
RTDB へは `?auth=<idToken>` を付けて REST を叩く（`Authorization: Bearer` は 401）。
後始末は `POST /v1/accounts:delete` に `{idToken}` で**自分で消せる**（アプリからは消せないが、
本人の idToken があれば消える）。検証用の部屋・共有は（ユーザー承認後に）Admin 経由で作り、最後に必ず全部消す。

**2. 社長（谷口） … 本人のブラウザに生きているセッションを borrow する**
⚠ **既存利用者の実トークン借用は共通 `RULES.md`「性能」「完成の判定」で禁止。使わず 3 で代替する**（以下は記録として残す）。
本番を開いた状態で `firebase.auth().currentUser.getIdToken()` を取り、
そのページ内から `fetch` で REST を叩く。**実データではなく検証用の部屋に対して**行うこと。
⚠ 重い処理を1回の評価にまとめるとレンダラが固まる。トークン取得と fetch は分けて、
結果はグローバルへ置いて後から読む。

**3. どんな auth でもルールを評価させる … `auth_variable_override`（いちばん強力）**
オーナー権限の OAuth2 アクセストークン（下の 4 と同じ取り方）で REST を叩くとき、
`?auth_variable_override=<JSONをURLエンコード>` を付けると、**その auth だったらどうなるか**を
サーバに判定させられる。PIN も実アカウントも要らない。
⚠ **渡したオブジェクトが `auth` そのものになる。** カスタムクレームは本物と同じく
`{"uid":"x","token":{"r":"s"}}` のように **`token` の下**へ入れること。
`{"uid":"x","r":"s"}` と書くと `auth.token.r` は null のままで、全部 401 になる（2026-09-06 に踏んだ）。
未認証は `auth_variable_override=null`。
⚠ 判定させるだけではなく**本当に読み書きされる**。書きの確認は（ユーザー承認後に）必ず捨て値のキーへ行い、後で消すこと。

**4. RTDB のルール本文を読む … firebase CLI の資格情報を使う**
`~/.config/configstore/firebase-tools.json` の `refresh_token` を
`oauth2.googleapis.com/token`（client_id / client_secret は firebase-tools の
`lib/api.js` にある既定値）でアクセストークンへ交換し、
`GET https://honomi-timecard-default-rtdb.asia-southeast1.firebasedatabase.app/.settings/rules.json`
を `Authorization: Bearer` で叩く。**ルール変更の前後で `honomi` / `tenants` ブロックを照合するのに使う**。
⚠ トークンを表示・保存・commit しないこと。

ページ内で別人として試すときは `firebase.initializeApp(FIREBASE_CONFIG, "別名")` ＋
`Persistence.NONE` にすれば**本人のセッションを壊さずに**検証できる（サインインの入力は人が行う）。
