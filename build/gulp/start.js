const open = require('open');
const { TARGETS, START_WEB_PORT } = require('./config');
const startServer = require('./server');

const start = async targetName => {
    if (targetName === TARGETS.WEB) {
        const port = +process.env.START_WEB_PORT || START_WEB_PORT;

        await startServer(port, 'docs');

        const address = `http://localhost:${port}`;
        console.log(`App available on ${address}`);
        await open(address);
    } else {
        console.log(`Start target "${targetName}" not available now`);
        return;
    }
};

module.exports = start;
