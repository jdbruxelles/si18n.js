import Si18nCore, {
  type Si18nInitOptions,
  type Si18nLike,
  type TranslationReplacements,
  type TranslationValue
} from "../core";

export interface ServerTranslator {
  i18n: Si18nLike;
  locale: string;
  locales: string[];
  t: (path: string, replacements?: TranslationReplacements) => TranslationValue;
}

export const createServerTranslator = async (
  options: Si18nInitOptions,
  i18nInstance: Si18nLike = new Si18nCore()
): Promise<ServerTranslator> => {
  await i18nInstance.init(options);

  return {
    i18n: i18nInstance,
    locale: i18nInstance.getLocale(),
    locales: i18nInstance.getLocales(),
    t: (path, replacements) => i18nInstance.t(path, replacements)
  };
};

export default createServerTranslator;
