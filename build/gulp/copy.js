const { dest, src } = require('gulp');
const { BUILD_DESTS } = require('./config');

/**
 * Build destinations and required files conformity
 * keys  - build destination or "*" for all
 * value - list of required files globs
 */
const BUILD_DESTS_GLOBS = {
    '*': [
        'src/assets/fonts/**/*',
        'src/assets/lottie/**/*',
        'src/assets/ui/**/*',
        'src/libs/**/*'
    ],
    [BUILD_DESTS.WEB]: [
        'src/assets/favicon/**/*'
    ],
    [BUILD_DESTS.V3]: [
        'src/assets/extension/**/*',
        'src/js/extension/**/*',
        // Favicons need only for Chromium-based browsers (it show favicon as window icon),
        // if other browser full migrate to manifest v3, need create separate destination
        // for Chromium with favicons, now v3 used only for Chromium and its ok
        // to add favicons to v3 destination
        'src/assets/favicon/favicon.ico',
        'src/assets/favicon/favicon-32x32.png',
        'src/assets/favicon/favicon-16x16.png',
        'src/assets/favicon/192x192.png'
    ],
    [BUILD_DESTS.V2]: [
        'src/assets/extension/**/*',
        'src/js/extension/**/*'
    ]
};

const copy = buildDest => {
    return src([...BUILD_DESTS_GLOBS['*'], ...BUILD_DESTS_GLOBS[buildDest]], { base: 'src' })
        .pipe(dest(buildDest));
};

module.exports = copy;
