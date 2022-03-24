/**
 * Path to ".env" file relative to project root directory
 */
const DOTENV_PATH = '.env';

/**
 * Required for any task environment variables (see .env.example file in project root directory)
 * keys   - required environment variable name
 * values - task and target mask kind "{task_name}.{target_name}", any part of it or full mask
 *          may be replaced by "*" symbol which mean any of task, target or its combination
 */
 const REQUIRED_ENV_VARS = {
    'TONCENTER_API_KEY_WEB_MAIN': '*',
    'TONCENTER_API_KEY_WEB_TEST': '*',
    'TONCENTER_API_KEY_EXT_MAIN': '*',
    'TONCENTER_API_KEY_EXT_TEST': '*',
    'MOZILLA_ADDONS_API_KEY': 'publish.firefox',
    'MOZILLA_ADDONS_API_SECRET': 'publish.firefox',
    'MOZILLA_EXTENSION_ID': 'publish.firefox'
};

/**
 * Possible build targets identifiers to names map
 */
const TARGETS = {
    WEB: 'web',
    CHROMIUM: 'chromium',
    FIREFOX: 'firefox',
    SAFARI: 'safari'
};

/**
 * Possible build destinations identifiers to paths map
 * Different targets can match same destinations, for example,
 * FIREFOX and SAFARI require V2 build destination
 */
const BUILD_DESTS = {
    WEB: 'docs',
    V3: 'artifacts/v3',
    V2: 'artifacts/v2'
};

/**
 * Targets and build destinations conformity
 */
const TARGETS_BUILD_DESTS = {
    [TARGETS.WEB]: BUILD_DESTS.WEB,
    [TARGETS.CHROMIUM]: BUILD_DESTS.V3,
    [TARGETS.FIREFOX]: BUILD_DESTS.V2,
    [TARGETS.SAFARI]: BUILD_DESTS.V2
};

/**
 * Globs for watch task
 */
const WATCH_GLOBS = ['src/**/*'];

/**
 * Port for web wallet start task HTTP server
 */
const START_WEB_PORT = 8080;

module.exports = {
    DOTENV_PATH,
    REQUIRED_ENV_VARS,
    TARGETS,
    BUILD_DESTS,
    TARGETS_BUILD_DESTS,
    WATCH_GLOBS,
    START_WEB_PORT
};
