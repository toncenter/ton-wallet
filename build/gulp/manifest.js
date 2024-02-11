const { writeFileSync } = require('fs');
const { BUILD_DESTS } = require('./config');
const { version } = require('../../package.json');

const matches = [
    'file://*/*',
    'http://*/*',
    'https://*/*'
];

/**
 * Manifest V2 content
 */
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
        matches,
        js: ['js/extension/content.js'],
        run_at: 'document_start',
        all_frames: true
    }],
    web_accessible_resources: ['js/extension/provider.js'],
    content_security_policy: "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https://nft.ton.diamonds/; connect-src https://toncenter.com/api/ https://testnet.toncenter.com/api/ https://stage.toncenter.com/api/ https://stage-testnet.toncenter.com/api/ https://ton.diamonds/api/wallet/diamond_nfts"
};

const manifest = async buildDest => {
    if (buildDest === BUILD_DESTS.WEB) return;

    const content = JSON.parse(JSON.stringify(base));

    // Changes to manifest V3
    if (buildDest === BUILD_DESTS.V3) {
        // Change manifest version
        content.manifest_version = 3;

        // New storage API permissions
        content.permissions.push('storage');
        // Permissions for content script and provider update
        // content.permissions.push('tabs', 'scripting');

        // Matches for content script and provider update
        content.host_permissions = matches;

        // Browser action field name change
        content.action = content.browser_action;
        delete(content.browser_action);

        // Background script field change
        const backgroundScript = content.background.scripts[0];
        content.background = { service_worker: backgroundScript };

        // Web accessible resources field change
        const webAccessibleResources = content.web_accessible_resources;
        content.web_accessible_resources = [{
            resources: webAccessibleResources,
            matches: matches
        }];

        // Extension page content security policy field change
        content.content_security_policy = { extension_pages: content.content_security_policy };
    }

    writeFileSync(`${buildDest}/manifest.json`, JSON.stringify(content, null, 4));
};

module.exports = manifest;
