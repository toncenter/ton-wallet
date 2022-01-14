import '../pollyfill';
import { Store } from '@reduxjs/toolkit';
import { createStore, RootState } from 'store/store';
import { Unsubscribe } from 'redux';

let contentScriptPort: chrome.runtime.Port | null;
let popupPort: chrome.runtime.Port | null;
const queueToPopup: string[] = [];

class BackgroundController {
    private store: Store<RootState>;
    private currentState: RootState;
    private unsubscribe: Unsubscribe;

    constructor(_store: Store) {
        this.store = _store;
        this.currentState = this.store.getState();
        this.unsubscribe = this.subscribe();
    }

    setStore(newStore: Store<RootState>) {
        this.store = newStore;
        this.unsubscribe();
        this.unsubscribe = this.subscribe();
    }

    getStore() {
        return this.store;
    }

    subscribe() {
        return this.store.subscribe(() => {
            let prevState = this.currentState;
            this.currentState = this.store.getState();
            if (prevState.app.myAddress !== this.currentState.app.myAddress) {
                this.sendToDapp('ton_accounts', this.currentState.app.myAddress ? [this.currentState.app.myAddress] : []);
            }
            if (prevState.app.isMagic !== this.currentState.app.isMagic) {
                this.sendToDapp("ton_doMagic", this.currentState.app.isMagic);
            }
            if (prevState.app.isProxy !== this.currentState.app.isProxy) {
                //this.sendToDapp("ton_doProxy", this.currentState.app.isProxy);
            }
        });
    }

    public initDapp() {
        const myAddress = this.currentState.app.myAddress;
        this.sendToDapp('ton_accounts', myAddress ? [myAddress] : []);
        this.sendToDapp("ton_doMagic", this.currentState.app.isMagic);
        //this.sendToDapp("ton_doProxy", this.currentState.app.isProxy);
    }

    private sendToDapp(method: string, params: any) {
        if (contentScriptPort) {
            contentScriptPort.postMessage(JSON.stringify({
                type: 'gramWalletAPI',
                message: {jsonrpc: '2.0', method: method, params: params}
            }));
        }
    }
}

const controller = (window as any).controller = new BackgroundController(createStore());

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
            controller.initDapp()
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
