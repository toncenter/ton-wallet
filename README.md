# TON Web Wallet

TON Web Wallet is a free, client-side interface helping you interact with the TON blockchain.

Available on https://wallet.ton.org (earlier https://tonwallet.me).

## Security

Private keys do not leave your device, the keys are stored in the browser memory, encrypted with a password that is entered during transaction generation. 

## Issues and Proposals

Please post your Issues and Proposals as Issues in this repository.

# Google Chrome Extension

https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd

# Google Chrome Extension Developer Mode

- Open Google Chrome

- Go to chrome://extensions/

- Enable "Developer Mode" in top right corner

- Click "Load unpacked extension" and specify ton-wallet/build folder

# Build

`npm install`

`gulp`

`npx webpack --mode=none`

# Code

## About Plain JS

We deliberately use plain js and do not use frameworks in web applications where there is direct access to the user's private keys.

We also try to use the minimum number of dependencies, and consciously include them as static files and not as npm packages.

We understand that this may not be fashionable.

We try to minimize the number of potential vulnerabilities, taking into account the design of npm modules with an infinite number of unknown sub-dependencies and the errors and vulnerabilities that periodically arise because of this.

We will clarify that this level of paranoia is only in relation to the code that has access to private keys. Using frameworks is OK if you are making an dapp that interacts with an extension.

## About 3 isolated areas

The division of the application into 3 isolated areas is due to the requirements of the Chrome Extension architecture.
