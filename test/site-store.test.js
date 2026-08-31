const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

var dir = fs.mkdtempSync(path.join(os.tmpdir(), "wpi-sites-"));
process.env.SITE_STORE_DIR = dir;

const store = require("../lib/site-store");
const seed = require("../sites/rr-electric/published.json");
const { tokensEqual } = require("../lib/edit-auth");

async function run() {
  var published = await store.getPublished("rr-electric");
  assert.ok(published);
  assert.strictEqual(published.business.name, "R & R Electric & Constrctn Co");

  var auth = await store.authorize("rr-electric", "wpi_demo_rr_electric_7hKq2mN9pL4x");
  assert.strictEqual(auth.ok, true);
  assert.strictEqual((await store.authorize("rr-electric", "wrong")).ok, false);
  assert.strictEqual((await store.authorize("rr-electric", "")).ok, false);

  var draft = JSON.parse(JSON.stringify(published));
  draft.business.name = "R & R Electric Edited";
  draft.pages.home.sections[0].settings.headline = "R & R Electric Edited";
  var saved = await store.saveDraft("rr-electric", draft);
  assert.strictEqual(saved.business.name, "R & R Electric Edited");
  assert.strictEqual(saved.status, "draft");

  var liveBefore = await store.getPublished("rr-electric");
  assert.strictEqual(liveBefore.business.name, "R & R Electric & Constrctn Co");

  var live = await store.publish("rr-electric");
  assert.strictEqual(live.business.name, "R & R Electric Edited");
  assert.strictEqual(live.status, "published");

  var liveAgain = await store.getPublished("rr-electric");
  assert.strictEqual(liveAgain.business.name, "R & R Electric Edited");

  assert.ok(tokensEqual("abc", "abc"));
  assert.ok(!tokensEqual("abc", "abd"));

  console.log("site-store tests ok");
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
