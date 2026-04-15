"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactElement
} from "react";

import type {
  Si18nInitOptions,
  Si18nLike,
  TranslationReplacements,
  TranslationValue
} from "../core";

export interface Si18nProviderProps extends PropsWithChildren {
  i18n: Si18nLike;
  options: Si18nInitOptions;
}

export interface TranslationContextValue {
  i18n: Si18nLike;
  locale: string;
  locales: string[];
  isReady: boolean;
  t: (path: string, replacements?: TranslationReplacements) => TranslationValue;
  setLocale: (locale: string) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export const Si18nProvider = ({
  i18n,
  options,
  children
}: Si18nProviderProps): ReactElement => {
  const [isReady, setIsReady] = useState<boolean>(i18n.isInitialized());

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      await i18n.init(options);
      if (isMounted) setIsReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [i18n, options]);

  const locale = useSyncExternalStore(
    (notify) => i18n.subscribe(() => notify()),
    () => i18n.getLocale(),
    () => i18n.getLocale()
  );

  const setLocale = useCallback(
    async (nextLocale: string): Promise<void> => {
      await i18n.setLocale(nextLocale);
    },
    [i18n]
  );

  const t = useCallback(
    (path: string, replacements?: TranslationReplacements): TranslationValue => {
      return i18n.t(path, replacements);
    },
    [i18n, locale]
  );

  const value = useMemo<TranslationContextValue>(() => {
    return {
      i18n,
      locale,
      locales: i18n.getLocales(),
      isReady,
      t,
      setLocale
    };
  }, [i18n, isReady, locale, setLocale, t]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextValue => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used inside Si18nProvider.");
  }
  return context;
};

export default Si18nProvider;
