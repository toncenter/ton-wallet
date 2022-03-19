const { series, task, watch } = require('gulp');
const { RUN_ARGS_COUNT, TARGETS, BUILD_DESTS, TARGETS_BUILD_DESTS } = require('./gulp/config');
const { checkRequiredEnvVars, loadEnvFile } = require('./gulp/env');
const copy = require('./gulp/copy');
const css = require('./gulp/css');
const html = require('./gulp/html');
const manifest = require('./gulp/manifest');
const pack = require('./gulp/pack');
const remove = require('./gulp/remove');
const script = require('./gulp/script');

const taskName = process.argv[2];

const targetName = process.argv[RUN_ARGS_COUNT];
const targetNames = ['all', ...Object.values(TARGETS)]
if (!targetName || !targetNames.includes(targetName)) {
    console.error(`Pass one of possible target names: "${targetNames.join('", "')}"`);
    process.exit(1);
}

loadEnvFile();
checkRequiredEnvVars(taskName, targetName);

const createBuildDestSeries = (buildDest, needMinify) => {
    return series(
        remove.bind(null, buildDest),
        copy.bind(null, buildDest),
        css.bind(null, buildDest, needMinify),
        script.bind(null, buildDest, needMinify),
        html.bind(null, buildDest),
        manifest.bind(null, buildDest)
    );
};

const needMinify = (taskName !== 'dev' && taskName !== 'watch');

let buildTasks;
let packTasks;

if (targetName === 'all') {
    buildTasks = series(...Object.values(BUILD_DESTS).map(buildDest => {
        return createBuildDestSeries(buildDest, needMinify);
    }));

    packTasks = series(...Object.values(TARGETS).map(targetName => pack.bind(null, targetName)));
} else {
    buildTasks = createBuildDestSeries(TARGETS_BUILD_DESTS[targetName], needMinify);
    packTasks = pack.bind(null, targetName);
}

task('dev', buildTasks);

task('build', buildTasks);

task('watch', watch.bind(null, ['build/**/*', 'src/**/*'], buildTasks));

task('pack', series(buildTasks, packTasks));
