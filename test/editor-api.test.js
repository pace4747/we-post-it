const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

var dir = fs.mkdtempSync(path.join(os.tmpdir(), "wpi-sites-api-"));
process.env.SITE_STORE_DIR = dir;

const documentHandler = require("../api/site-document");
const publishHandler = require("../api/site-publish");
const previewHandler = require("../api/site-preview");
const shopPageHandler = require("../api/shop-page");
const uploadHandler = require("../api/site-upload");

var TOKEN = "wpi_demo_rr_electric_7hKq2mN9pL4x";

function mock(method, query, body, headers) {
  var req = {
    method: method,
    query: query || {},
    body: body || {},
    headers: headers || {}
  };
  var status = 200;
  var headersOut = {};
  var payload = null;
  var res = {
    setHeader: function (k, v) { headersOut[k] = v; },
    status: function (n) { status = n; return res; },
    json: function (obj) { payload = obj; return res; },
    send: function (x) { payload = x; return res; },
    end: function () { return res; }
  };
  return {
    req: req,
    res: res,
    result: function () { return { status: status, headers: headersOut, payload: payload }; }
  };
}

async function run() {
  var denied = mock("GET", { slug: "rr-electric" }, {}, {});
  await documentHandler(denied.req, denied.res);
  assert.strictEqual(denied.result().status, 401);

  var got = mock("GET", { slug: "rr-electric", k: TOKEN }, {}, { "x-edit-token": TOKEN });
  await documentHandler(got.req, got.res);
  var g = got.result();
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.payload.ok, true);
  assert.strictEqual(g.payload.document.business.name.indexOf("R & R") !== -1, true);

  var doc = g.payload.document;
  doc.business.name = "R and R Electric API";
  doc.pages.home.sections[0].settings.headline = "R and R Electric API";
  doc.pages.home.sections[1].settings.body = "We rewired the about text.";
  doc.theme.palette = "blue-gold";
  doc.pages.home.sections.filter(function (s) { return s.type === "services"; })[0].blocks[0].name = "Panel Special";

  var saved = mock("PUT", { slug: "rr-electric", k: TOKEN }, { document: doc }, { "x-edit-token": TOKEN });
  await documentHandler(saved.req, saved.res);
  assert.strictEqual(saved.result().status, 200);
  assert.strictEqual(saved.result().payload.document.business.name, "R and R Electric API");

  var prev = mock("POST", { slug: "rr-electric", k: TOKEN }, { document: saved.result().payload.document, mode: "draft" }, { "x-edit-token": TOKEN });
  await previewHandler(prev.req, prev.res);
  assert.strictEqual(prev.result().status, 200);
  assert.ok(String(prev.result().payload).indexOf("R and R Electric API") !== -1);
  assert.ok(String(prev.result().payload).indexOf("We rewired the about text") !== -1);
  assert.ok(String(prev.result().payload).indexOf("scheme-blue-gold") !== -1);

  var pub = mock("POST", { slug: "rr-electric", k: TOKEN }, { slug: "rr-electric" }, { "x-edit-token": TOKEN });
  await publishHandler(pub.req, pub.res);
  assert.strictEqual(pub.result().status, 200);
  assert.strictEqual(pub.result().payload.ok, true);

  var page = mock("GET", { slug: "rr-electric" }, {}, {});
  await shopPageHandler(page.req, page.res);
  var html = String(page.result().payload);
  assert.strictEqual(page.result().status, 200);
  assert.ok(html.indexOf("R and R Electric API") !== -1);
  assert.ok(html.indexOf("Panel Special") !== -1);
  assert.ok(html.indexOf("scheme-blue-gold") !== -1);
  assert.ok(html.indexOf("?k=") === -1 || html.indexOf(TOKEN) === -1);

  var xssDoc = JSON.parse(JSON.stringify(saved.result().payload.document));
  xssDoc.business.name = "<script>alert(1)</script>";
  xssDoc.pages.home.sections[0].settings.headline = "<script>alert(1)</script>";
  var xssPrev = mock("POST", { slug: "rr-electric", k: TOKEN }, { document: xssDoc, mode: "draft" }, { "x-edit-token": TOKEN });
  await previewHandler(xssPrev.req, xssPrev.res);
  var xssHtml = String(xssPrev.result().payload);
  assert.ok(xssHtml.indexOf("<script>alert(1)</script>") === -1);
  assert.ok(xssHtml.indexOf("&lt;script&gt;") !== -1);

  var up = mock("POST", { slug: "rr-electric", k: TOKEN }, { url: "https://example.com/job.jpg" }, { "x-edit-token": TOKEN });
  await uploadHandler(up.req, up.res);
  assert.strictEqual(up.result().status, 200);
  assert.ok(up.result().payload.document.pages.home.sections.filter(function (s) { return s.type === "photos"; })[0].settings.images.indexOf("https://example.com/job.jpg") !== -1);

  var badUp = mock("POST", { slug: "rr-electric", k: TOKEN }, { url: "javascript:alert(1)" }, { "x-edit-token": TOKEN });
  await uploadHandler(badUp.req, badUp.res);
  assert.strictEqual(badUp.result().status, 400);

  console.log("editor-api tests ok");
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});
