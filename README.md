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

