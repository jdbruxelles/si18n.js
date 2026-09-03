const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");

const React = require("react");
const { renderToString } = require("react-dom/server");

const { Si18nCore } = require("../dist/core/index.cjs");
const { Si18nProvider, useTranslation } = require("../dist/react/index.cjs");
const { createServerTranslator } = require("../dist/react/server.cjs");

// ─── SERVER TRANSLATOR TESTS

test("createServerTranslator translates with inline locales", async () => {
  const translator = await createServerTranslator({
    locales: {
      en: { title: "Hello %{name}" },
      fr: { title: "Bonjour %{name}" }
    },
    lang: "fr",
    fallbackLang: "en"
  });

  assert.equal(translator.locale, "fr");
  assert.deepEqual(translator.locales, ["en", "fr"]);
  assert.equal(translator.t("title", { name: "World" }), "Bonjour World");
  assert.ok(translator.i18n);
});

test("createServerTranslator loads locales from disk using path option", async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "si18n-react-server-"));
  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await fs.writeFile(
    path.join(tmpDir, "en.json"),
    JSON.stringify({ welcome: "Welcome", nested: { item: "Box" } }),
    "utf8"
  );
  await fs.writeFile(
    path.join(tmpDir, "es.json"),
    JSON.stringify({ welcome: "Bienvenido", nested: { item: "Caja" } }),
    "utf8"
  );

  const translator = await createServerTranslator({
    path: tmpDir,
    availableLocales: ["en", "es"],
    lang: "es",
    fallbackLang: "en"
  });

  assert.equal(translator.locale, "es");
  assert.equal(translator.t("welcome"), "Bienvenido");
  assert.equal(translator.t("nested.item"), "Caja");
});

test("createServerTranslator accepts custom i18n instance", async () => {
  const customCore = new Si18nCore();
  const translator = await createServerTranslator(
    {
      locales: {
        de: { greeting: "Hallo" }
      },
      lang: "de"
    },
    customCore
  );

  assert.equal(translator.i18n, customCore);
  assert.equal(translator.locale, "de");
  assert.equal(translator.t("greeting"), "Hallo");
});

// ─── REACT CLIENT PROVIDER TESTS

test("Si18nProvider renders children and provides translation context", async () => {
  const i18n = new Si18nCore();
  await i18n.init({
    locales: {
      en: { greeting: "Hello %{name}", app: "App" },
      fr: { greeting: "Bonjour %{name}", app: "App" }
    },
    lang: "en",
    fallbackLang: "en"
  });

  function Consumer() {
    const { t, locale, locales, isReady, error } = useTranslation();
    return React.createElement(
      "div",
      { id: "content" },
      React.createElement("span", { className: "lang" }, locale),
      React.createElement("span", { className: "locales" }, locales.join(",")),
      React.createElement("span", { className: "ready" }, String(isReady)),
      React.createElement("span", { className: "err" }, String(error)),
      React.createElement("p", null, t("greeting", { name: "Alice" }))
    );
  }

  const html = renderToString(
    React.createElement(
      Si18nProvider,
      { i18n, options: {} },
      React.createElement(Consumer)
    )
  );

  assert.match(html, /<span class="lang">en<\/span>/);
  assert.match(html, /<span class="locales">en,fr<\/span>/);
  assert.match(html, /<span class="ready">true<\/span>/);
  assert.match(html, /<span class="err">null<\/span>/);
  assert.match(html, /<p>Hello Alice<\/p>/);
});

test("useTranslation throws descriptive error when used outside Si18nProvider", () => {
  function Orphan() {
    useTranslation();
    return null;
  }

  assert.throws(
    () => {
      renderToString(React.createElement(Orphan));
    },
    {
      name: "Error",
      message: "useTranslation must be used inside Si18nProvider."
    }
  );
});

test("Si18nProvider renders without crashing when i18n is not yet initialized", () => {
  const uninitialized = new Si18nCore();

  function Child() {
    const { isReady, locale } = useTranslation();
    return React.createElement(
      "div",
      null,
      `ready:${isReady},locale:${locale}`
    );
  }

  const html = renderToString(
    React.createElement(
      Si18nProvider,
      {
        i18n: uninitialized,
        options: {
          locales: { en: { test: "val" } },
          lang: "en"
        }
      },
      React.createElement(Child)
    )
  );

  assert.match(html, /ready:false,locale:/);
});
