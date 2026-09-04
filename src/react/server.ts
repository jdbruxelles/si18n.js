import { Si18nNode } from "../node";
import type {
  Si18nInitOptions,
  Si18nLike,
  TranslationReplacements,
  TranslationValue
} from "../core";

export interface ServerTranslator {
  i18n: Si18nLike;
  locale: string;
  locales: string[];
  t: (path: string, replacements?: TranslationReplacements) => TranslationValue;
}

export const createServerTranslator = async (
  options: Si18nInitOptions,
  i18nInstance: Si18nLike = new Si18nNode()
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
