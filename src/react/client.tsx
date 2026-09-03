"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  error: Error | null;
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
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let isMounted = true;

    if (i18n.isInitialized()) {
      setIsReady(true);
      return;
    }

    void (async () => {
      try {
        await i18n.init(optionsRef.current);
        if (isMounted) {
          setError(null);
          setIsReady(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsReady(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [i18n]);

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
      error,
      t,
      setLocale
    };
  }, [i18n, isReady, error, locale, setLocale, t]);

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
