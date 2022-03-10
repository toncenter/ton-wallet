function injectScript() {
    try {
        const container = document.head || document.documentElement;
        const scriptTag = document.createElement('script');
        scriptTag.async = false;
        scriptTag.src = chrome.runtime.getURL('/js/extension/ton-provider.js');
        container.insertBefore(scriptTag, container.children[0]);
        container.removeChild(scriptTag);
    } catch (e) {
        console.error('ton-wallet provider injection failed.', e);
    }
}

injectScript(); // inject to dapp page

const port = chrome.runtime.connect({name: 'gramWalletContentScript'});
port.onMessage.addListener(function (msg) {
    // Receive msg from Controller.js and resend to dapp page
    self.postMessage(msg, '*'); // todo: origin
});

self.addEventListener('message', function (event) {
    if (event.data && (event.data.type === 'gramWalletAPI_ton_provider_write' || event.data.type === 'gramWalletAPI_ton_provider_connect')) {
        // Receive msg from dapp page and resend to Controller.js
        port.postMessage(event.data);
    }
});
