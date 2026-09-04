import Si18nBrowser from "./Si18nBrowser";

if (typeof window !== "undefined") {
  (window as Window & { Si18n?: typeof Si18nBrowser }).Si18n = Si18nBrowser;
}

export default Si18nBrowser;
