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

Install development dependencies:

```
npm install
```

Build required target:

```
npm run build {target}
```

For development needs, you can use watch script:

```
npm run watch {target}
```

Possible targets and bundle files destinations folder:
- `web` - ton-wallet/dist/web
- `chromium` - ton-wallet/dist/v3
- `firefox` - ton-wallet/dist/v2
- `safari` - ton-wallet/dist/v2

# Packing

Make preparations:
- for Chromium packing put extension secret key to ton-wallet/build/chromium.pem path
- for Firefox packing set Mozilla Addons credentials to environment variables (see `.env.example`)

Pack required target:

```
npm run pack {target}
```

Possible targets and bundle file destinations:
- `chromium` - ton-wallet/dist/ton-wallet-{TON_WALLET_VERSION}.crx
- `firefox` - ton-wallet/dist/ton-wallet-{TON_WALLET_VERSION}.xpi

TON_WALLET_VERSION - value from environment variable with same name

# Chromium-based browsers Extension Developer Mode

- Open web browser

- Go to `chrome://extensions/`

- Enable "Developer Mode" in top right corner

- Click "Load unpacked extension" and specify `ton-wallet/dist/v3` folder

# Mozilla Firefox Add-on Developer Mode

- Open Mozilla Firefox

- Go to `about:debugging#/runtime/this-firefox`

- Click "Load Temporary Add-on" and select `ton-wallet/dist/v2/manifest.json` file

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
