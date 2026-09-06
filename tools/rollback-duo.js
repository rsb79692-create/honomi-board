/* migrate-duo.js を巻き戻す。旧キーは触っていないので、新しい枝を落とせば元へ戻る。
 *
 *   落とすもの: rooms/{rid}/board/owner, rooms/{rid}/board/guest,
 *               rooms/{rid}/ownerName, rooms/{rid}/partners,
 *               shares, shareKeys, guestOf
 *   残すもの  : rooms/{rid}/board/{ceoMind,toManager,toCeo,mgrAsk}, members, field, config, honomi
 *
 * ⚠ 共有相手が右列へ書いた内容も消える。実行前に必ず件数を見ること。
 *
 *   確認だけ: node tools/rollback-duo.js
 *   実行     : node tools/rollback-duo.js --apply
 */
var rtdb = require("./rtdb-admin.js");
var APPLY = process.argv.indexOf("--apply") >= 0;

function count(v) {
  if (!v) return 0;
  return Object.keys(v).reduce(function (n, k) {
    var a = v[k];
    return n + (Array.isArray(a) ? a.length : (a && typeof a === "object" ? Object.keys(a).length : 0));
  }, 0);
}

(async function () {
  var rooms = (await rtdb.get("/rooms")) || {};
  var upd = {};
  console.log("落とすもの:");
  Object.keys(rooms).forEach(function (rid) {
    var b = (rooms[rid] || {}).board || {};
    if (b.owner) { console.log("  rooms/" + rid + "/board/owner  （" + count(b.owner) + " 行）"); upd["rooms/" + rid + "/board/owner"] = null; }
    if (b.guest) {
      Object.keys(b.guest).forEach(function (sid) {
        console.log("  rooms/" + rid + "/board/guest/" + sid + "  （" + count(b.guest[sid]) + " 行・相手が書いた分）");
      });
      upd["rooms/" + rid + "/board/guest"] = null;
    }
    if (rooms[rid].ownerName) upd["rooms/" + rid + "/ownerName"] = null;
    /* 右列の見出しは partners。guests というキーは存在しない（消し忘れると
       宛先の氏名が残り、次に移行したとき台帳の無い列として並ぶ）。 */
    if (rooms[rid].partners) {
      console.log("  rooms/" + rid + "/partners  （" +
        Object.keys(rooms[rid].partners).length + " 人ぶんの宛先名）");
      upd["rooms/" + rid + "/partners"] = null;
    }
    var keep = ["ceoMind", "toManager", "toCeo", "mgrAsk"].filter(function (k) { return b[k]; });
    console.log("  （残す: rooms/" + rid + "/board/" + (keep.join(",") || "なし") + "）");
  });
  ["shares", "shareKeys", "guestOf"].forEach(function (p) {
    upd[p] = null; console.log("  /" + p);
  });
  if (!APPLY) { console.log("\n（確認のみ。実行するには --apply）"); return; }
  await rtdb.update("/", upd);
  console.log("\n巻き戻しました。");
})().catch(function (e) { console.error("失敗:", e.message); process.exit(1); });
