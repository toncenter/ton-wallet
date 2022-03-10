const { dest, parallel, series, src, task, watch } = require('gulp');
const concatCss = require('gulp-concat-css');
const cssmin = require('gulp-cssmin');
const del = require('del');
const deleteLines = require('gulp-delete-lines');
const path = require('path');
const replace = require('gulp-replace');
const webpack = require('webpack');

const TYPES = {
    DOCS: 0,
    CHROMIUM: 1,
    FIREFOX: 2
};

const DESTINATIONS = {
    [TYPES.DOCS]: 'docs',
    [TYPES.CHROMIUM]: 'dist/chromium',
    [TYPES.FIREFOX]: 'dist/firefox'
};

const clean = type => {
    return del([DESTINATIONS[type]]);
};

const copy = (type, done) => {
    const streams = [src([
        'src/assets/**/*',
        'src/libs/**/*'
    ], { base: 'src' })];

    if (type === TYPES.CHROMIUM) {
        streams.push(src([
            'src/js/extension/**/*',
            'src/manifest.json'
        ], { base: 'src' }));
    }

    if (type === TYPES.FIREFOX) {
        streams.push(src([
            'src/firefox/contentscript.js',
            'src/firefox/manifest.json'
        ], { base: 'src/firefox' }));
    }

    return parallel(...streams.map(stream => function copy() {
        return stream.pipe(dest(DESTINATIONS[type]));
    }))(done);
};

const css = type => {
    return src('src/css/**/*.css')
        .pipe(concatCss('main.css'))
        .pipe(cssmin())
        .pipe(dest(`${DESTINATIONS[type]}/css`))
};

const js = (type, done) => {
    webpack({
        mode: 'none',
        entry: {
            Controller: './src/js/Controller.js',
            'view/View': './src/js/view/View.js'
        },
        optimization: {
            concatenateModules: true,
            minimize: true
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, `./${DESTINATIONS[type]}/js`)
        },
    }, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toJson().errors));

        done();
    });
};

const html = type => {
    let stream = src('src/index.html');

    if (type !== TYPES.DOCS) {
        stream = stream
            .pipe(replace('<body>', '<body class="plugin">'))
            .pipe(deleteLines({ filters: [/Controller.js/i] }));
    }

    return stream.pipe(dest(DESTINATIONS[type]));
};

const createSeries = type => {
    return series(
        clean.bind(null, type),
        copy.bind(null, type),
        css.bind(null, type),
        js.bind(null, type),
        html.bind(null, type)
    );
};

task('docs', createSeries(TYPES.DOCS));
task('chromium', createSeries(TYPES.CHROMIUM));
task('firefox', createSeries(TYPES.FIREFOX));

if(process.argv[3]) task('watch', watch.bind(null, 'src/**/*', series(process.argv[3])))