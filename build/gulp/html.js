const { dest, src } = require('gulp');
const replace = require('gulp-replace');
const { BUILD_DESTS } = require('./config');
const { version } = require('../../package.json');

const html = buildDest => {
    let stream = src('src/index.html').pipe(replace('{{VERSION}}', version));

    // For extensions add body class and remove Controller.js including
    if (buildDest !== BUILD_DESTS.WEB) {
        stream = stream.pipe(replace('<body>', '<body class="plugin">'))
                       .pipe(replace(/^.*<script.*src=".*Controller.js.*".*$(\r\n|\r|\n)/gm, ''));
    }

    return stream.pipe(dest(buildDest));
};

module.exports = html;
