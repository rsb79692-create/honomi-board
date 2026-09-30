# アクセス制御（members・mgr・Auth アカウント）

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。

撤去の経緯は `docs/records/2026-09-06-member-admin-removal.md`、無効化を選んだ理由は `docs/decisions/0002-disable-not-delete-auth-accounts.md`。

## アクセス制御

アプリはログイン後 `members/{uid}` を購読し、**レコードが無いか `active === false` なら自動 signOut** する。



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
  止めるには Firebase コンソール、または管理 API（`accounts:update` に `disableUser:true`）で
  **無効化**する。
  ⚠ 2026-09-06 に `honomi` ブロックを役割ベースへ変えたので、
  名簿から外れたアカウントでも**承認・有給・賄い・資料・`config`・各種トークンには届かなくなった**。
  ただし**打刻に要る領域（`tc5_records` / `tc5_pins` / `tc5_staff` / `tc_master_depts` /
  `master/locations`）は起動面のままで、認証さえ通れば読み書きできる。**
  「穴が全部塞がった」わけではない（下記「timecard（`honomi`）の認可」）。

  ⚠⚠ **既存の mgr を失効させるには、Auth アカウントの無効化だけでは足りない。**
  `delmember`（旧「利用者」削除）を撤去したので、アプリから名簿を消す導線はもう無い。
  失効させるときは **Firebase コンソールか REST で `members/{uid}` を削除**すること
  （`rooms/{rid}/members/{uid}` の残骸は、`rooms/$rid` の `.read` が
  `members/{uid}.active === true` を併せて要求するため、それだけでは通らない）。
  順序は **`members/{uid}` を消す → Auth アカウントを無効化する**。


- 社長は `rooms` 全体を購読。mgr は `members/{uid}/rooms` に列挙された部屋だけを個別購読する
