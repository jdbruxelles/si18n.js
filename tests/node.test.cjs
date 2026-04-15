const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

const { Si18nNode } = require("../dist/node/index.cjs");

test("Si18nNode loads locales from path and falls back when key is missing", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-node-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    path.join(tmpDir, "en.json"),
    JSON.stringify({ greeting: "Hello", nested: { title: "Title" } }),
    "utf8"
  );
  await fs.writeFile(
    path.join(tmpDir, "fr.json"),
    JSON.stringify({ greeting: "Bonjour" }),
    "utf8"
  );

  const i18n = new Si18nNode();

  await i18n.init({
    path: tmpDir,
    availableLocales: ["en", "fr"],
    lang: "fr",
    fallbackLang: "en",
    saveLang: false
  });

  assert.equal(i18n.getLocale(), "fr");
  assert.equal(i18n.t("greeting"), "Bonjour");
  assert.equal(i18n.t("nested.title"), "Title");

  await i18n.setLocale("de");
  assert.equal(i18n.getLocale(), "en");
  assert.equal(i18n.t("greeting"), "Hello");
});

test("Si18nNode.getJSON reads and parses JSON files", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-node-json-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, "payload.json");
  await fs.writeFile(filePath, JSON.stringify({ ok: true, n: 42 }), "utf8");

  const payload = await Si18nNode.getJSON(filePath);
  assert.deepEqual(payload, { ok: true, n: 42 });
});
