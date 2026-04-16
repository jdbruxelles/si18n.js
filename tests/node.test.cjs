const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

const { Si18nNode } = require("../dist/node/index.cjs");

// ─── HELPERS

/**
 * Creates a temporary directory with en.json and fr.json locale files.
 * Returns { tmpDir, cleanup }.
 */
const createLocaleTmpDir = async (prefix, locales = {}) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const defaultLocales = {
    en: { greeting: "Hello", nested: { title: "Title" } },
    fr: { greeting: "Bonjour" },
    ...locales
  };

  for (const [locale, messages] of Object.entries(defaultLocales)) {
    await fs.writeFile(
      path.join(tmpDir, `${locale}.json`),
      JSON.stringify(messages),
      "utf8"
    );
  }
  return tmpDir;
};

// ─── EXISTING TESTS

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

// ─── Si18nNode.getJSON — ADDITIONAL CASES

test("Si18nNode.getJSON with callback invokes callback and returns undefined", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-node-cb-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, "data.json");
  await fs.writeFile(filePath, JSON.stringify({ hello: "world" }), "utf8");

  let received = null;
  const result = await Si18nNode.getJSON(filePath, (val) => {
    received = val;
  });

  assert.equal(result, undefined);
  assert.deepEqual(received, { hello: "world" });
});

test("Si18nNode.getJSON rejects when the file does not exist", async () => {
  await assert.rejects(
    () => Si18nNode.getJSON(path.join(os.tmpdir(), "__nonexistent_si18n__.json")),
    { code: "ENOENT" }
  );
});

test("Si18nNode.getJSON rejects on malformed JSON", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-bad-json-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const filePath = path.join(tmpDir, "bad.json");
  await fs.writeFile(filePath, "{ this is: not valid json }", "utf8");

  await assert.rejects(
    () => Si18nNode.getJSON(filePath),
    (err) => err instanceof SyntaxError
  );
});

// ─── LOCALE FILE LOADING

test("Si18nNode propagates a parse error from an invalid JSON locale file", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-parse-err-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Write malformed JSON as the locale file.
  await fs.writeFile(path.join(tmpDir, "en.json"), "{ invalid json }", "utf8");

  const i18n = new Si18nNode();

  await assert.rejects(() =>
    i18n.init({
      path: tmpDir,
      availableLocales: ["en"],
      lang: "en",
      fallbackLang: "en",
      saveLang: false
    })
  );
});

test("Si18nNode propagates ENOENT when a locale file is missing from the path", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-missing-file-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Only write the fallback locale; the primary locale file is absent.
  await fs.writeFile(path.join(tmpDir, "en.json"), JSON.stringify({ hi: "Hello" }), "utf8");

  const i18n = new Si18nNode();

  await assert.rejects(
    () =>
      i18n.init({
        path: tmpDir,
        availableLocales: ["en", "fr"],
        lang: "fr", // fr.json does not exist
        fallbackLang: "en",
        saveLang: false
      }),
    { code: "ENOENT" }
  );
});

// ─── process.env storage

test("Si18nNode stores the locale in process.env after setLocale", async (t) => {
  const tmpDir = await createLocaleTmpDir("si18n-store-");
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const saveAs = "__si18n_test_store__";
  delete process.env[saveAs];
  t.after(() => { delete process.env[saveAs]; });

  const i18n = new Si18nNode();
  await i18n.init({
    path: tmpDir,
    availableLocales: ["en", "fr"],
    lang: "en",
    fallbackLang: "en",
    saveAs,
    saveLang: true
  });

  await i18n.setLocale("fr");
  assert.equal(process.env[saveAs], "fr");
});

test("Si18nNode reads locale from process.env on a subsequent instance", async (t) => {
  const tmpDir = await createLocaleTmpDir("si18n-read-");
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const saveAs = "__si18n_test_read__";
  process.env[saveAs] = "fr"; // pre-seed stored locale
  t.after(() => { delete process.env[saveAs]; });

  const i18n = new Si18nNode();
  await i18n.init({
    path: tmpDir,
    availableLocales: ["en", "fr"],
    lang: "en", // would pick "en" without storage
    fallbackLang: "en",
    saveAs,
    saveLang: true
  });

  assert.equal(i18n.getLocale(), "fr");
  assert.equal(i18n.t("greeting"), "Bonjour");
});

// ─── SYSTEM LOCALE DETECTION

test("Si18nNode detects system locale from LC_ALL and normalises it to a base tag", async (t) => {
  const tmpDir = await createLocaleTmpDir("si18n-detect-");
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Preserve and restore all relevant env vars.
  const envVars = ["LC_ALL", "LC_MESSAGES", "LANG", "LANGUAGE"];
  const saved = {};
  for (const k of envVars) saved[k] = process.env[k];
  t.after(() => {
    for (const k of envVars) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  // Clear every detection env var so only LC_ALL is active.
  delete process.env.LC_MESSAGES;
  delete process.env.LANG;
  delete process.env.LANGUAGE;
  process.env.LC_ALL = "fr_BE.UTF-8"; // should resolve to "fr"

  // Prevent the stored locale from taking precedence.
  const saveAs = "__si18n_detect_test__";
  delete process.env[saveAs];
  t.after(() => { delete process.env[saveAs]; });

  const i18n = new Si18nNode();
  await i18n.init({
    path: tmpDir,
    availableLocales: ["en", "fr"],
    lang: "de", // does not match → detection runs
    fallbackLang: "en",
    saveAs,
    saveLang: true // will write to process.env[saveAs] = "fr"
  });

  assert.equal(i18n.getLocale(), "fr");
});
