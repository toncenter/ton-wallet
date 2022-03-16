function injectScript() {
    try {
        const container = document.head || document.documentElement;
        const scriptTag = document.createElement('script');
        scriptTag.async = false;
        scriptTag.src = chrome.runtime.getURL('/js/extension/tonProvider.js');
        container.insertBefore(scriptTag, container.children[0]);
        container.removeChild(scriptTag);
    } catch (e) {
        console.error('ton-wallet provider injection failed.', e);
    }
}

injectScript(); // inject to dapp page

/**
 * @param {any} msg
 */
function onPortMessage(msg) {
    // Receive msg from Controller.js and resend to dapp page
    self.postMessage(msg, '*'); // todo: origin
}

const PORT_NAME = 'gramWalletContentScript'
let port = chrome.runtime.connect({name: PORT_NAME});
port.onMessage.addListener(onPortMessage);

function sendMessageToActivePort(payload, isRepeat = false) {
    try {
        port.postMessage(payload);
    } catch (e) {
        if (!isRepeat && !!e && !!e.message && e.message.toString().indexOf('disconnected port') !== -1) {
            port.onMessage.removeListener(onPortMessage);
            port = chrome.runtime.connect({name: PORT_NAME});
            port.onMessage.addListener(onPortMessage);
            sendMessageToActivePort(payload, true);
        } else {
            console.log(`Fail send message to port`, e);
            const {message: {id,method}} = payload
            const response = {
                type: 'gramWalletAPI',
                message: {
                    id: id,
                    method: method,
                    error: (!!e && !!e.message) ? {message: e.message} : {message: JSON.stringify(e)},
                    jsonrpc: true,
                }
            }
            onPortMessage(JSON.stringify(response));
        }
    }
}


self.addEventListener('message', function (event) {
    if (event.data && (event.data.type === 'gramWalletAPI_ton_provider_write' || event.data.type === 'gramWalletAPI_ton_provider_connect')) {
        // Receive msg from dapp page and resend to Controller.js
        sendMessageToActivePort(event.data);
    }
});
