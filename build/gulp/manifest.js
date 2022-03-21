const { writeFileSync } = require('fs');
const { BUILD_DESTS } = require('./config');
const { version } = require('../../package.json');

const matchesAll = [
    'file://*/*',
    'http://*/*',
    'https://*/*'
];

const base = {
    manifest_version: 2,
    version,
    name: 'TON Wallet',
    description: 'Set up your own TON Wallet on The Open Network',
    icons: {
      16: 'assets/extension/icon-16.png',
      19: 'assets/extension/icon-19.png',
      24: 'assets/extension/icon-24.png',
      32: 'assets/extension/icon-32.png',
      38: 'assets/extension/icon-38.png',
      48: 'assets/extension/icon-48.png',
      64: 'assets/extension/icon-64.png',
      96: 'assets/extension/icon-96.png',
      128: 'assets/extension/icon-128.png',
      256: 'assets/extension/icon-256.png',
      512: 'assets/extension/icon-512.png'
    },
    permissions: ['webRequest'],
    browser_action: {
        default_title: 'TON Wallet'
    },
    background: {
        scripts: ['js/extension/background.js'],
        persistent: true
    },
    content_scripts: [{
        matches: matchesAll,
        js: ['js/extension/content.js'],
        run_at: 'document_start',
        all_frames: true
    }],
    web_accessible_resources: ['js/extension/provider.js'],
    content_security_policy: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https://toncenter.com/api/v2/jsonRPC https://testnet.toncenter.com/api/v2/jsonRPC"
};

const manifest = async buildDest => {
    if (buildDest === BUILD_DESTS.WEB) return;

    const content = JSON.parse(JSON.stringify(base));

    if (buildDest === BUILD_DESTS.V3) {
        content.manifest_version = 3;

        content.permissions.push('tabs', 'storage', 'scripting');

        content.host_permissions = matchesAll;

        content.action = content.browser_action;
        delete(content.browser_action);

        const backgroundScript = content.background.scripts[0];
        content.background = { service_worker: backgroundScript };

        const webAccessibleResources = content.web_accessible_resources;
        content.web_accessible_resources = [{
            resources: webAccessibleResources,
            matches: matchesAll
        }];

        content.content_security_policy = { extension_pages: content.content_security_policy };
    }

    writeFileSync(`${buildDest}/manifest.json`, JSON.stringify(content, null, 4));
};

module.exports = manifest;
