const open = require('open');
const { TARGETS, START_WEB_PORT } = require('./config');
const startServer = require('./server');

const start = async targetName => {
    if (targetName === TARGETS.WEB) {
        await startServer(START_WEB_PORT, 'docs');
        await open(`http://localhost:${START_WEB_PORT}`);
    } else {
        console.log(`Start target "${targetName}" not available now`);
        return;
    }
};

module.exports = start;
