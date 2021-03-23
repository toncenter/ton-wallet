// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#sample-class-implementation
class TonProvider {
    constructor() {
        this.listeners = {};

        this.isTonWallet = true;
        this.targetOrigin = '*'; // todo

        // Init storage
        this._nextJsonRpcId = 0;
        this._promises = {};

        // Fire the connect
        this._connect();

        // Listen for jsonrpc responses
        window.addEventListener('message', this._handleJsonRpcMessage.bind(this));
    }

    /* EventEmitter */

    on(method, listener) {
        let methodListeners = this.listeners[method];
        if (!methodListeners) {
            methodListeners = [];
            this.listeners[method] = methodListeners;
        }
        if (methodListeners.indexOf(listener) === -1) {
            methodListeners.push(listener);
        }
        return this;
    }

    removeListener(method, listener) {
        const methodListeners = this.listeners[method];
        if (!methodListeners) return;
        const index = methodListeners.indexOf(listener);
        if (index > -1) {
            methodListeners.splice(index, 1);
        }
    }

    emit(method, ...args) {
        const methodListeners = this.listeners[method];
        if (!methodListeners || !methodListeners.length) return false;
        methodListeners.forEach(listener => listener(...args));
        return true;
    }

    /* Methods */

    send(method, params = []) {
        if (!method || typeof method !== 'string') {
            return new Error('Method is not a valid string.');
        }

        if (!(params instanceof Array)) {
            return new Error('Params is not a valid array.');
        }

        const id = this._nextJsonRpcId++;
        const jsonrpc = '2.0';
        const payload = {jsonrpc, id, method, params};

        const promise = new Promise((resolve, reject) => {
            this._promises[payload.id] = {resolve, reject};
        });

        // Send jsonrpc request to TON Wallet
        window.postMessage(
            {type: 'gramWalletAPI_ton_provider_write', message: payload},
            this.targetOrigin
        );

        return promise;
    }

    /* Internal methods */

    _handleJsonRpcMessage(event) {
        // Return if no data to parse
        if (!event || !event.data) {
            return;
        }

        let data;
        try {
            data = JSON.parse(event.data);
        } catch (error) {
            // Return if we can't parse a valid object
            return;
        }

        if (data.type !== 'gramWalletAPI') return;

        // Return if not a jsonrpc response
        if (!data || !data.message || !data.message.jsonrpc) {
            return;
        }

        const message = data.message;
        const {id, method, error, result} = message;

        if (typeof id !== 'undefined') {
            const promise = this._promises[id];
            if (promise) {
                // Handle pending promise
                if (data.type === 'error') {
                    promise.reject(message);
                } else if (message.error) {
                    promise.reject(error);
                } else {
                    promise.resolve(result);
                }
                delete this._promises[id];
            }
        } else {
            if (method) {
                if (method.indexOf('_subscription') > -1) {
                    // Emit subscription notification
                    this._emitNotification(message.params);
                } else if (method === 'ton_accounts') { // todo
                    this._emitAccountsChanged(message.params);
                }
            }
        }
    }

    /* Connection handling */

    _connect() {
        // Send to TON Wallet
        window.postMessage(
            {type: 'gramWalletAPI_ton_provider_connect'},
            this.targetOrigin
        );

        // Reconnect on close
        // this.once('close', this._connect.bind(this)); todo
    }

    /* Events */

    _emitNotification(result) {
        this.emit('notification', result);
    }

    _emitConnect() {
        this.emit('connect');
    }

    _emitClose(code, reason) {
        this.emit('close', code, reason);
    }

    _emitChainChanged(chainId) {
        this.emit('chainChanged', chainId);
    }

    _emitAccountsChanged(accounts) {
        this.emit('accountsChanged', accounts);
    }
}

window.ton = new TonProvider();