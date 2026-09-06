/* 経営ボードを「左＝谷口 / 右＝共有相手」の2列構造へ移す（前進マイグレーション）。
 *
 *   rooms/{rid}/board/ceoMind    → rooms/{rid}/board/owner/vision
 *   rooms/{rid}/board/toManager  → rooms/{rid}/board/owner/task
 *   rooms/{rid}/board/toCeo      → rooms/{rid}/board/owner/output
 *   rooms/{rid}/board/mgrAsk     → （移さない。ルーティーンは別物なので空で始める）
 *   config/ceoName               → rooms/{rid}/ownerName
 *
 * ⚠ 旧キーは **消さない**。コピーするだけ。rollback-duo.js で元へ戻せる。
 * ⚠ mgrAsk に中身がある場合は、勝手に捨てずに中止して知らせる。
 *
 *   確認だけ: node tools/migrate-duo.js
 *   実行     : node tools/migrate-duo.js --apply
 */
var rtdb = require("./rtdb-admin.js");
var APPLY = process.argv.indexOf("--apply") >= 0;
/* 「やりとり」を移さないことを了承したときだけ立てる。既定は中止のまま。 */
var KEEP = process.argv.indexOf("--keep-mgrask") >= 0;
var MAP = [["ceoMind", "vision"], ["toManager", "task"], ["toCeo", "output"]];

function arr(v) { return Array.isArray(v) ? v : (v ? Object.keys(v).map(function (k) { return v[k]; }) : []); }

(async function () {
  var rooms = (await rtdb.get("/rooms")) || {};
  var conf = (await rtdb.get("/config")) || {};
  var owner = String(conf.ceoName || "谷口");
  var upd = {}, blocked = [];

  Object.keys(rooms).forEach(function (rid) {
    var b = (rooms[rid] || {}).board || {};
    /* ⚠ 判定は「これから移す部屋」だけに限る。
       移行済みの部屋まで数えると、mgrAsk が残っている限り
       以後の部屋を1つも移せなくなる（2回目以降が必ず中止になる）。 */
    if (b.owner) {
      console.log("  " + rid + ": 既に owner がある → 触らない");
      return;
    }
    /* 「やりとり」は「ルーティーン」と別物。中身があるなら勝手に移さず止める。 */
    if (arr(b.mgrAsk).length && !KEEP) {
      blocked.push(rid + " の mgrAsk に " + arr(b.mgrAsk).length + " 件");
      return;
    }
    MAP.forEach(function (m) {
      var src = arr(b[m[0]]);
      if (src.length) upd["rooms/" + rid + "/board/owner/" + m[1]] = src;
    });
    if (!rooms[rid].ownerName) upd["rooms/" + rid + "/ownerName"] = owner;
    console.log("  " + rid + " | " + JSON.stringify(rooms[rid].name) + " → " +
      MAP.map(function (m) { return m[1] + ":" + arr(b[m[0]]).length; }).join(" ") + " routine:0（新規）");
  });

  if (blocked.length) {
    console.error("\n中止: 「やりとり」に中身が残っています。移し先を決めてから実行してください。");
    blocked.forEach(function (x) { console.error("  - " + x); });
    process.exit(1);
  }
  var keys = Object.keys(upd);
  console.log("\n書き込む予定: " + keys.length + " パス");
  keys.forEach(function (k) { console.log("  " + k); });
  if (!APPLY) { console.log("\n（確認のみ。実行するには --apply）"); return; }
  if (!keys.length) { console.log("\n書くものがありません。"); return; }
  await rtdb.update("/", upd);
  console.log("\n適用しました。旧キー（ceoMind / toManager / toCeo / mgrAsk）はそのまま残しています。");
})().catch(function (e) { console.error("失敗:", e.message); process.exit(1); });
