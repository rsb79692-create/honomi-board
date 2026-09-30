# 0003 timecard（`honomi`）の起動面を開けている理由

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。

この領域は timecard-git の持ち物。認可の正は `database.rules.json` と timecard-git の `AGENTS.md`。残っている穴は `docs/records/2026-09-06-timecard-honomi-authz.md`。

⚠ **起動面（上の表の上4行）をなぜ開けたままにしたか。**
打刻端末は起動時に役割を持てない。PIN を入れる前だからである。
`tc5_staff` / `tc5_pins` / `tc_master_depts` / `master` / `tc5_records` は
**PIN 画面を出すまでに必ず要る**。ここを締めると打刻ができなくなる。
`tc5_pins` の**書き**も開けてあるのは、スタッフが初めて自分の PIN を決める経路
（`sNewOk`）が昇格前に走るためである。
