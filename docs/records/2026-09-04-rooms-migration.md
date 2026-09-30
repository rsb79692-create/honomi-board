# 2026-09-04 部屋（rooms）対応への移行記録

旧 `/board`（社長と現場責任者の1対1固定）を、部屋単位で相手を選べる構造へ移行した記録。

## 移行内容

| 旧 | 新 |
|---|---|
| `/board/{ceoMind,toCeo,mgrAsk,toManager}` | `rooms/{rid}/board/{同じ4キー}` |
| `/board/{facilities,staff,cases}` | `/field/{同じ3キー}` |
| `/board/config/ceoName` | `/config/ceoName` |
| 投稿の `author:"ceo"/"mgr"` | `by:<UID>` |
| 投稿の `seen:true` | `seenBy:{相手UID:true}` |
| （なし） | `members/{uid}/rooms/{rid} = true`（購読対象） |
| （なし） | `members/{uid}/name` |

移行後、旧 `/board` は削除した。バックアップは `_backup_20260904_193648/`。

**移行対象の投稿は0件だった。** 旧 `/board` の中身は `{"config":{"ceoName":"谷口","mgrName":"谷村"}}` のみで、
4つの投稿枠も `facilities`/`staff`/`cases` も存在しなかった。変換ロジックは実装して流したが、
変換対象がゼロだったということ。

## 見つけて直したセキュリティ欠陥

いずれも移行時に用意したルールの不備で、**本番で再現を確認してから修正**した。

### 1. 部屋メンバーが部屋を乗っ取れた

RTDB の `.write` は上位から下位へカスケードし、**下位ルールで剥奪できない**（下位は加算のみ）。
`rooms/$rid` に「社長 or メンバー」の `.write` を置き、配下の `name`/`members` を「社長のみ」に
していたため、下位の制限が無効化されていた。

本番で確認できた挙動（mgr 権限で全て HTTP 200）:
- 部屋名の書き換え
- 第三者UIDをメンバーに追加
- 社長を部屋から締め出す
- 部屋ごと削除

**修正**: `rooms/$rid` の `.write` を社長限定にし、投稿だけを `rooms/$rid/board` に下位で足す形へ変更。
`board` 側の条件は `data` ではなく `root.child('rooms').child($rid).child('members')` で判定する。
アプリ側は mgr が `rooms/{rid}/board` しか書かないため影響なし。

### 2. 誰でも自分を ceo として登録できた

`members/$uid` の `.write` に自己登録の抜け道があった。

```
auth.uid === $uid && !data.exists()
```

`role` の `.validate` が `'ceo'` を許すため、members レコードを持たない認証済みユーザーが
自分を `{role:"ceo", active:true}` で作成できた。
**timecard が匿名認証を使っており無効化できないため、実質「誰でも」到達可能だった。**

本番で確認できた経路:

| 手順 | 結果 |
|---|---|
| 匿名サインイン（APIキーだけで誰でも可能） | UID 取得 |
| 侵入前に `/rooms` を読む | 401 |
| 自分を `{role:"ceo", active:true}` で登録 | **200** |
| 全部屋を読む | **200**（相手を入れていない部屋を含む） |
| 全メンバーを読む | **200**（メールアドレス） |

**修正**: 自己登録を廃止し `.write` を社長のみに戻した。招待フローは
`createUserWithEmailAndPassword` を別名アプリで実行したあと、社長セッションのままの
primary app から `members/{新UID}` を書くため影響なし。
併せて欠落していた `.validate: hasChildren(['role','active'])` を復活させた。

## 検証方法

パスワードを持たないアカウントとして本番検証するため、サービスアカウントでカスタムトークンを作り
`signInWithCustomToken` で idToken に交換した。ページ内で試すときは
`firebase.initializeApp(FIREBASE_CONFIG, "別名")` ＋ `Persistence.NONE` にすれば
本人のセッションを壊さずに検証できる。

最終確認（社長 / mgr / 未登録ユーザー）:

| 操作 | 社長 | mgr | 未登録 |
|---|---|---|---|
| `/rooms` 一覧 | 200 | 401 | 401 |
| 自分が入っている部屋 | 200 | 200 | 401 |
| 入っていない部屋 | 200 | 401 | 401 |
| 部屋への投稿 | 200 | 200 | 401 |
| 部屋名・メンバー変更 | 200 | 401 | 401 |
| 自分を ceo に昇格 | — | 401 | 401 |

timecard 側も同時に確認: 匿名認証・全24ノード・`orderBy="date"` インデックスクエリ・
4,461件・書き込みとも正常。ルールの `honomi` ブロックはデプロイ前後で一致。
