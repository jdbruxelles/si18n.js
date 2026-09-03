import type {
  LocaleCollection,
  LocaleListener,
  LocaleLoader,
  LocaleMessages,
  SerializedSi18nOptions,
  Si18nCoreDependencies,
  Si18nInitOptions,
  Si18nLike,
  TranslationReplacements,
  TranslationValue
} from "./types";

// Using `let` instead of `const` prevents esbuild from inlining this as a
// compile-time literal, so the variable reference is preserved in bundles.
export let DOCS_LINK = "https://si18n.js.bruxelles.dev/#options";

interface InternalOptions {
  lang: string;
  fallbackLang: string;
  locales: LocaleCollection;
  availableLocales: string[];
  path: string | null;
  saveLang: boolean;
  saveAs: string;
  reloadPage: boolean;
  translate: (instance: Si18nLike) => void;
  onLocaleChanged: (locale: string, instance: Si18nLike) => void;
  localeLoader?: LocaleLoader;
}

interface InternalDependencies {
  createPathLocaleLoader?: (path: string) => LocaleLoader;
  getLanguageFromUrl: (saveAs: string) => string | null;
  detectLanguage: () => string | null;
  storage?: Si18nCoreDependencies["storage"];
  reload: () => void;
  logError: (message: string, error?: unknown) => void;
}

const noop = (): void => {
  // Intentionally empty callback.
};

const defaultLogError = (message: string, error?: unknown): void => {
  if (error) {
    console.error(message, error);
    return;
  }
  console.error(message);
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export class Si18nCore implements Si18nLike {
  public static readonly version = "2.0.0";

  protected readonly options: InternalOptions = {
    lang: "",
    fallbackLang: "",
    locales: {},
    availableLocales: [],
    path: null,
    saveLang: true,
    saveAs: "lang",
    reloadPage: false,
    translate: noop,
    onLocaleChanged: noop
  };

  protected initialized = false;

  private readonly dependencies: InternalDependencies;
  private readonly localeListeners = new Set<LocaleListener>();

  public constructor(
    initialOptions?: Si18nInitOptions,
    dependencies: Si18nCoreDependencies = {}
  ) {
    this.dependencies = {
      createPathLocaleLoader: dependencies.createPathLocaleLoader,
      getLanguageFromUrl: dependencies.getLanguageFromUrl ?? (() => null),
      detectLanguage: dependencies.detectLanguage ?? (() => null),
      storage: dependencies.storage,
      reload: dependencies.reload ?? noop,
      logError: dependencies.logError ?? defaultLogError
    };

    if (initialOptions && typeof initialOptions === "object") {
      void this.init(initialOptions);
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async init(options: Si18nInitOptions = {}): Promise<void> {
    if (this.initialized) return;

    this.validateInitOptions(options);
    this.applyInitOptions(options);

    this.options.lang = await this.resolveInitialLocale(options.lang);

    await this.ensureLocaleLoaded(this.options.fallbackLang);
    if (this.options.lang !== this.options.fallbackLang) {
      await this.ensureLocaleLoaded(this.options.lang);
    }

    this.initialized = true;
    this.applyTranslation();
    this.options.onLocaleChanged(this.options.lang, this);
    this.notifyLocaleListeners(this.options.lang);
  }

  public async setLocale(locale: string): Promise<void> {
    if (!this.initialized) {
      throw new Error(`Call init before setLocale. See docs ${DOCS_LINK}`);
    }

    const nextLocale = this.matchAvailableLocale(locale) ?? this.options.fallbackLang;

    if (this.options.saveLang) {
      await this.setStoredLocale(nextLocale);
    }

    if (this.options.reloadPage) {
      this.dependencies.reload();
      return;
    }

    await this.ensureLocaleLoaded(nextLocale);

    this.options.lang = nextLocale;
    this.applyTranslation();
    this.options.onLocaleChanged(nextLocale, this);
    this.notifyLocaleListeners(nextLocale);
  }

  public getLocale(): string {
    return this.options.lang;
  }

  public getLocales(): string[] {
    return [...this.options.availableLocales];
  }

  public t(
    path: string,
    replacements?: TranslationReplacements
  ): TranslationValue {
    const localeObj = this.options.locales[this.options.lang];
    const fallbackObj = this.options.locales[this.options.fallbackLang];

    let value = this.readByPath(localeObj, path);
    if (this.isMissingValue(value)) {
      value = this.readByPath(fallbackObj, path);
    }

    if (this.isMissingValue(value)) {
      this.dependencies.logError(
        `The path "${path}" was not found in the current language (${this.options.lang}), nor in the fallback language (${this.options.fallbackLang}).`
      );
      return path;
    }

    if (typeof value === "string" && replacements) {
      return this.applyReplacements(value, replacements);
    }

    return value as TranslationValue;
  }

  public subscribe(listener: LocaleListener): () => void {
    this.localeListeners.add(listener);
    return (): void => {
      this.localeListeners.delete(listener);
    };
  }

  public toJSON(): SerializedSi18nOptions {
    return {
      lang: this.options.lang,
      fallbackLang: this.options.fallbackLang,
      locales: this.options.locales,
      availableLocales: [...this.options.availableLocales],
      path: this.options.path,
      saveLang: this.options.saveLang,
      saveAs: this.options.saveAs,
      reloadPage: this.options.reloadPage
    };
  }

  protected beforeTranslate(): void {
    // Browser adapter overrides this hook for DOM updates.
  }

  protected getLocaleMessages(locale: string): LocaleMessages | undefined {
    return this.options.locales[locale];
  }

  private notifyLocaleListeners(locale: string): void {
    this.localeListeners.forEach((listener) => {
      listener(locale);
    });
  }

  private validateInitOptions(options: Si18nInitOptions): void {
    const optionKeys = Object.keys(options);
    if (optionKeys.length === 0) {
      throw new Error(`No options provided. See docs ${DOCS_LINK}`);
    }

    if (typeof options.fallbackLang !== "undefined" && typeof options.fallbackLang !== "string") {
      throw new Error(`The fallbackLang option must be a string. See docs ${DOCS_LINK}`);
    }

    if (typeof options.lang !== "undefined" && typeof options.lang !== "string") {
      throw new Error(`The lang option must be a string. See docs ${DOCS_LINK}`);
    }

    if (
      typeof options.fallbackLang === "undefined" &&
      typeof options.lang === "undefined"
    ) {
      throw new Error(`The lang option is required when no fallbackLang option is set. See docs ${DOCS_LINK}`);
    }

    if (typeof options.locales !== "undefined" && !isObjectRecord(options.locales)) {
      throw new Error(`The locales option must be an object. See docs ${DOCS_LINK}`);
    }

    if (
      typeof options.availableLocales !== "undefined" &&
      !Array.isArray(options.availableLocales)
    ) {
      throw new Error(`The availableLocales option must be an array. See docs ${DOCS_LINK}`);
    }

    if (typeof options.path !== "undefined" && typeof options.path !== "string") {
      throw new Error(`The path option must be a string. See docs ${DOCS_LINK}`);
    }

    if (typeof options.saveAs !== "undefined") {
      if (typeof options.saveAs !== "string" || options.saveAs.trim() === "") {
        throw new Error(`The saveAs option must be a non-empty string. See docs ${DOCS_LINK}`);
      }
    }

    if (typeof options.translate !== "undefined" && typeof options.translate !== "function") {
      throw new Error(`The translate option must be a function. See docs ${DOCS_LINK}`);
    }

    if (
      typeof options.onLocaleChanged !== "undefined" &&
      typeof options.onLocaleChanged !== "function"
    ) {
      throw new Error(`The onLocaleChanged option must be a function. See docs ${DOCS_LINK}`);
    }

    if (typeof options.localeLoader !== "undefined" && typeof options.localeLoader !== "function") {
      throw new Error(`The localeLoader option must be a function. See docs ${DOCS_LINK}`);
    }

    const hasAutoLoader =
      typeof options.path === "string" ||
      typeof options.localeLoader === "function";

    if (!options.locales && !hasAutoLoader) {
      throw new Error(`Missing required options. See docs ${DOCS_LINK}`);
    }

    if (
      typeof options.path === "string" &&
      (!Array.isArray(options.availableLocales) || options.availableLocales.length === 0)
    ) {
      throw new Error(`The availableLocales option is required when using the path option. See docs ${DOCS_LINK}`);
    }
  }

  private applyInitOptions(options: Si18nInitOptions): void {
    if (options.locales) this.options.locales = options.locales;

    const availableLocales = options.availableLocales ?? Object.keys(this.options.locales);
    this.options.availableLocales = [...new Set(availableLocales)];

    if (this.options.availableLocales.length === 0) {
      throw new Error(`No available locales were found. See docs ${DOCS_LINK}`);
    }

    const fallbackLangInput =
      options.fallbackLang ??
      options.lang ??
      this.options.fallbackLang;
    const resolvedFallbackLang = this.matchAvailableLocale(fallbackLangInput);

    if (!resolvedFallbackLang) {
      throw new Error(
        `The fallbackLang option must match one of the availableLocales. See docs ${DOCS_LINK}`
      );
    }

    this.options.fallbackLang = resolvedFallbackLang;
    this.options.path = options.path ?? null;
    this.options.saveLang = options.saveLang ?? true;
    this.options.saveAs = options.saveAs ?? "lang";
    this.options.reloadPage = options.reloadPage ?? false;
    this.options.translate = options.translate ?? noop;
    this.options.onLocaleChanged = options.onLocaleChanged ?? noop;
    this.options.localeLoader = options.localeLoader;

    if (!this.options.localeLoader && this.options.path) {
      if (!this.dependencies.createPathLocaleLoader) {
        throw new Error(`No locale loader was configured for path loading. See docs ${DOCS_LINK}`);
      }
      this.options.localeLoader = this.dependencies.createPathLocaleLoader(this.options.path);
    }
  }

  private async resolveInitialLocale(hardcodedLocale?: string): Promise<string> {
    const localeFromUrl = this.matchAvailableLocale(
      this.dependencies.getLanguageFromUrl(this.options.saveAs)
    );
    if (localeFromUrl) return localeFromUrl;

    if (this.options.saveLang) {
      const storedLocale = this.matchAvailableLocale(await this.getStoredLocale());
      if (storedLocale) return storedLocale;
    }

    const localeFromCode = this.matchAvailableLocale(hardcodedLocale);
    if (localeFromCode) return localeFromCode;

    const detectedLocale = this.matchAvailableLocale(this.dependencies.detectLanguage());
    if (detectedLocale) return detectedLocale;

    return this.options.fallbackLang;
  }

  private async getStoredLocale(): Promise<string | null> {
    if (!this.dependencies.storage) return null;

    const value = this.dependencies.storage.getItem(this.options.saveAs);
    return Promise.resolve(value);
  }

  private async setStoredLocale(locale: string): Promise<void> {
    if (!this.dependencies.storage) return;

    const result = this.dependencies.storage.setItem(this.options.saveAs, locale);
    await Promise.resolve(result);
  }

  private matchAvailableLocale(locale: string | null | undefined): string | null {
    if (!locale) return null;

    const trimmedLocale = locale.trim();
    if (!trimmedLocale) return null;

    const normalizedLocales = new Set<string>();
    normalizedLocales.add(trimmedLocale);
    normalizedLocales.add(trimmedLocale.toLowerCase());

    const languageToken = trimmedLocale.split(/[-_.]/)[0];
    if (languageToken) {
      normalizedLocales.add(languageToken.toLowerCase());
    }

    for (const candidate of normalizedLocales) {
      const match = this.options.availableLocales.find((availableLocale) => {
        return availableLocale.toLowerCase() === candidate.toLowerCase();
      });
      if (match) return match;
    }

    return null;
  }

  private async ensureLocaleLoaded(locale: string): Promise<void> {
    if (this.options.locales[locale]) return;

    if (!this.options.localeLoader) {
      throw new Error(
        `No locale loader found for "${locale}". Provide locales or a path/localeLoader option. See docs ${DOCS_LINK}`
      );
    }

    try {
      const loadedLocale = await this.options.localeLoader(locale);
      if (!isObjectRecord(loadedLocale)) {
        throw new Error(`Locale "${locale}" is not a valid object.`);
      }
      this.options.locales[locale] = loadedLocale as LocaleMessages;
    } catch (error) {
      this.dependencies.logError(`Unable to load locale "${locale}".`, error);
      throw error;
    }
  }

  private applyTranslation(): void {
    this.beforeTranslate();
    this.options.translate(this);
  }

  private readByPath(
    root: TranslationValue | undefined,
    path: string
  ): TranslationValue | undefined {
    if (!root) return undefined;

    const pathItems = path.split(".").filter(Boolean);
    if (pathItems.length === 0) return undefined;

    let value: TranslationValue | undefined = root;

    for (const pathItem of pathItems) {
      if (!isObjectRecord(value) && !Array.isArray(value)) {
        return undefined;
      }

      if (Array.isArray(value)) {
        const parsedIndex = Number(pathItem);
        if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
          return undefined;
        }
        value = value[parsedIndex];
        continue;
      }

      value = value[pathItem] as TranslationValue | undefined;
      if (typeof value === "undefined") return undefined;
    }

    return value;
  }

  private isMissingValue(value: TranslationValue | undefined): boolean {
    return typeof value === "undefined" || value === "";
  }

  private applyReplacements(
    message: string,
    replacements: TranslationReplacements
  ): string {
    return message.replace(/%\{([^{}]+)\}/g, (match, rawKey: string) => {
      const key = rawKey.trim();
      if (Object.prototype.hasOwnProperty.call(replacements, key)) {
        return String(replacements[key]);
      }
      if (Object.prototype.hasOwnProperty.call(replacements, rawKey)) {
        return String(replacements[rawKey]);
      }
      return match;
    });
  }
}

export default Si18nCore;
