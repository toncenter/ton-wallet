const container = document.head || document.documentElement;
const scriptTag = document.createElement('script');
scriptTag.async = false;
scriptTag.src = chrome.runtime.getURL('/js/extension/provider.js');
container.insertBefore(scriptTag, container.children[0]);
container.removeChild(scriptTag);

const onPortMessage = data => {
    self.postMessage(data, '*'); // todo: origin
};

const onPageMessage = e => {
    if (!e.data) return;
    if (e.data.type !== 'gramWalletAPI_ton_provider_write' &&
        e.data.type !== 'gramWalletAPI_ton_provider_connect') return;

    sendMessageToActivePort(e.data);
};

const PORT_NAME = 'gramWalletContentScript'
let port = chrome.runtime.connect({ name: PORT_NAME });
port.onMessage.addListener(onPortMessage);

const sendMessageToActivePort = (payload, isRepeat = false) => {
    try {
        port.postMessage(payload);
    } catch (err) {
        const isInvalidated = err.message.toString().includes('Extension context invalidated');
        if (isInvalidated) {
            self.removeEventListener('message', onPageMessage);
            return;
        }

        const isDisconnected = err.message.toString().includes('disconnected port');

        if (!isRepeat && isDisconnected) {
            port = chrome.runtime.connect({name: PORT_NAME});
            port.onMessage.addListener(onPortMessage);
            sendMessageToActivePort(payload, true);
        } else {
            onPortMessage(JSON.stringify({
                type: 'gramWalletAPI',
                message: {
                    id: payload?.message?.id,
                    method: payload?.message?.method,
                    error: { message: err.message },
                    jsonrpc: true,
                }
            }));
        }
    }
}

self.addEventListener('message', onPageMessage);
