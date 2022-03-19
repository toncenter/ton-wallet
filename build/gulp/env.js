const { existsSync, readFileSync } = require('fs');
const { DOTENV_PATH, REQUIRED_ENV_VARS } = require('./config');

/**
 * RegExp for matching rows in ".env" file
 *
 * @example
 * # Comment
 * KEY1 = VALUE1 # Trim spaces around key and value
 * # Replace "\n" combination by newline symbol in value
 * KEY2 = First line\nSecond line
 * # Newline symbols inside quoted value (by any of ', " or ` quotes types)
 * KEY3 = "Multiline
 * quoted
 * value"
 */
const ROW_REGEXP =
    /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(('|"|`)(?:\\\3|(?!\3)[\s\S])*\3|[^#\n]+)?\s*(?:#.*)?$/gm;

/**
 * Read ".env" file in project root directory and set parsed rows to environment variables
 */
const loadEnvFile = () => {
    if (!existsSync(DOTENV_PATH)) return;

    const source = readFileSync(DOTENV_PATH, 'utf8').replace(/\r\n?/g, '\n');

    [...source.matchAll(ROW_REGEXP)].forEach(match => {
        let value = match[2];

        const maybeQuote = value[0];
        // If value was quoted, replace escaped quotes inside
        if (maybeQuote === "'" || maybeQuote === '"' || maybeQuote === '`') {
            value = value.replace(new RegExp('\\\\' + maybeQuote, 'g'), maybeQuote);
        }

        // Unquote value
        value = value.replace(/^(['"`])([\s\S]*)\1$/g, '$2');

        // Replace "\n" in value by newline symbol
        value = value.replace(/\\n/g, '\n');

        process.env[match[1]] = value;
    });
};

/**
 * Check passed environment variables names exists in shell environment
 *
 * @param {string} taskName
 * @param {string} targetName
 */
const checkRequiredEnvVars = (taskName, targetName) => {
    const requiredEnvVarsNames = [];

    // Filter required environment variables by passed task and target names
    Object.keys(REQUIRED_ENV_VARS).forEach(envVarName => {
        let mask = REQUIRED_ENV_VARS[envVarName];
        if (mask === '*') mask = '*.*';

        const [taskMask, targetMask] = mask.split('.');

        const taskMatch = taskMask === '*' || taskMask === taskName;
        const targetMatch = targetMask === '*' || targetName === 'all' || targetMask === targetName;

        if (!taskMatch || !targetMatch) return;

        requiredEnvVarsNames.push(envVarName);
    });

    let haveUnspecifiedEnvVars = false;

    requiredEnvVarsNames.forEach(envVarName => {
        if (process.env[envVarName]) return;

        console.error(`Specify "${envVarName}" environment variable`);
        haveUnspecifiedEnvVars = true;
    });

    if (haveUnspecifiedEnvVars) {
        console.error('See ".env.example" file in project root directory for more');
        process.exit(1);
    }
};

module.exports = {
    loadEnvFile,
    checkRequiredEnvVars
};
