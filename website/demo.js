import si18n from "./si18n.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const getJSON = async (url) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    return console.error();(error);
  }
};

const scrollTo = (element, top = 16) => {
  let distance = element.getBoundingClientRect();
  window.scrollTo({
    behavior: "smooth",
    top: distance.top + window.pageYOffset - top,
    left: 0
  });
};

(function(){
  const copyBtn = document.createElement("span");
  copyBtn.setAttribute("role", "button");
  copyBtn.setAttribute("data-si18n", "utils.copy");
  copyBtn.setAttribute("data-si18n-default", "false");
  copyBtn.setAttribute("data-si18n-title", "true");
  copyBtn.classList.add("jdb-right", "jdb-ripple", "copy-btn");

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

const loc = new si18n(); // Initialize the i18n object.
const loc2 = new si18n(); // Initialize the si18n object.
const locales = {
  fr: await getJSON("./locales/fr.json"),
  en: await getJSON("./locales/en.json")
};

const translate = (locObj) => {
  $("meta[name='description']").setAttribute("content", locObj.t("site_description"));
  $(".monkey .more").innerText = locObj.t("nested.more").replace("{0}", 12);

  // Show locales infos
  const infos = $$("#demo #info span");
  infos[0].innerText = `${locObj.t("current_lang")} : ${locObj.getLocale()}`;
  infos[1].innerText = `${locObj.t("all_lang")} : ${locObj.getLocales().join(", ")}`;

  $("#options summary").innerHTML = "<a href='#options'>#</a> " +
    locObj.t("options.cols_title.default_options") + " (" +
    Object.keys(locObj.toJSON()).length + ")";

  const params = [
    "locales", "lang", "fallbackLang", "activeClass", "togglersSelector",
    "isTogglerSelect", "saveLang", "saveAs", "translate", "onChange"
  ], optTable = $("#options table");
  params.forEach((prop) => {
    optTable.querySelector(`.${prop} td:last-child`).innerHTML = locObj.t(`options.params.${prop}`);
  });
};

// For <button>s
loc.init({
  locales,
  lang: "fr",
  fallbackLang: "en",
  activeClass: "jdb-dark-gray",
  togglersSelector: ".i18n-container button",
  translate() { translate(loc); }
});

// For <select>
loc2.init({
  locales,
  lang: "fr",
  fallbackLang: "en",
  togglersSelector: ".i18n-container .lang-select",
  isTogglerSelect: true,
  translate() { translate(loc2); }
});

$$(".i18n-container button").forEach((item) => {
  item.addEventListener("click", function() {
    setTimeout(() => {
      if (this.classList.contains("jdb-dark-gray")) {
        const select = $(".i18n-container .lang-select");
        select.querySelector("option:checked").removeAttribute("selected");
        select.querySelector(`option[value="${this.dataset.lang}"]`)
          .setAttribute("selected", true);
      }
    }, 100);
  });
});

$(".i18n-container .lang-select").addEventListener("change", function() {
  const value = this.querySelector("option:checked").value;
  setTimeout(() => {
    $(".i18n-container button.jdb-dark-gray").classList.remove("jdb-dark-gray");
    $(`.i18n-container button[data-lang="${value}"]`).classList.add("jdb-dark-gray");
  }, 100);
});

$$("#summary a, summary a[href^='#']").forEach((item) => {
  item.addEventListener("click", function(event) {
    event.preventDefault();
    const hash = this.href.split("/").at(-1);
    scrollTo($(hash), 8);
    setTimeout(() => {
      location.hash = hash;
    }, 25);
  });
});

$$("[data-goto]").forEach((elem) => {
  elem.addEventListener("click", () => {
    const id = elem.dataset.goto;
    scrollTo($(`#${id}`), 8);
  });
});
