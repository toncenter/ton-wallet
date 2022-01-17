import '../pollyfill';
import { Store } from '@reduxjs/toolkit';
import { Unsubscribe } from 'redux';
import * as TonWeb from 'tonweb';

import { createStore, RootState } from 'store/store';
import { selectIsLedger, selectPopupState, setPopup } from 'store/app/appSlice';
import { PopupEnum } from 'enums/popupEnum';

let contentScriptPort: chrome.runtime.Port | null;
let popupPort: chrome.runtime.Port | null;

class BackgroundController {
    private store: Store<RootState>;
    private currentState: RootState;
    private unsubscribe: Unsubscribe;
    private lastPopup?: chrome.windows.Window;

    constructor(_store: Store) {
        this.store = _store;
        this.currentState = this.store.getState();
        this.unsubscribe = this.subscribe();
        chrome.windows.onRemoved.addListener((windowId) => {
            if (this.lastPopup && this.lastPopup.id === windowId) {
                this.lastPopup = undefined;
            }
        });
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
            const prevState = this.currentState;
            this.currentState = this.store.getState();
            if (prevState.app.myAddress !== this.currentState.app.myAddress) {
                this.sendToDapp(
                    'ton_accounts',
                    this.currentState.app.myAddress ? [this.currentState.app.myAddress] : [],
                );
            }
            if (prevState.app.isMagic !== this.currentState.app.isMagic) {
                this.sendToDapp('ton_doMagic', this.currentState.app.isMagic);
            }
            if (prevState.app.isProxy !== this.currentState.app.isProxy) {
                //this.sendToDapp("ton_doProxy", this.currentState.app.isProxy);
            }
        });
    }

    public initDapp() {
        const myAddress = this.currentState.app.myAddress;
        this.sendToDapp('ton_accounts', myAddress ? [myAddress] : []);
        this.sendToDapp('ton_doMagic', this.currentState.app.isMagic);
        //this.sendToDapp("ton_doProxy", this.currentState.app.isProxy);
    }

    async onDappMessage(method: string, params: any) {
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1102.md
        switch (method) {
            case 'ton_requestAccounts':
                const myAddress = this.currentState.app.myAddress;
                return myAddress ? [myAddress] : [];
            case 'ton_getBalance':
                const balance = this.currentState.app.balance;
                return balance ? balance : '';
            case 'ton_sendTransaction':
                const param = params[0];
                await this.showExtensionPopup();
                if (param.dataType === 'hex') {
                    param.data = TonWeb.utils.hexToBytes(param.data);
                } else if (param.dataType === 'base64') {
                    param.data = TonWeb.utils.base64ToBytes(param.data);
                } else if (param.dataType === 'boc') {
                    param.data = TonWeb.boc.Cell.fromBoc(TonWeb.utils.base64ToBytes(param.data))[0];
                }
                this.store.dispatch(
                    setPopup({
                        popup: PopupEnum.sendConfirm,
                        state: {
                            amount: param.value,
                            address: param.to,
                            comment: param.data,
                        },
                    }),
                );
                return true;
            case 'ton_rawSign':
                const signParam = params[0];
                await this.showExtensionPopup();
                return this.handleRawSign(signParam);
            case 'flushMemoryCache':
                await chrome.webRequest.handlerBehaviorChanged();
                return true;
        }
    }

    private sendToDapp(method: string, params: any) {
        if (contentScriptPort) {
            contentScriptPort.postMessage(
                JSON.stringify({
                    type: 'gramWalletAPI',
                    message: { jsonrpc: '2.0', method: method, params: params },
                }),
            );
        }
    }

    private async showExtensionPopup() {
        return new Promise((resolve) => {
            if (popupPort) {
                if (this.lastPopup) {
                    chrome.windows.update(this.lastPopup.id as number, { focused: true }, () => {
                        resolve(true);
                    });
                    return;
                }
                return resolve(true);
            }
            chrome.windows.create(
                {
                    url: 'index.html',
                    type: 'popup',
                    width: 415,
                    height: 630,
                    top: 0,
                    left: window.screen.width - 415,
                },
                (window) => {
                    this.lastPopup = window;
                    resolve(true);
                },
            );
        });
    }

    private handleRawSign(signParam: { data: string }) {
        return new Promise((resolve, reject) => {
            if (selectIsLedger(this.store.getState())) {
                alert('sign not supported by Ledger');
                return reject();
            }
            this.store.dispatch(
                setPopup({
                    popup: PopupEnum.signConfirm,
                    state: {
                        hexToSign: signParam.data,
                    },
                }),
            );
            let currentSignature = selectPopupState(this.store.getState()).signature;
            const unsub = this.store.subscribe(() => {
                const prevSignature = currentSignature;
                currentSignature = selectPopupState(this.store.getState()).signature;
                if (currentSignature !== prevSignature) {
                    unsub();
                    if (currentSignature.successed) {
                        return resolve(currentSignature.value);
                    }
                    return reject();
                }
            });
        });
    }
}

const controller = ((window as any).controller = new BackgroundController(createStore()));

if (chrome.runtime && chrome.runtime.onConnect) {
    chrome.runtime.onConnect.addListener((port) => {
        if (port.name === 'gramWalletContentScript') {
            contentScriptPort = port;
            contentScriptPort.onMessage.addListener(async (msg) => {
                if (!msg.message) return;
                const result = await controller.onDappMessage(msg.message.method, msg.message.params);
                if (contentScriptPort) {
                    contentScriptPort.postMessage(
                        JSON.stringify({
                            type: 'gramWalletAPI',
                            message: { jsonrpc: '2.0', id: msg.message.id, method: msg.message.method, result },
                        }),
                    );
                }
            });
            contentScriptPort.onDisconnect.addListener(() => {
                contentScriptPort = null;
            });
            controller.initDapp();
        } else if (port.name === 'gramWalletPopup') {
            popupPort = port;
            popupPort.onDisconnect.addListener(() => {
                popupPort = null;
                // recreate store to remove subscriptions
                const state = Object.assign({}, controller.getStore().getState());
                controller.setStore(createStore(state));
            });
        }
    });
}

export default controller;
