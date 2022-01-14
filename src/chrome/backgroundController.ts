import '../pollyfill';
import { Store } from '@reduxjs/toolkit';
import { store, createStore } from 'store/store';

let contentScriptPort: chrome.runtime.Port | null;
let popupPort: chrome.runtime.Port | null;
const queueToPopup: string[] = [];

class BackgroundController {
    private _store: Store<ReturnType<typeof store.getState>>;

    constructor(_store: Store) {
        this._store = _store;
    }

    setStore(newStore: Store<ReturnType<typeof store.getState>>) {
        this._store = newStore;
    }

    getStore() {
        return this._store;
    }
}

const controller = (window as any).controller = new BackgroundController(store);

if (chrome.runtime && chrome.runtime.onConnect) {
    chrome.runtime.onConnect.addListener(port => {
        if (port.name === 'gramWalletContentScript') {
            contentScriptPort = port;
            contentScriptPort.onMessage.addListener(async msg => {
                if (!msg.message) return;
                const result = {} //await controller.onDappMessage(msg.message.method, msg.message.params);
                if (contentScriptPort) {
                    contentScriptPort.postMessage(JSON.stringify({
                        type: 'gramWalletAPI',
                        message: {jsonrpc: '2.0', id: msg.message.id, method: msg.message.method, result}
                    }));
                }
            });
            contentScriptPort.onDisconnect.addListener(() => {
                contentScriptPort = null;
            });
            //controller.initDapp()
        } else if (port.name === 'gramWalletPopup') {
            popupPort = port;
            popupPort.onMessage.addListener(function (msg) {
                //controller.onViewMessage(msg.method, msg.params);
            });
            popupPort.onDisconnect.addListener(() => {
                popupPort = null;
                // recreate store to remove subscriptions
                const state = controller.getStore().getState();
                controller.setStore(createStore(state));
            });
            //controller.initView()
            queueToPopup.forEach(msg => popupPort && popupPort.postMessage(msg));
            queueToPopup.length = 0;
        }
    });
}

export default controller;
