import gulp from "gulp";
import babel from "gulp-babel";
import watch from "gulp-watch";
import rename from "gulp-rename";

const babelOptions = {
  minified: true,
  comments: false,
  compact: true,
  shouldPrintComment: (val) => /@license/.test(val),
  presets: [
    ["minify", {
      mangle: {
        keepClassName: true
      }
    }]
  ],
  plugins: [
    "@babel/plugin-syntax-import-assertions"
  ]
};

function si18n() {
  return gulp.src("./src/si18n.js")
    .pipe(gulp.dest("./"))
    .pipe(gulp.dest("./website/"))
    .pipe(babel(babelOptions))
    .pipe(rename({ extname: ".min.js" }))
    .pipe(gulp.dest("./website/"))
    .pipe(gulp.dest("./"));
}

function demoScript() {
  return gulp.src("./website/demo.js")
    .pipe(babel(babelOptions))
    .pipe(rename({ extname: ".min.js" }))
    .pipe(gulp.dest("./website/"));
}

gulp.task("watch", () => {
  const options = { ignoreInitial: false };
  watch("./src/si18n.js", options, si18n);
  watch("./website/*.js", options, demoScript);
});

gulp.task("default", gulp.series(si18n, demoScript));
