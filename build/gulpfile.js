const { series, task, watch } = require('gulp');
const { TARGETS, BUILD_DESTS, TARGETS_BUILD_DESTS, WATCH_GLOBS } = require('./gulp/config');
const { checkRequiredEnvVars, loadEnvFile } = require('./gulp/env');
const copy = require('./gulp/copy');
const css = require('./gulp/css');
const html = require('./gulp/html');
const manifest = require('./gulp/manifest');
const pack = require('./gulp/pack');
const publish = require('./gulp/publish');
const remove = require('./gulp/remove');
const script = require('./gulp/script');
const start = require('./gulp/start');

const taskName = process.argv[2];
const targetName = process.argv.pop();

const targetNames = ['all', ...Object.values(TARGETS)];
if (!targetName || !targetNames.includes(targetName)) {
    console.error(`Pass one of possible target names: "${targetNames.join('", "')}"`);
    process.exit(1);
}

loadEnvFile();
checkRequiredEnvVars(taskName, targetName);

const createBuildDestSeries = buildDest => {
    return series(
        remove.bind(null, buildDest),
        copy.bind(null, buildDest),
        css.bind(null, buildDest),
        script.bind(null, buildDest),
        html.bind(null, buildDest),
        manifest.bind(null, buildDest)
    );
};

let buildTasks;
let startTasks;
let packTasks;
let publishTasks;

if (targetName === 'all') {
    buildTasks = series(
        ...Object.values(BUILD_DESTS).map(buildDest => createBuildDestSeries(buildDest))
    );

    const targetsNames = Object.values(TARGETS);
    startTasks = series(...targetsNames.map(targetName => start.bind(null, targetName)));
    packTasks = series(...targetsNames.map(targetName => pack.bind(null, targetName)));
    publishTasks = series(...targetsNames.map(targetName => publish.bind(null, targetName)));
} else {
    buildTasks = createBuildDestSeries(TARGETS_BUILD_DESTS[targetName]);
    startTasks = start.bind(null, targetName);
    packTasks = pack.bind(null, targetName);
    publishTasks = publish.bind(null, targetName);
}

task('watch', watch.bind(null, WATCH_GLOBS, { ignoreInitial: false }, buildTasks));

task('start', series(buildTasks, startTasks, watch.bind(null, WATCH_GLOBS, buildTasks)));

task('build', buildTasks);

task('pack', series(buildTasks, packTasks));

task('publish', series(buildTasks, packTasks, publishTasks));
