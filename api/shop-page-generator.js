const { generateShopPageHTML } = require("../lib/render-shop-page");
const { makeSlug, escapeHTML } = require("../lib/escape");
const { shopDataToDocument, isSiteDocument, normalizeSiteDocument } = require("../lib/site-document");

module.exports = {
  generateShopPageHTML: generateShopPageHTML,
  makeSlug: makeSlug,
  escapeHTML: escapeHTML,
  shopDataToDocument: shopDataToDocument,
  isSiteDocument: isSiteDocument,
  normalizeSiteDocument: normalizeSiteDocument
};
