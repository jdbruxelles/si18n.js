import i18n from "/index.js";
import en from "./locales/en.json" assert {type: "json"};
import fr from "./locales/fr.json" assert {type: "json"};
import ru from "./locales/ru.json" assert {type: "json"};

const loc = new i18n(); // Initialize the i18n object.
const loc2 = new i18n(); // Initialize the i18n object.
const locales = { en, fr, ru };

const translate = (locObj) => {
  document.querySelector("html").setAttribute("lang", locObj.getLocale());
  document.querySelector("#demo h1").innerText = locObj.t("good_morning");
  document.getElementById("text").setAttribute("title", locObj.t("good_morning"));
  document.getElementById("text").innerText = locObj.t("text");

  // Show locales infos
  const infos = document.querySelectorAll("#demo #info span");
  infos[0].innerText = `${locObj.t("current_lang")} : ${locObj.getLocale()}`;
  infos[1].innerText = `${locObj.t("all_lang")} : ${locObj.getLocales().join(", ")}`;
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

document.querySelector("pre").innerText = JSON.stringify(loc.toJSON(), null, 2);

document.querySelectorAll(".i18n-container button").forEach((item) => {
  item.addEventListener("click", function() {
    setTimeout(() => {
      if (this.classList.contains("jdb-dark-gray")) {
        const select = document.querySelector(".i18n-container .lang-select");
        select.querySelector("option:checked").removeAttribute("selected");
        select.querySelector(`option[value="${this.dataset.lang}"]`)
          .setAttribute("selected", true);
      }
    }, 100);
  });
});

document.querySelector(".i18n-container .lang-select")
  .addEventListener("change", function() {
    const value = this.querySelector("option:checked").value;
    setTimeout(() => {
      document.querySelector(".i18n-container button.jdb-dark-gray")
        .classList.remove("jdb-dark-gray");
      document.querySelector(`.i18n-container button[data-lang="${value}"]`)
        .classList.add("jdb-dark-gray");
    }, 100);
  });

document.getElementById("license").innerText =
  `© ${(new Date().getFullYear())} — MIT License`;
