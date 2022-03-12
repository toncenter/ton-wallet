const REQUIRED_ENVIRONMENT_VARIABLES = [
    'STATIC_FILES_REVISION',
    'TONCENTER_API_KEY_WEB',
    'TONCENTER_API_KEY_EXTENSION'
];

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

require('./dotenv')(REQUIRED_ENVIRONMENT_VARIABLES);

const { dest, parallel, series, src, task, watch } = require('gulp');
const concatCss = require('gulp-concat-css');
const cssmin = require('gulp-cssmin');
const del = require('del');
const deleteLines = require('gulp-delete-lines');
const path = require('path');
const replace = require('gulp-replace');
const rename = require("gulp-rename");
const webpack = require('webpack');

const clean = type => {
    return del([DESTINATIONS[type]]);
};

const copy = (type, done) => {
    const streams = [src([
        'src/assets/lottie/**/*',
        'src/assets/ui/**/*',
        'src/libs/**/*'
    ], { base: 'src' })];

    if (type === TYPES.DOCS) {
        streams.push(src('src/assets/favicon/**/*', { base: 'src' }));
    } else {
        streams.push(src([
            'src/assets/extension/**/*',
            'src/js/extension/**/*'
        ], { base: 'src' }));
    }

    if (type === TYPES.CHROMIUM) {
        streams.push(
            src('build/manifest/v3.json', { base: 'build/manifest' }).pipe(rename('manifest.json'))
        );
    }

    if (type === TYPES.FIREFOX) {
        streams.push(
            src('build/manifest/v2.json', { base: 'build/manifest' }).pipe(rename('manifest.json'))
        );
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
            View: './src/js/view/View.js'
        },
        plugins: [new webpack.DefinePlugin({
            TONCENTER_API_KEY_WEB: `'${process.env.TONCENTER_API_KEY_WEB}'`,
            TONCENTER_API_KEY_EXTENSION: `'${process.env.TONCENTER_API_KEY_EXTENSION}'`
        })],
        optimization: {
            concatenateModules: true,
            minimize: true
        },
        output: {
            filename: '[name].js',
            path: path.resolve(process.cwd(), `./${DESTINATIONS[type]}/js`)
        },
    }, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toJson().errors));

        done();
    });
};

const html = type => {
    let stream = src('src/index.html')
        .pipe(replace('{{STATIC_FILES_REVISION}}', process.env.STATIC_FILES_REVISION));

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

if(process.argv[7]) {
    task('watch', watch.bind(null, ['build/**/*', 'src/**/*'], series(process.argv[7])));
}
