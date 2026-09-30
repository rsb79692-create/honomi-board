# timecard と共有する Firebase プロジェクト（RTDB ルール・Auth）

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。


## 最重要: Firebase プロジェクトを timecard と共有している

**`honomi-timecard`（RTDB は `honomi-timecard-default-rtdb` / asia-southeast1）を timecard と再利用している。**
この共有関係はコードを読んでも気づけない。片方の設定変更がもう片方を壊す。

### RTDB ルールは1ファイルに全系統が同居

| トップレベル | 用途 |
|---|---|
| `honomi` | **timecard 専用**（`tc5_records` に `.indexOn: ["date"]`。実データ4400件超） |
| `tenants` | **timecard 専用**（マルチテナント。`tenantReg` を参照して判定する） |
| `rooms` / `members` / `config` / `field` | ボード |
| `shares` / `shareKeys` / `guestOf` | ボード（共有）。**マージ時に落とすと全員の共有が死ぬ** |
| `tenantReg` / `srv` / `mileage` / `authz` / `ratelimit` | ルール未定義＝クライアントからは不可視。Admin SDK 経由で使用 |

⚠⚠ **このリポジトリの `database.rules.json` は、timecard-git の `database.rules.json` と同一内容である。**
本番の Rules も同じ1ファイルで、どちらのリポジトリの控えも本番の写しにすぎない
（2026-09-26 に本番・timecard-git・本リポジトリの3者が完全一致することを実測）。
timecard 側は本リポジトリを通さずに Rules を deploy するので、**手元の控えは古くなっている前提で扱う**。

`firebase deploy --only database` は**ルール全体を置換する**。ボード側だけをデプロイすると timecard が即死する。
手元の古い控えのまま deploy すると、timecard 側で後から足した `honomi` / `tenants` の変更を巻き戻す。

**変更手順（必須。deploy はユーザーの明示承認後。firebase-agent 参照）**
1. **deploy の前に必ず本番の現行ルールを取り直す**（手元の `database.rules.json` を正としない）
   `GET https://honomi-timecard-default-rtdb.asia-southeast1.firebasedatabase.app/.settings/rules.json`
   （サービスアカウントの OAuth2 アクセストークンを `Authorization: Bearer` で渡す）
2. 取り直した本番の内容へボード側の変更をマージする（既存キーを保持する）
3. デプロイ後に取得し直し、**`honomi` / `tenants` ブロックが不変であること**を照合する
4. deploy したら、timecard-git の `database.rules.json` も同じ内容へ揃えて commit する（逆も同じ）

### Firebase Auth
- **匿名認証は timecard の起動経路。絶対に無効化しない。**
- ボード用にメール／パスワードも有効化してある（両方 on が正しい状態）。
  招待フローが `createUserWithEmailAndPassword` を使うため、サインアップ自体は無効化できない。
