// https://github.com/motdotla/dotenv/blob/master/LICENSE

const fs = require('fs');
const path = require('path');

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;

const parse = src => {
    const obj = {};

    const lines = src.toString().replace(/\r\n?/mg, '\n');

    let match;
    while ((match = LINE.exec(lines)) != null) {
        let value = (match[2] || '').trim();

        const maybeQuote = value[0];

        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');

        if (maybeQuote === '"') {
            value = value.replace(/\\n/g, '\n');
            value = value.replace(/\\r/g, '\r');
        }

        obj[match[1]] = value;
    }

    return obj;
};

module.exports = requiredEnvironmentVariables => {
    const dotenvPath = path.resolve(process.cwd(), '.env');

    try {
        const parsed = parse(fs.readFileSync(dotenvPath, { encoding: 'utf8' }));
        Object.keys(parsed).forEach(key => process.env[key] = parsed[key]);
    } catch (e) {
        console.error(`Failed to load ${dotenvPath} ${e.message}`);
        process.exit(1);
    }

    let haveUnspecifiedEnvVars = false;

    requiredEnvironmentVariables.forEach(requiredEnvironmentVariable => {
        if (process.env[requiredEnvironmentVariable] !== undefined) return;

        haveUnspecifiedEnvVars = true;
        console.error(`Specify ${requiredEnvironmentVariable} environment variable`);
    });

    if (haveUnspecifiedEnvVars) process.exit(1);
};
