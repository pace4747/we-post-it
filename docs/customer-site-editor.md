# Customer site editor — how Wix, Squarespace, and We Post It let people fill in a site

We Post It is still a done-for-you shop: we start Google, Facebook, and a one-page site; owners text photos; we post them. The editor in this repo is **optional**. It is not a Wix clone. It is the same idea Wix, Squarespace, and Shopify use underneath the chrome: **a template we ship, plus a JSON document the customer fills**.

This note is the deep-dive and the template for how that system is set up.

---

## The shared pattern (all three products)

Every “build your own site” product that is not a raw code editor splits the world in two:

| Piece | Who owns it | What it is |
|---|---|---|
| **Template** | The platform | Layout, CSS, section types, which fields exist |
| **Site document** | The customer | The values: name, photos, hours, colors, which sections are on |

The customer never writes HTML. They pick a template (or an AI/wizard picks one), then they **fill in the blanks**. Save writes the document. Publish copies the document to a public slot. A **renderer** paints HTML from template + document.

That is the whole product. Drag-and-drop, ADI, Fluid Engine, and Shopify’s theme editor are different skins on this split.

```
  pick template  →  fill settings  →  save draft JSON  →  publish JSON  →  renderer → public HTML
```

Shopify names this most honestly (JSON templates + section schemas). Wix and Squarespace hide the JSON behind a visual editor, but they store the same thing.

---

## Site #1 — Wix

### What the customer sees

1. **Start from a template or from AI.** Wix’s AI Site Builder (it replaced ADI, “Artificial Design Intelligence”) asks a few questions — business type, name, style — and generates a site. A template gallery does the same with a human pick. Either way the customer does **not** start from a blank canvas.
2. **Hand-off to the Editor.** After generation they land in the Wix Editor (or Editor X / Studio for more advanced layouts). They click text, swap photos, change colors, turn sections on and off.
3. **Draft vs published.** Edits sit on a draft. Publish pushes a live version. They can preview unpublished work. Revisions exist so they can roll back.
4. **They do not code.** Components expose a **manifest of editable props** (text, image, URL, color). The editor auto-builds a panel from that manifest. Harmony / Editor React Components are the modern form of this: a component declares what is customizable; the editor stores values and passes them back as props.

### How Wix is actually set up

Public reporting and Wix engineering talks describe roughly this pipeline:

- A site is stored as **immutable JSON pages**. Saving writes a new JSON snapshot, not a mutation of HTML files.
- **Editor, public CDN, and media are separate services.** The editor talks to an editor API. Media (Wix Media) is its own store. The public site is not the editor.
- **Publish** writes a site header / manifest plus a routing table into the public segment. Visitors never load the editor app.
- Public HTML is a **bootstrap shell + JSON**. A renderer (client or server) turns that JSON into the page. That is why a Wix site can change without a full rebuild of every HTML file.
- Components are not free-form DIVs. They have a type, a set of props, and (in Studio) responsive rules. The “click this headline to edit” UX is just: hit-test the component → open the props that the manifest marked as text.

Wix *also* has a full visual editor (pixels, layers, drag). That is the part we are **not** copying. The part we are copying is ADI / AI Site Builder + “fill the props”: template first, then a form of fields that already exist.

### What to steal from Wix

- Template (or wizard) first, editor second.
- Draft JSON vs published JSON.
- A **schema per section** that generates the editor panel. No custom panel code per shop.
- Public page is a renderer over JSON, not a copy of the editor DOM.
- Secret/editor URL is not the public URL.

### What not to steal

- Pixel-precise drag-and-drop.
- A general-purpose layout engine.
- Accounts, roles, and a full CMS.

---

## Site #2 — Squarespace

### What the customer sees

1. **Pick a template** (Squarespace 7.1 family). The template is a design system: fonts, colors, button style, header, footer. It is site-wide, not one-off per page.
2. **Pages are sections are blocks.** A page is an ordered list of sections. A section contains blocks (text, image, button, map, form). Fluid Engine (their current layout) places blocks on a **CSS Grid**: 24 columns on desktop, 8 on mobile. Blocks store **grid coordinates**, not pixel x/y. Resize a block and you change `column/row/span`, not `left: 472px`.
3. **Click a block, edit in place.** A style sidebar edits fonts, colors, spacing. Site-wide styles (palette, fonts, buttons) cascade. Page content is local to the page.
4. **Global vs collection vs page.** Logo, site title, and colors are global. A blog or product catalog is a **collection** (repeatable items with a schema). A static page is just sections + blocks.

### How Squarespace is actually set up

- The template is code + style tokens Squarespace ships. The customer’s site is **data**: site styles, page trees, section lists, block payloads.
- Fluid Engine is a grid model in the document, rendered as CSS Grid in the browser. That is why it reflows on mobile without a second pixel layout.
- Save writes the page document. Publish makes that document the live one. Preview is “render the draft with the same template.”
- They still are not asking the plumber to design a 24-column grid. Most customers click a section, type, upload a photo, and hit Save.

### What to steal from Squarespace

- Site-wide **theme tokens** (we already have this: `navy-red` / `blue-gold`).
- Page = ordered sections; sections can turn off.
- Repeatable **blocks** inside a section (services, reviews) — same idea as collection items, but tiny.
- In-place click plus a sidebar. Sidebar is the source of truth.

### What not to steal

- 24-column Fluid Engine.
- Arbitrary block placement.
- Built-in blogging/commerce CMS.

---

## Closest model to copy: Shopify Online Store 2.0

Shopify’s theme editor is the fill-in-the-blanks product, named out loud:

- A **JSON template** lists sections in order (`index.json` → `hero`, then `featured-products`, …).
- Each section has a **schema**: merchant-editable settings (text, image, color, checkbox) and optional **blocks** (repeatable cards).
- The theme editor is a **live preview + sidebar of fields**. Merchants fill settings. JSON stores values. Liquid (the renderer) paints HTML.
- Merchants do not drag pixels. They reorder sections, toggle them, and fill fields. Developers own the template.

That is exactly what We Post It needs. Shop owners are not designers. They have a name, a phone, hours, a few photos, and a list of services.

---

## The template for “how those websites are set up”

If you were building any of these products, the architecture is:

```
TEMPLATE (code, shipped by us)
  - HTML/CSS for each section type
  - a schema: which settings and blocks exist
  - a renderer: document → HTML

SITE DOCUMENT (JSON, per customer)
  - which template
  - theme tokens (palette, …)
  - business identity (name, phone, address, hours)
  - pages → sections[] → { type, enabled, settings, blocks }
  - status: draft | published

EDITOR (private)
  - auth (account, or a secret URL)
  - live preview (renderer over the draft)
  - sidebar generated from the schema
  - save draft / publish / preview live vs unpublished

PUBLIC
  - renderer over the published document
  - no token, no editor chrome
```

Customer flow:

1. Pick (or be assigned) a template.
2. Fill identity: name, phone, address, hours, colors.
3. Fill each section: headline, about, photos, services, reviews.
4. Toggle sections they do not need.
5. Save (draft). Publish (live). Share the public URL, not the editor URL.

That is Wix ADI, Squarespace’s “edit this section,” and Shopify’s customizer. We Post It implements this, not Studio / Fluid Engine.

---

## We Post It mapping

### What already existed

- One template: the local-shop one-pager in `api/shop-page-generator.js`.
- Identity lived in **Stripe subscription metadata** (name, phone, zip, slug, a tiny photos JSON). Metadata is too small for a real site document.
- Public URL: `/s/:slug` via `api/shop-page.js`.
- No login. Sample shops under `s/` (rr-electric, floyds-heating, damons-body-shop).
- Palettes: navy-red and blue-gold (`looks.html`).
- Pitch: we do the work; they text photos. That pitch stays.

### What we added

| Wix / Squarespace / Shopify idea | We Post It |
|---|---|
| Template | `local-shop-v1` in the renderer (`api/shop-page-generator.js` + `lib/render-shop-page.js`) |
| Site document | JSON per slug, shape below |
| Section schema | `lib/site-document.js` — hero, about, photos, services, reviews, area, map, contact |
| Theme tokens | `theme.palette`: `navy-red` \| `blue-gold` |
| Draft vs published | `sites/<slug>/` seed + durable store (`lib/site-store.js`) |
| Theme editor | `/edit/:slug?k=TOKEN` — preview + sidebar |
| Click section → fields | Preview `postMessage` → sidebar scroll |
| Blocks | Service cards and review cards, add/remove/reorder |
| Publish | Copies draft → published; `/s/:slug` reads published |
| Auth | No accounts. Secret `?k=` token (Carrd-style), stored on the Stripe subscription and/or seed `auth.json` |
| Media | Photo URLs (paste). Vercel Blob upload when `BLOB_READ_WRITE_TOKEN` is set |
| Done-for-you | Editor is optional. They can still text us. |

### Site document shape

```json
{
  "slug": "rr-electric",
  "templateId": "local-shop-v1",
  "status": "draft",
  "theme": { "palette": "navy-red" },
  "business": {
    "name": "R & R Electric",
    "phone": "254-697-3711",
    "email": "",
    "address": "3621 FM1600",
    "city": "Cameron",
    "state": "TX",
    "zip": "76520",
    "hours": "Mon–Fri 8–5",
    "category": "Electrician"
  },
  "pages": {
    "home": {
      "sections": [
        { "id": "hero", "type": "hero", "enabled": true, "settings": { "headline": "", "tagline": "", "ctaLabel": "" } },
        { "id": "about", "type": "about", "enabled": true, "settings": { "body": "" } },
        { "id": "photos", "type": "photos", "enabled": true, "settings": { "images": [] } },
        { "id": "services", "type": "services", "enabled": true, "blocks": [{ "id": "s1", "name": "", "description": "" }] },
        { "id": "reviews", "type": "reviews", "enabled": true, "blocks": [{ "id": "r1", "rating": 5, "text": "", "author": "" }] },
        { "id": "area", "type": "area", "enabled": true, "settings": { "towns": "Cameron, Rockdale", "note": "" } },
        { "id": "map", "type": "map", "enabled": true, "settings": {} },
        { "id": "contact", "type": "contact", "enabled": true, "settings": {} }
      ]
    }
  }
}
```

The renderer prefers this document. If none is published, `/s/:slug` still falls back to Stripe metadata so existing paid shops keep working.

### Storage (Vercel’s filesystem is ephemeral)

Do not treat `/tmp` or a function’s local disk as the database.

| Layer | What lives there |
|---|---|
| Stripe subscription metadata | `slug`, `editToken`, shop name/phone. Small. Durable. |
| Seed files `sites/<slug>/` | Demo published JSON + demo token for rr-electric (committed) |
| Writable disk `data/sites/` or `$SITE_STORE_DIR` | Local / long-running hosts |
| **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set | Production drafts, published JSON, uploaded photos |
| `/tmp/wepostit-sites` | Last-resort local only. **Not durable on Vercel.** The API still saves so the editor works in a single invocation/dev, but production **needs** Blob (or another durable store). |

Set `BLOB_READ_WRITE_TOKEN` on Vercel for production. Without it, the editor runs and the interface is complete; drafts will not survive cold starts.

### Auth

No customer accounts. On checkout, the Stripe webhook mints `editToken` and stores it on the subscription. The owner gets a link like:

```
https://we-post-it-full.vercel.app/edit/rr-electric?k=<token>
```

Public `/s/rr-electric` does **not** use the token.

### Demo (no live Stripe)

```
/edit/rr-electric?k=wpi_demo_rr_electric_7hKq2mN9pL4x
```

Seed: `sites/rr-electric/published.json` + `sites/rr-electric/auth.json`. Documented here so the editor can be opened in development. Public shop pages never require `k`.

### Routes

| URL | What |
|---|---|
| `/edit/:slug?k=` | Editor chrome (secret) |
| `/api/site-document` | GET/PUT draft (token required) |
| `/api/site-publish` | POST publish draft → live (token required) |
| `/api/site-preview` | Render HTML from draft, live, or posted JSON |
| `/api/site-upload` | Add a photo URL, or Blob upload when configured |
| `/s/:slug` | Public published page (no token) |

### What we deliberately did not build

- Drag-and-drop layout.
- A second template marketplace (one template: local-shop-v1).
- Customer logins.
- Rewriting the homepage as “build it yourself.” The FAQ has one line that the editor link exists for shops that want to tweak copy and photos themselves; texting us still works.
