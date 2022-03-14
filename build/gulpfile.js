/**
 * Gulp run arguments count after task name from npm script
 *
 * For example, for script "gulp build --gulpfile build/gulpfile.js --cwd . --target"
 * it was 5: "--gulpfile", "build/gulpfile.js", "--cwd", ".", "--target"\
 * (count only space separated), "build" - is task name
 *
 * Value is 3 (fixed arguments count for run Node.js as binary with task name) + N (arguments count)
 */
const GULP_RUN_ARGS_COUNT = 3 + 5;

/**
 * Possible tasks names, used for validate user inout
 */
const TASKS = [
    'build',
    'watch',
    'pack'
];

const REQUIRED_ENVIRONMENT_VARIABLES = [
    'TON_WALLET_VERSION',
    'TONCENTER_API_KEY_WEB_MAIN',
    'TONCENTER_API_KEY_WEB_TEST',
    'TONCENTER_API_KEY_EXT_MAIN',
    'TONCENTER_API_KEY_EXT_TEST'
];

const BUILD_TYPES = {
    WEB: 0,
    V3: 1,
    V2: 2
};

const BUILD_DESTINATIONS = {
    [BUILD_TYPES.WEB]: 'docs',
    [BUILD_TYPES.V3]: 'dist/v3',
    [BUILD_TYPES.V2]: 'dist/v2'
};

const BUILD_TARGETS = {
    'docs': BUILD_TYPES.WEB,
    'chromium': BUILD_TYPES.V3,
    'firefox': BUILD_TYPES.V2,
    'safari': BUILD_TYPES.V2
};

const PACK_TARGETS = {
    'chromium': BUILD_TYPES.V3,
    'firefox': BUILD_TYPES.V2,
    'safari': BUILD_TYPES.V2
};

require('./dotenv')(REQUIRED_ENVIRONMENT_VARIABLES);

const { dest, parallel, series, src, task, watch } = require('gulp');
const cssmin = require('gulp-cssmin');
const del = require('del');
const path = require('path');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const webpack = require('webpack');

const clean = type => {
    return del([BUILD_DESTINATIONS[type]]);
};

const copy = (type, done) => {
    const streams = [src([
        'src/assets/lottie/**/*',
        'src/assets/ui/**/*',
        'src/libs/**/*'
    ], { base: 'src' })];

    if (type === BUILD_TYPES.WEB) {
        streams.push(src('src/assets/favicon/**/*', { base: 'src' }));
    } else {
        streams.push(src([
            'src/assets/extension/**/*',
            'src/js/extension/**/*'
        ], { base: 'src' }));
    }

    if (type === BUILD_TYPES.V3) {
        streams.push(
            src('build/manifest/v3.json', { base: 'build/manifest' })
                .pipe(replace('{{TON_WALLET_VERSION}}', process.env.TON_WALLET_VERSION))
                .pipe(rename('manifest.json'))
        );
    }

    if (type === BUILD_TYPES.V2) {
        streams.push(
            src('build/manifest/v2.json', { base: 'build/manifest' })
                .pipe(replace('{{TON_WALLET_VERSION}}', process.env.TON_WALLET_VERSION))
                .pipe(rename('manifest.json'))
        );
    }

    return parallel(...streams.map(stream => function copy() {
        return stream.pipe(dest(BUILD_DESTINATIONS[type]));
    }))(done);
};

const css = type => {
    return src('src/css/**/*.css')
        .pipe(cssmin())
        .pipe(dest(`${BUILD_DESTINATIONS[type]}/css`))
};

const js = (type, done) => {
    webpack({
        mode: 'none',
        entry: {
            Controller: './src/js/Controller.js',
            View: './src/js/view/View.js'
        },
        plugins: [new webpack.DefinePlugin({
            TONCENTER_API_KEY_WEB_MAIN: `'${process.env.TONCENTER_API_KEY_WEB_MAIN}'`,
            TONCENTER_API_KEY_WEB_TEST: `'${process.env.TONCENTER_API_KEY_WEB_TEST}'`,
            TONCENTER_API_KEY_EXT_MAIN: `'${process.env.TONCENTER_API_KEY_EXT_MAIN}'`,
            TONCENTER_API_KEY_EXT_TEST: `'${process.env.TONCENTER_API_KEY_EXT_TEST}'`
        })],
        optimization: {
            concatenateModules: true,
            minimize: true
        },
        output: {
            filename: '[name].js',
            path: path.resolve(process.cwd(), `./${BUILD_DESTINATIONS[type]}/js`)
        },
    }, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toJson().errors));

        done();
    });
};

const html = type => {
    let stream = src('src/index.html')
        .pipe(replace('{{TON_WALLET_VERSION}}', process.env.TON_WALLET_VERSION));

    if (type !== BUILD_TYPES.WEB) {
        stream = stream
            .pipe(replace('<body>', '<body class="plugin">'))
            .pipe(replace(/^.*<script.*src=".*Controller.js.*".*$(\r\n|\r|\n)/gm, ''));
    }

    return stream.pipe(dest(BUILD_DESTINATIONS[type]));
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

const taskName = process.argv[2];
if (!taskName || !TASKS.includes(taskName)) {
    console.error(`Pass one of possible task names: ${TASKS.join(', ')}`);
    process.exit(1);
}

const TARGETS = taskName === 'pack' ? PACK_TARGETS : BUILD_TARGETS;

const target = process.argv[GULP_RUN_ARGS_COUNT];
if (!target || TARGETS[target] === undefined) {
    console.error(`Pass one of possible target values: ${Object.keys(TARGETS).join(', ')}`);
    process.exit(1);
}

task('build', createSeries(BUILD_TARGETS[target]));

task('watch', watch.bind(null, ['build/**/*', 'src/**/*'], createSeries(BUILD_TARGETS[target])));
