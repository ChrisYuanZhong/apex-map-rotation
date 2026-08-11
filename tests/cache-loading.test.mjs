import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("each page visit versions the stylesheet and application module", () => {
  assert.match(html, /__APEX_ASSET_VERSION__ = Date\.now\(\)\.toString\(\)/);
  assert.match(html, /styles\.css\?v=\$\{window\.__APEX_ASSET_VERSION__\}/);
  assert.match(html, /import\(`\.\/app\.js\?v=\$\{window\.__APEX_ASSET_VERSION__\}`\)/);
});

test("the application uses the same visit version for the rotation module", () => {
  assert.match(app, /new URL\("\.\/rotation\.mjs", import\.meta\.url\)/);
  assert.match(app, /searchParams\.set\("v", window\.__APEX_ASSET_VERSION__/);
});
