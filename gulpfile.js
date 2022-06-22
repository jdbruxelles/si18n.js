const { dest, series, src, task } = require("gulp");
const babel = require("gulp-babel");
const watch = require("gulp-watch");
const rename = require("gulp-rename");

const babelOptions = {
  minified: true,
  comments: false,
  compact: true,
  shouldPrintComment: (val) => /@license/.test(val),
  plugins: [
    "@babel/plugin-syntax-import-assertions"
  ]
};

function si18n() {
  return src("./src/si18n.js")
    .pipe(babel(babelOptions))
    .pipe(dest("./"))
    .pipe(dest("./website/"));
}

function demoScript() {
  return src("./website/demo.js")
    .pipe(babel(babelOptions))
    .pipe(rename({ extname: ".min.js" }))
    .pipe(dest("./website/"));
}

task("watch", () => {
  const options = { ignoreInitial: false };
  watch("./src/si18n.js", options, si18n);
  watch("./website/*.js", options, demoScript);
});

task("default", series(si18n, demoScript));
