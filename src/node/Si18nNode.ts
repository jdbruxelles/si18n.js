import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import Si18nCore, {
  type LocaleMessages,
  type Si18nCoreDependencies,
  type Si18nInitOptions,
  type StorageAdapter
} from "../core";

const resolveSystemLocale = (): string | null => {
  const envLocale =
    process.env.LC_ALL ??
    process.env.LC_MESSAGES ??
    process.env.LANG ??
    process.env.LANGUAGE;

  if (!envLocale) return null;

  return envLocale;
};

export const createMemoryStorage = (): StorageAdapter => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    }
  };
};

export const createProcessEnvStorage = (): StorageAdapter => {
  return {
    getItem: (key: string) => process.env[key] ?? null,
    setItem: (key: string, value: string) => {
      process.env[key] = value;
    }
  };
};

const createNodeDependencies = (
  customStorage?: StorageAdapter
): Si18nCoreDependencies => {
  return {
    createPathLocaleLoader: (basePath) => {
      return async (locale) => {
        const localeFile = resolve(basePath, `${locale}.json`);
        const localeRaw = await readFile(localeFile, "utf8");
        return JSON.parse(localeRaw) as LocaleMessages;
      };
    },
    detectLanguage: resolveSystemLocale,
    storage: customStorage ?? createMemoryStorage()
  };
};

export class Si18nNode extends Si18nCore {
  public constructor(
    options?: Si18nInitOptions,
    dependencies?: Partial<Si18nCoreDependencies>
  ) {
    const baseDeps = createNodeDependencies(dependencies?.storage);
    super(undefined, { ...baseDeps, ...dependencies });

    if (options && typeof options === "object") {
      void this.init(options);
    }
  }

  public static async getJSON<T = LocaleMessages>(
    filePath: string,
    callback?: (value: T) => void
  ): Promise<T | void> {
    const content = await readFile(filePath, "utf8");
    const payload = JSON.parse(content) as T;

    if (callback) {
      callback(payload);
      return;
    }

    return payload;
  }
}

export default Si18nNode;
