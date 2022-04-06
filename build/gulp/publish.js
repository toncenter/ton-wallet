const ghpages = require('gh-pages');
const { TARGETS, TARGETS_BUILD_DESTS } = require('./config');

const publish = async (targetName, done) => {
    if (targetName !== TARGETS.WEB) {
        console.log(`Publish target "${targetName}" not available now`);
        return;
    }

    ghpages.publish(TARGETS_BUILD_DESTS[targetName], done);
};

module.exports = publish;
