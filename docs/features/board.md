# ボード本体（画面・役割・データ構造・構成）

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。


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

## 本番

- 本番URL: https://rsb79692-create.github.io/honomi-board/
- リポジトリ: https://github.com/rsb79692-create/honomi-board （GitHub Pages / main / ルート配信）

---

## 構成

**ビルドなし・npm なし・依存なし。** 画面は `index.html`（本体）と `join.html`（共有リンクの入口）の
**2ファイル**で、HTML・CSS・JS を各ファイル内に持つ（`join.html` は 2026-09-06 の `73f37fb` で追加）。
このほか Admin 資格で RTDB を直接書く補助スクリプト `tools/*.js` がある。
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
