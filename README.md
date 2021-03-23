# ton-wallet
https://tonwallet.me is a free, client-side interface helping you interact with the TON blockchain.

## Security
Private keys do not leave your device, the keys are stored in the browser memory, encrypted with a password that is entered during transaction generation. Backend (which is already open-source) will be switchable soon.

## Issues and Proposals
Please post your Issues and Proposals as Issues in this repository.

# Google Chrome Extension

Open Google Chrome

Go to chrome://extensions/

Enable "Developer Mode" in top right corner

Click "Load unpacked extension" and specify ton-wallet/client/src (or build/) folder

# Build

`npm install`

`npm install natives@1.1.6`

`gulp`

`npx webpack --mode=none`

