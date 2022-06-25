import si18n from "./si18n.js";
import en from "./locales/en.json" assert {type: "json"};
import fr from "./locales/fr.json" assert {type: "json"};
import ru from "./locales/ru.json" assert {type: "json"};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

$("#license").innerHTML = `© ${(new Date().getFullYear())} — <span></span>`;

const loc = new si18n(); // Initialize the i18n object.
const loc2 = new si18n(); // Initialize the si18n object.
const locales = { en, fr, ru };

const translate = (locObj) => {
  $("html").setAttribute("lang", locObj.getLocale());
  $("meta[name='description']").setAttribute("content", locObj.t("site_description"));

  $("#demo h1").innerText = locObj.t("good_morning");
  $("#text").setAttribute("title", locObj.t("good_morning"));
  $("#text").innerText = locObj.t("text");
  $("#text-fallback").innerText = locObj.t("fallback_text");

  $(".monkey .one").innerText = locObj.t("nested.one");
  $(".monkey .more").innerText = locObj.t("nested.more").replace("{0}", 12);

  // Show locales infos
  const infos = $$("#demo #info span");
  infos[0].innerText = `${locObj.t("current_lang")} : ${locObj.getLocale()}`;
  infos[1].innerText = `${locObj.t("all_lang")} : ${locObj.getLocales().join(", ")}`;

  $("#options summary").innerText =
    `${locObj.t("default_options")} (${Object.keys(locObj.toJSON()).length})`;

  const props = [
    "locales", "lang", "fallbackLang", "activeClass", "togglersSelector",
    "isTogglerSelect", "saveLang", "saveAs", "translate", "onChange"
  ];
  const optTable = $("#options table");
  optTable.querySelector("tr > th:nth-child(1)").innerText = locObj.t("options.cols_title.argument");
  optTable.querySelector("tr > th:nth-child(2)").innerText = locObj.t("options.cols_title.default_value");
  optTable.querySelector("tr > th:nth-child(3)").innerText = locObj.t("options.cols_title.description");

  props.forEach((prop) => {
    optTable.querySelector(`.${prop} td:last-child`).innerText = locObj.t(`options.${prop}`);
  });

  $("#license span").innerText = loc.t("license");
};

// For <button>s
loc.init({
  locales,
  lang: "fr",
  fallbackLang: "fr",
  activeClass: "jdb-dark-gray",
  togglersSelector: ".i18n-container button",
  translate: () => {
    translate(loc);
  },
  onChange() {
    // console.log("Ok");
  }
});

// For <select>
loc2.init({
  locales,
  lang: "fr",
  fallbackLang: "fr",
  togglersSelector: ".i18n-container .lang-select",
  isTogglerSelect: true,
  translate: () => {
    translate(loc2);
  }
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
