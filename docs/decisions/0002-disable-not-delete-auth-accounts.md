# 0002 旧利用者の Auth アカウントは削除でなく無効化する

> 本文は旧 AGENTS.md の原文。「上記」「下記」「上の表」等は移設前の位置を指す（原文全体: `docs/records/2026-10-01-agents-md-before-restructure.md`）。
> 2026-10-01 に AGENTS.md から原文のまま移した。現在の規則は `AGENTS.md` を正とする。


  ✅ **旧利用者由来のメール／パスワードのアカウント 3 件は 2026-09-06 に無効化した。**
  `signInWithPassword` が `USER_DISABLED` を返し、idToken が一切発行されない状態を実測済み。
  **削除ではなく無効化**を選んだ理由は3つ:
  ① 削除するとアドレスが空き、公開 apiKey の `accounts:signUp` で**誰でも取り直せる**
     （無効化なら `EMAIL_EXISTS` で塞がる）
  ② いつ作られ・いつ最後に入ったかが Firebase Auth に残る（監査）
  ③ 戻すのはフラグ1つ（復旧性）
  併せて `validSince` を更新し、発行済みのリフレッシュトークンも失効させてある。
  UID とアドレスは公開リポジトリへ書かない。Firebase コンソールで確認すること。
