/* RTDB を管理者として読み書きする小道具（移行・巻き戻し用）。
 *
 * 資格情報はこのファイルでは扱わない。Firebase CLI（`firebase login` 済み）へ丸投げする。
 * ⚠ リポジトリは public で、GitHub Pages はリポジトリ直下を丸ごと配信する。
 *    このファイルに鍵・トークン・client secret を書かないこと。
 * ⚠ この経路はアクセスルールを迂回する。通常の運用では使わない。
 */
var execFile = require("child_process").execFile;
var PROJECT = "honomi-timecard";
var CLI = process.platform === "win32" ? "firebase.cmd" : "firebase";

function run(args) {
  return new Promise(function (res, rej) {
    /* Windows の .cmd は shell 経由でないと起動できない（spawn EINVAL）。
       引数は自前で組み立てず execFile に渡すが、shell:true が要る。 */
    execFile(CLI, args.concat(["--project", PROJECT]),
      { maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" },
      function (err, out, errOut) {
        if (err) {
          var m = String(errOut || err.message || "").trim().split("\n").slice(-3).join(" ");
          rej(new Error("firebase " + args[0] + " に失敗しました: " + m +
            "\n（`firebase login` が済んでいるか確かめてください）"));
          return;
        }
        res(String(out));
      });
  });
}

exports.get = function (p) {
  return run(["database:get", p]).then(function (out) {
    var t = out.trim();
    if (!t) return null;
    try { return JSON.parse(t); }
    catch (e) { throw new Error("GET " + p + " の応答を読めませんでした"); }
  });
};

/* multi-path update。キーは p からの相対パス。値 null で削除。 */
exports.update = function (p, obj) {
  var tmp = require("path").join(require("os").tmpdir(),
    "honomi-board-upd-" + Date.now() + ".json");
  require("fs").writeFileSync(tmp, JSON.stringify(obj), "utf8");
  return run(["database:update", p, tmp, "--force"])
    .then(function (r) { try { require("fs").unlinkSync(tmp); } catch (e) {} return r; },
          function (e) { try { require("fs").unlinkSync(tmp); } catch (e2) {} throw e; });
};
