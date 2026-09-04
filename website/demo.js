import Si18n from "./si18n.min.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const scrollTo = (element, top = 8) => {
  let distance = element.getBoundingClientRect();
  let y = window.scrollY ? window.scrollY : window.pageYOffset;
  window.scrollTo({
    behavior: "smooth",
    top: distance.top + y - top,
    left: 0
  });
};

const openSummary = (elem) => {
  const target = elem.tagName === "DETAILS" ? elem : (elem.closest("details") || elem);
  if (!target.attributes.open)
    target.setAttribute("open", "true");
};

(function(){
  const copyBtn = document.createElement("span");
  copyBtn.setAttribute("role", "button");
  copyBtn.setAttribute("data-si18n", "utils.copyCode");
  copyBtn.setAttribute("data-si18n-default", "false");
  copyBtn.setAttribute("data-si18n-title", "true");
  copyBtn.classList.add("jdb-right", "jdb-ripple", "copy-btn");

  $("header .app-version").innerText = Si18n.version;
  $$("pre.app-version code").forEach((el) => {
    el.innerText = el.innerText.replace(/@latest/g, `@${Si18n.version}`);
  });

  $$(".code-block .code-header:not(.no-copy)").forEach(function(item) {
    const copyBtn_ = copyBtn.cloneNode();
    copyBtn_.addEventListener("click", function() {
      const code = this.parentNode.parentNode.querySelector("pre code").innerText;
      navigator.clipboard.writeText(code);
    });
    item.querySelector(".code-title").after(copyBtn_);
  });

  $$("pre.hl code").forEach((codeElement) => {
    const highlightedCode = hljs.highlight(
      codeElement.innerText,
      { language: codeElement.parentNode.dataset?.mode || "plaintext" }
    ).value;
    codeElement.innerHTML = highlightedCode;
  });

  $$("#options table tr td:nth-child(2) code").forEach((codeElement) => {
    hljs.highlightElement(codeElement);
  });

  $("#license").innerHTML = "© " + (new Date().getFullYear()) +
    " — <a href='https://github.com/jdbruxelles/si18n.js/blob/main/LICENSE' " +
    " target='_blank' class='jdb-text-decoration-0' data-si18n='license'></a>";
})();

const loc = new Si18n(); // Initialize the i18n object.

const translate = (locObj) => {
  const siteDescription = locObj.t("site_description");
  $("meta[name='description']").setAttribute("content", siteDescription);
  $("meta[property='og:description']").setAttribute("content", siteDescription);
  $("meta[property='twitter:description']").setAttribute("content", siteDescription);
  $(".monkey .more").innerText = locObj.t("nested.more", { 0: 12 });

  // Show locales infos
  const infos = $$("#demo #info span");
  infos[0].innerText = `${locObj.t("current_lang")} : ${locObj.getLocale()}`;
  infos[1].innerText = `${locObj.t("all_lang")} : ${locObj.getLocales().join(", ")}`;

  const params = [
    "locales", "path", "localeLoader", "availableLocales", "lang",
    "fallbackLang", "activeClass", "togglersSelector", "isTogglerSelect",
    "saveLang", "saveAs", "reloadPage", "translate", "onLocaleChanged",
    "dependencies"
  ];

  const optTable = $("#options table");
  params.forEach((prop) => {
    const el = optTable.querySelector(`#prop-${prop} td:last-child`);
    if (el) el.innerHTML = locObj.t(`options.params.${prop}`);
  });

  const methodKeys = [
    "constructor", "init", "setLocale", "getLocale", "getLocales",
    "t", "subscribe", "isInitialized", "getJSON", "toJSON",
    "createMemoryStorage", "createProcessEnvStorage",
    "createServerTranslator", "provider", "useTranslation"
  ];

  const fnTable = $("#methods table");
  methodKeys.forEach((fn) => {
    const el = fnTable.querySelector(`#fn-${fn} td:last-child`);
    if (el) el.innerHTML = locObj.t(`options.methods.${fn}`);
  });

  updateCounts(locObj);
};

const getPackageFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get("package");
  if (!pkg) return null;
  const match = Array.from($$(".package-tab")).find(
    (tab) => tab.dataset.packageFilter.toLowerCase() === pkg.toLowerCase()
  );
  return match ? match.dataset.packageFilter : null;
};

const updatePackageUrl = (pkg) => {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("package") !== pkg) {
      url.searchParams.set("package", pkg);
      window.history.replaceState(null, "", url.toString());
    }
  } catch {
    // Ignore in environments where history.replaceState is restricted (e.g. file://)
  }
};

let activePackage = getPackageFromUrl() || "web";

const updateCounts = (locObj = loc) => {
  if (!locObj || !locObj.isInitialized()) return;
  const visibleMethods = $$("#methods table tbody tr:not(.jdb-hide)").length;
  $("#methods summary").innerHTML = "<a href='#methods' class='summary-anchor'>#</a> " +
    locObj.t("options.cols_title.methods") +
    " (" + visibleMethods + ")";

  const visibleOptions = $$("#options table tbody tr:not(.jdb-hide)").length;
  $("#options summary").innerHTML = "<a href='#options' class='summary-anchor'>#</a> " +
    locObj.t("options.cols_title.default_options") +
    " (" + visibleOptions + ")";
};

const applyPackageFilter = (pkg, updateUrl = true) => {
  activePackage = pkg;

  $$(".package-tab").forEach((tab) => {
    if (tab.dataset.packageFilter === pkg) {
      tab.classList.add("jdb-teal");
    } else {
      tab.classList.remove("jdb-teal");
    }
  });

  $$("[data-package]").forEach((el) => {
    const packages = el.dataset.package.split(/\s+/);
    if (packages.includes(pkg)) {
      el.classList.remove("jdb-hide");
    } else {
      el.classList.add("jdb-hide");
    }
  });

  updateCounts(loc);

  if (updateUrl) updatePackageUrl(pkg);
};

$$(".package-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    applyPackageFilter(tab.dataset.packageFilter);
  });
});

loc.init({
  lang: "fr",
  fallbackLang: "fr",
  path: "./locales",
  availableLocales: ["fr", "en"],
  activeClass: "jdb-dark-gray",
  togglersSelector: ".i18n-container button",
  translate() {
    translate(loc);
    applyPackageFilter(activePackage, false);
  }
});

applyPackageFilter(activePackage, false);

window.addEventListener("popstate", () => {
  const pkg = getPackageFromUrl() || "web";
  if (pkg !== activePackage) {
    applyPackageFilter(pkg, false);
  }
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || href === "#" || !href.startsWith("#")) return;

  const hash = href.slice(1);
  const elem = document.getElementById(hash);

  if (elem) {
    if (elem.classList.contains("jdb-hide") && elem.dataset.package) {
      const pkgs = elem.dataset.package.split(/\s+/).filter(Boolean);
      if (pkgs.length > 0) applyPackageFilter(pkgs[0]);
    }

    event.preventDefault();
    if (link.classList.contains("summary-anchor")) {
      event.stopPropagation();
    }

    openSummary(elem);
    scrollTo(elem);
    setTimeout(() => {
      location.hash = hash;
    }, 25);
  }
});

$$("[data-goto]").forEach((elem) => {
  elem.addEventListener("click", () => {
    scrollTo($(`#${elem.dataset.goto}`));
  });
});

if (window.location.hash) {
  const elem = $(window.location.hash);
  if (elem) {
    if (!getPackageFromUrl() && elem.classList.contains("jdb-hide") && elem.dataset.package) {
      const pkgs = elem.dataset.package.split(/\s+/).filter(Boolean);
      if (pkgs.length > 0) applyPackageFilter(pkgs[0]);
    }

    openSummary(elem);
    scrollTo(elem);
  }
}
