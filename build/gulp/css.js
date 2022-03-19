const { dest, src } = require('gulp');
const cssmin = require('gulp-cssmin');

const css = (buildDest, needMinify) => {
    const stream = src('src/css/**/*.css');
    if (needMinify) stream.pipe(cssmin());
    return stream.pipe(dest(buildDest));
};

module.exports = css;
