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
 * To pack Chromium extension put extension secret key to /build/chromium.pem path
 * This path added to .gitignore, so it's secure
 */
const CHROMIUM_SECRET_KEY_PATH = 'build/chromium.pem';

/**
 * Required for build environment variables, see .env.example in project root directory
 */
 const REQUIRED_ENVIRONMENT_VARIABLES = [
    'TON_WALLET_VERSION',
    'TONCENTER_API_KEY_WEB_MAIN',
    'TONCENTER_API_KEY_WEB_TEST',
    'TONCENTER_API_KEY_EXT_MAIN',
    'TONCENTER_API_KEY_EXT_TEST'
];

/**
 * Possible tasks names, used for validate user input
 */
const TASKS = ['dev', 'build', 'watch', 'pack'];

const TARGETS = {
    WEB: 0,
    CHROMIUM: 1,
    FIREFOX: 2,
    SAFARI: 3
};

const BUILD_TARGETS = {
    'web': TARGETS.WEB,
    'chromium': TARGETS.CHROMIUM,
    'firefox': TARGETS.FIREFOX,
    'safari': TARGETS.SAFARI
};

const PACK_TARGETS = {
    //'web': TARGETS.WEB,
    'chromium': TARGETS.CHROMIUM,
    'firefox': TARGETS.FIREFOX,
    'safari': TARGETS.SAFARI
};

const BUILD_TYPES = {
    WEB: 0,
    V3: 1,
    V2: 2
};

const BUILD_TYPES_DESTINATIONS = {
    [BUILD_TYPES.WEB]: 'docs',
    [BUILD_TYPES.V3]: 'dist/v3',
    [BUILD_TYPES.V2]: 'dist/v2'
};

const BUILD_TARGETS_TYPES = {
    [BUILD_TARGETS['web']]: BUILD_TYPES.WEB,
    [BUILD_TARGETS['chromium']]: BUILD_TYPES.V3,
    [BUILD_TARGETS['firefox']]: BUILD_TYPES.V2,
    [BUILD_TARGETS['safari']]: BUILD_TYPES.V2
};

require('./dotenv')(REQUIRED_ENVIRONMENT_VARIABLES);

const { existsSync, rmSync, rmdirSync } = require('fs');
const { dest, parallel, series, src, task, watch } = require('gulp');
const cssmin = require('gulp-cssmin');
const { resolve } = require('path');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const { spawn } = require('child_process');
const webpack = require('webpack');
const zip = require('gulp-zip');

const clean = (buildType, done) => {
    const path = BUILD_TYPES_DESTINATIONS[buildType];

    if (existsSync(path)) {
        if (rmSync) rmSync(BUILD_TYPES_DESTINATIONS[buildType], { recursive: true });
        else rmdirSync(BUILD_TYPES_DESTINATIONS[buildType], { recursive: true });
    }

    done();
};

const copy = (buildType, done) => {
    const streams = [src([
        'src/assets/lottie/**/*',
        'src/assets/ui/**/*',
        'src/libs/**/*'
    ], { base: 'src' })];

    if (buildType === BUILD_TYPES.WEB) {
        streams.push(src('src/assets/favicon/**/*', { base: 'src' }));
    } else {
        streams.push(src([
            'src/assets/extension/**/*',
            'src/js/extension/**/*'
        ], { base: 'src' }));
    }

    if (buildType === BUILD_TYPES.V3) {
        streams.push(
            src('build/manifest/v3.json', { base: 'build/manifest' })
                .pipe(replace('{{TON_WALLET_VERSION}}', process.env.TON_WALLET_VERSION))
                .pipe(rename('manifest.json'))
        );

        // Favicons need only for Chromium of all tested browsers, if other browser full migrate to
        // manifest v3, need create separate destination for Chromium with favicons, now v3 used
        // only for Chromium and its ok to add favicons to v3 destination
        streams.push(src([
            'src/assets/favicon/favicon.ico',
            'src/assets/favicon/favicon-32x32.png',
            'src/assets/favicon/favicon-16x16.png',
            'src/assets/favicon/192x192.png'
        ], { base: 'src' }));
    }

    if (buildType === BUILD_TYPES.V2) {
        streams.push(
            src('build/manifest/v2.json', { base: 'build/manifest' })
                .pipe(replace('{{TON_WALLET_VERSION}}', process.env.TON_WALLET_VERSION))
                .pipe(rename('manifest.json'))
        );
    }

    return parallel(...streams.map(stream => function copy() {
        return stream.pipe(dest(BUILD_TYPES_DESTINATIONS[buildType]));
    }))(done);
};

const css = (buildType, isMinify) => {
    const stream = src('src/css/**/*.css');
    if (isMinify) stream.pipe(cssmin());
    return stream.pipe(dest(`${BUILD_TYPES_DESTINATIONS[buildType]}/css`));
};

const js = (buildType, isMinify, done) => {
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
            minimize: isMinify
        },
        output: {
            filename: '[name].js',
            path: resolve(process.cwd(), `./${BUILD_TYPES_DESTINATIONS[buildType]}/js`)
        },
    }, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toJson().errors));

        done();
    });
};

const html = buildType => {
    let stream = src('src/index.html')
        .pipe(replace('{{TON_WALLET_VERSION}}', process.env.TON_WALLET_VERSION));

    if (buildType !== BUILD_TYPES.WEB) {
        stream = stream
            .pipe(replace('<body>', '<body class="plugin">'))
            .pipe(replace(/^.*<script.*src=".*Controller.js.*".*$(\r\n|\r|\n)/gm, ''));
    }

    return stream.pipe(dest(BUILD_TYPES_DESTINATIONS[buildType]));
};

const createBuildSeries = (buildType, isMinify) => {
    return series(
        clean.bind(null, buildType),
        copy.bind(null, buildType),
        css.bind(null, buildType, isMinify),
        js.bind(null, buildType, isMinify),
        html.bind(null, buildType)
    );
};

const pack = target => {
    if (target === TARGETS.SAFARI) {
        return new Promise((resolve, reject) => {
            if (process.platform !== 'darwin') {
                console.log("Pack target 'safari' available only on MacOS");
                return resolve();
            }

            const child = spawn(
                'xcodebuild', ['-project', 'build/safari/TON Wallet.xcodeproj'],
                { stdio: 'inherit' }
            );

            child.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`Child process fail with code ${code}`));
            });
        });
    } else {
        let targetName;
        if (target === TARGETS.CHROMIUM) targetName = 'chromium';
        if (target === TARGETS.FIREFOX) targetName = 'firefox';

        return src(`${BUILD_TYPES_DESTINATIONS[BUILD_TARGETS_TYPES[target]]}/**/*`)
            .pipe(zip(`${targetName}-ton-wallet-${process.env.TON_WALLET_VERSION}.zip`))
            .pipe(dest('dist'));
    }
};

/*
const publish = (target, done) => {
    if (target === TARGETS.CHROMIUM) {
        if (!existsSync(CHROMIUM_SECRET_KEY_PATH)) {
            console.warn(`Chromium secret key not exists by path ${CHROMIUM_SECRET_KEY_PATH}`);
            process.exit(1);
        }

        const crx = new ChromeExtension({
            privateKey: readFileSync(CHROMIUM_SECRET_KEY_PATH, 'utf8')
        });

        crx.load(resolve(process.cwd(), BUILD_TYPES_DESTINATIONS[BUILD_TARGETS_TYPES[target]]))
            .then(crx => crx.pack())
            .then(crxBuffer => {
                writeFileSync(`dist/ton-wallet-${process.env.TON_WALLET_VERSION}.crx`, crxBuffer);
                done();
            })
            .catch(err => {
                console.log(err);
                done(err);
            });
    }

    if (target === TARGETS.FIREFOX) {
        if (!process.env.MOZILLA_ADDONS_API_KEY ||
            !process.env.MOZILLA_ADDONS_API_SECRET ||
            !process.env.MOZILLA_EXTENSION_ID
        ) {
            console.warn(
                'Mozilla addons credentials and identifier not exists in environment variables'
            );
            process.exit(1);
        }

        webExt.cmd.sign({
            apiKey: process.env.MOZILLA_ADDONS_API_KEY,
            apiSecret: process.env.MOZILLA_ADDONS_API_SECRET,
            artifactsDir: 'dist',
            channel: 'listed',
            id: process.env.MOZILLA_EXTENSION_ID || null,
            sourceDir: BUILD_TYPES_DESTINATIONS[BUILD_TARGETS_TYPES[target]]
        })
            .then((signResult) => {
                unlinkSync('dist/v2/.web-extension-id');
                renameSync(
                    signResult.downloadedFiles.find(path => path.endsWith('.xpi')),
                    `dist/ton-wallet-${process.env.TON_WALLET_VERSION}.xpi`
                );

                done();
            })
            .catch(err => {
                console.log(err);
                done(err);
            });
    }
};
*/

const taskName = process.argv[2];
if (!taskName || !TASKS.includes(taskName)) {
    console.error(`Pass one of possible task names: ${TASKS.join(', ')}`);
    process.exit(1);
}

const targets = ['all', ...Object.keys(taskName === 'pack' ? PACK_TARGETS : BUILD_TARGETS)];
const target = process.argv[GULP_RUN_ARGS_COUNT];
if (!target || !targets.includes(target)) {
    console.error(`Pass one of possible target values: ${targets.join(', ')}`);
    process.exit(1);
}

const isMinify = (taskName !== 'dev' && taskName !== 'watch');

let buildTask;
let packTask;
if (target === 'all') {
    buildTask = series.apply(null, Object.values(BUILD_TYPES).reduce((tasks, buildType) => {
        tasks.push(createBuildSeries(buildType, isMinify));
        return tasks;
    }, []))
    packTask = series.apply(null, Object.values(PACK_TARGETS).reduce((tasks, target) => {
        tasks.push(pack.bind(null, target));
        return tasks;
    }, []))
} else {
    buildTask = createBuildSeries(BUILD_TARGETS_TYPES[BUILD_TARGETS[target]], isMinify);
    packTask = pack.bind(null, PACK_TARGETS[target]);
}

task('dev', buildTask);

task('build', buildTask);

task('watch', watch.bind(null, ['build/**/*', 'src/**/*'], buildTask));

task('pack', series(buildTask, packTask));
