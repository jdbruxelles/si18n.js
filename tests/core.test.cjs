const test = require("node:test");
const assert = require("node:assert/strict");

const { Si18nCore } = require("../dist/core/index.cjs");

test("Si18nCore translates with fallback and replacements", async () => {
  const i18n = new Si18nCore();

  await i18n.init({
    locales: {
      en: {
        greeting: "Hello %{name}",
        nested: {
          title: "Welcome"
        }
      },
      fr: {
        greeting: "Bonjour %{name}",
        nested: {}
      }
    },
    lang: "fr",
    fallbackLang: "en"
  });

  assert.equal(i18n.t("greeting", { name: "Ada" }), "Bonjour Ada");
  assert.equal(i18n.t("nested.title"), "Welcome");
});

test("Si18nCore uses url locale with highest detection priority", async () => {
  const i18n = new Si18nCore(undefined, {
    getLanguageFromUrl: (saveAs) => {
      assert.equal(saveAs, "lang");
      return "de-DE";
    },
    storage: {
      getItem: () => "fr",
      setItem: () => undefined
    },
    detectLanguage: () => "fr"
  });

  await i18n.init({
    locales: {
      en: { name: "English" },
      fr: { name: "Francais" },
      de: { name: "Deutsch" }
    },
    lang: "fr",
    fallbackLang: "en"
  });

  assert.equal(i18n.getLocale(), "de");
  assert.equal(i18n.t("name"), "Deutsch");
});

test("Si18nCore loads locales lazily and emits locale updates", async () => {
  const loadedLocales = [];
  const persistedLocales = [];

  const i18n = new Si18nCore(undefined, {
    storage: {
      getItem: () => null,
      setItem: (key, value) => {
        persistedLocales.push([key, value]);
      }
    }
  });

  await i18n.init({
    localeLoader: async (locale) => {
      loadedLocales.push(locale);
      if (locale === "en") {
        return { greeting: "Hello" };
      }
      return { greeting: "Salut" };
    },
    availableLocales: ["en", "fr"],
    lang: "fr",
    fallbackLang: "en",
    saveAs: "preferredLocale"
  });

  const localeEvents = [];
  const unsubscribe = i18n.subscribe((locale) => {
    localeEvents.push(locale);
  });

  await i18n.setLocale("en");
  unsubscribe();

  assert.deepEqual(loadedLocales, ["en", "fr"]);
  assert.deepEqual(localeEvents, ["en"]);
  assert.deepEqual(persistedLocales, [["preferredLocale", "en"]]);
  assert.equal(i18n.t("greeting"), "Hello");
});

test("Si18nCore normalizes lang and fallbackLang to available locales", async () => {
  const loadedLocales = [];
  const i18n = new Si18nCore();

  await i18n.init({
    localeLoader: async (locale) => {
      loadedLocales.push(locale);
      if (locale === "en") {
        return { name: "English" };
      }
      return { name: "Francais" };
    },
    availableLocales: ["en", "fr"],
    lang: "fr-CA",
    fallbackLang: "en-US",
    saveLang: false
  });

  assert.equal(i18n.getLocale(), "fr");
  assert.equal(i18n.toJSON().fallbackLang, "en");
  assert.deepEqual(loadedLocales, ["en", "fr"]);
});

test("Si18nCore rejects fallbackLang values outside available locales", async () => {
  const i18n = new Si18nCore();

  await assert.rejects(
    () =>
      i18n.init({
        locales: {
          en: { title: "Hello" }
        },
        availableLocales: ["en"],
        lang: "en",
        fallbackLang: "de"
      }),
    /fallbackLang option must match one of the availableLocales/
  );
});
