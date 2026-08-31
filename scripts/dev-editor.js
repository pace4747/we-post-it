#!/usr/bin/env node
/**
 * Local editor + shop-page server for development (not used on Vercel).
 *   node scripts/dev-editor.js
 * Then open:
 *   http://127.0.0.1:4173/edit/rr-electric?k=wpi_demo_rr_electric_7hKq2mN9pL4x
 *   http://127.0.0.1:4173/s/rr-electric
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.join(__dirname, "..");
const PORT = parseInt(process.env.PORT || "4173", 10);

const handlers = {
  "/api/site-document": require("../api/site-document"),
  "/api/site-publish": require("../api/site-publish"),
  "/api/site-preview": require("../api/site-preview"),
  "/api/site-upload": require("../api/site-upload"),
  "/api/shop-page": require("../api/shop-page")
};

var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8"
};

function sendFile(res, file) {
  var ext = path.extname(file).toLowerCase();
  fs.readFile(file, function (err, buf) {
    if (err) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    res.setHeader("Content-Type", TYPES[ext] || "application/octet-stream");
    res.end(buf);
  });
}

function mockRes(nodeRes) {
  var headers = {};
  var code = 200;
  var r = {
    setHeader: function (k, v) { headers[k] = v; nodeRes.setHeader(k, v); },
    status: function (n) { code = n; nodeRes.statusCode = n; return r; },
    json: function (obj) {
      nodeRes.statusCode = code;
      nodeRes.setHeader("Content-Type", "application/json; charset=utf-8");
      nodeRes.end(JSON.stringify(obj));
    },
    send: function (x) {
      nodeRes.statusCode = code;
      if (!nodeRes.getHeader("Content-Type")) {
        nodeRes.setHeader("Content-Type", typeof x === "string" && x.indexOf("<") === 0 ? "text/html; charset=utf-8" : "text/plain; charset=utf-8");
      }
      nodeRes.end(typeof x === "string" || Buffer.isBuffer(x) ? x : String(x));
    },
    end: function (x) { nodeRes.end(x); }
  };
  return r;
}

function collect(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

http.createServer(async function (req, res) {
  try {
    var parsed = url.parse(req.url, true);
    var pathname = decodeURIComponent(parsed.pathname || "/");

    var apiName = null;
    var query = Object.assign({}, parsed.query);

    if (pathname.indexOf("/api/") === 0) {
      apiName = pathname.replace(/\/+$/, "");
    } else if (pathname.indexOf("/s/") === 0) {
      apiName = "/api/shop-page";
      query.slug = pathname.split("/")[2] || "";
    } else if (pathname.indexOf("/edit/") === 0) {
      return sendFile(res, path.join(ROOT, "edit.html"));
    }

    if (apiName && handlers[apiName]) {
      var raw = await collect(req);
      var body = {};
      if (raw.length) {
        try { body = JSON.parse(raw.toString("utf8")); } catch (e) { body = {}; }
      }
      var mockReq = {
        method: req.method,
        query: query,
        body: body,
        headers: req.headers,
        on: req.on.bind(req)
      };
      await handlers[apiName](mockReq, mockRes(res));
      return;
    }

    var rel = pathname === "/" ? "/index.html" : pathname;
    var file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    sendFile(res, file);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end("Server error");
  }
}).listen(PORT, "127.0.0.1", function () {
  console.log("Editor dev server http://127.0.0.1:" + PORT);
  console.log("Demo editor: http://127.0.0.1:" + PORT + "/edit/rr-electric?k=wpi_demo_rr_electric_7hKq2mN9pL4x");
  console.log("Live page:   http://127.0.0.1:" + PORT + "/s/rr-electric");
});
