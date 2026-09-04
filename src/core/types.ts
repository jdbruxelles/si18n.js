export type ReplacementValue = string | number;

export type TranslationScalar = string | number | boolean | null;

export interface TranslationObject {
  [key: string]: TranslationValue | undefined;
  rtl?: boolean;
}

export type TranslationValue =
  | TranslationScalar
  | TranslationObject
  | TranslationValue[];

export type LocaleMessages = TranslationObject;

export type LocaleCollection = Record<string, LocaleMessages>;

export type TranslationReplacements = Record<string | number, ReplacementValue>;

export type LocaleLoader = (locale: string) => Promise<LocaleMessages>;

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

export type LocaleListener = (locale: string) => void;

export interface SerializedSi18nOptions {
  lang: string;
  fallbackLang: string;
  locales: LocaleCollection;
  availableLocales: string[];
  path: string | null;
  saveLang: boolean;
  saveAs: string;
  reloadPage: boolean;
}

export interface Si18nLike {
  init(options?: Si18nInitOptions): Promise<void>;
  setLocale(locale: string): Promise<void>;
  getLocale(): string;
  getLocales(): string[];
  t(path: string, replacements?: TranslationReplacements): TranslationValue;
  subscribe(listener: LocaleListener): () => void;
  isInitialized(): boolean;
  toJSON(): SerializedSi18nOptions;
}

export interface Si18nInitOptions {
  locales?: LocaleCollection;
  lang?: string;
  fallbackLang?: string;
  availableLocales?: string[];
  path?: string;
  saveLang?: boolean;
  saveAs?: string;
  reloadPage?: boolean;
  translate?: (instance: Si18nLike) => void;
  onLocaleChanged?: (locale: string, instance: Si18nLike) => void;
  localeLoader?: LocaleLoader;
}

export interface Si18nCoreDependencies {
  createPathLocaleLoader?: (path: string) => LocaleLoader;
  getLanguageFromUrl?: (saveAs: string) => string | null;
  detectLanguage?: () => string | null;
  storage?: StorageAdapter;
  reload?: () => void;
  logError?: (message: string, error?: unknown) => void;
}
