const { dest, src } = require('gulp');

const css = buildDest => {
    return src('src/css/**/*.css').pipe(dest(buildDest));
};

module.exports = css;
