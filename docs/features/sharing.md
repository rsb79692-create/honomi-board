# 共有リンク（join.html）と共有の認可

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。

設計理由（RCM との比較・受け入れているリスク）は `docs/decisions/0001-share-link-design.md`。

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

---

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
