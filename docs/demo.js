
  // Show locales infos
  const infos = document.querySelectorAll("#demo #info span");
  infos[0].innerText = `${locObj.t("current_lang")} : ${locObj.getLocale()}`;
  infos[1].innerText = `${locObj.t("all_lang")} : ${locObj.getLocales().join(", ")}`;
