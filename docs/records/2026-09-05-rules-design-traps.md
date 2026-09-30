# ルール設計で踏んだ罠（2026-09-04〜05）

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。


⚠ **罠 3 と末尾の「招待フロー」の段落は、旧キー（`toCeo` / `mgrAsk` / `toManager` / `ceoMind`）と
2026-09-06 に撤去した招待フロー（`doinvite`・別名アプリ `"invite"`）を前提にしており、現行と食い違う。
現行の `board` の書き込みは `rooms/$rid`（社長のみ）＋ `board/guest/$sid`（下位で追加）である。
現行の規則は `AGENTS.md`（カスケード・自己登録禁止・欄の書き手の同時変更・ルールが先）を正とする。

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
