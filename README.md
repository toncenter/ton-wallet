# TON Web Wallet

TON Web Wallet is a free, client-side interface helping you interact with the TON blockchain.

Available on https://wallet.ton.org

## Security

Private keys do not leave your device, the keys are stored in the browser memory, encrypted with a password that is entered during transaction generation.

## Issues and Proposals

Please post your Issues and Proposals as Issues in this repository.

# Google Chrome Extension

https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd

# Build

Set required for build environment variables in shell or `.env` file in project root directory. See `.env.example` with required variables names and their description.

If need, update `version` field in `package.json` to increase version in output manifest.json files, source files and update anti-cache parameters values.

Install development dependencies:

```
npm install
```

Use `dev` task to build unminified bundles:

```
npm run dev {target}
```

Use `watch` task to autorebuild unminified bundles on sources change:

```
npm run watch {target}
```

Use `start` task to open target in web-browser and autorebuild unminified bundles on sources change (now support only `web` target):

```
npm run start {target}
```

Use `build` task to build minified bundles:

```
npm run build {target}
```

Possible targets and bundle files destinations folder:
- `web` - ton-wallet/docs
- `chromium` - ton-wallet/artifacts/v3
- `firefox` - ton-wallet/artifacts/v2
- `safari` - ton-wallet/artifacts/v2
- `all` - run all targets

# Packing

Use `pack` task to build minified bundles and prepare it to publuish-ready form:

```
npm run pack {target}
```

Possible targets and output files destinations:
- `chromium` - ton-wallet/artifacts/chromium-ton-wallet-{version}.zip
- `firefox` - ton-wallet/artifacts/firefox-ton-wallet-{version}.zip
- `safari` - build xcode project to ton-wallet/artifacts/safari
- `all` - run all targets

Where {version} - value from package.json "version" field

# Chromium-based browsers Extension Developer Mode

- Open web browser
- Go to `chrome://extensions/`
- Enable "Developer Mode" in top right corner
- Click "Load unpacked extension" and specify `ton-wallet/artifacts/v3` folder

# Mozilla Firefox Add-on Developer Mode

- Open Mozilla Firefox
- Go to `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on" and select `ton-wallet/artifacts/v2/manifest.json` file

# Safari Extension Developer Mode

- Install Xcode Command Line Tools
- Open Safari and choose Safari > Preferences
- Select the Advanced tab, then select the "Show Develop menu in menu bar" checkbox
- Choose Develop > Allow Unsigned Extensions (the Allow Unsigned Extensions setting is reset when a user quits Safari, you must set it again the next time Safari is launched)
- Pack extension for Safari by command `npm run pack safari`
- Extension will automatically added to Safari

# Switch between mainnet/testnet in Extension

- Required version 1.1.35+
- Click menu in right-top corner -> About
- Click on "Version:" with shift key pressed

The switch is hidden because ordinary users click all the switches without knowing what they are doing, we would like to protect them from accidentally switching the network.

# Code

## About Plain JS

We deliberately use plain js and do not use frameworks in web applications where there is direct access to the user's private keys.

We also try to use the minimum number of dependencies, and consciously include them as static files and not as npm packages.

We understand that this may not be fashionable.

We try to minimize the number of potential vulnerabilities, taking into account the design of npm modules with an infinite number of unknown sub-dependencies and the errors and vulnerabilities that periodically arise because of this.

We will clarify that this level of paranoia is only in relation to the code that has access to private keys. Using frameworks is OK if you are making an dapp that interacts with an extension.

## About 3 isolated areas

The division of the application into 3 isolated areas is due to the requirements of the Chrome Extension architecture.
