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

    async _handleJsonRpcMessage(event) {
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
                } else if (method === 'ton_doMagic') { // todo
                    if (message.params) {
                        const c = await window.caches.open('tt-assets')
                        const keys = await c.keys();

                        const script = document.getElementsByTagName('script')[0];
                        const scriptSrc = script.getAttribute('src');
                        if (!scriptSrc.startsWith('main.')) {
                            console.error('no main script in page');
                            return;
                        }

                        const js = {
                            "299.5368de7de76fe73abfb4.js": "559.3461e1a8d5b6c410e6a9.js",
                            "354.9a4e6e448a56ea8ff7d0.js": "354.849b154f5e9c94e3b4d4.js",
                            "501.72ce4b6e27f459e194cd.js": "501.77c55bf42a5199feef97.js",
                            "514.a976e4a406ffa64bcba8.js": "514.bcda96d4e97a0079f205.js",
                            "592.d7ca037ed9b7d1c6792a.js": "592.d1ab76a5cfe57cd3a899.js",
                            "60.9cf561ec3f818d41f458.js": "60.b504c2949c7aeaa1083b.js",
                            "915.8fb9f0f20311fa368dc5.js": "915.8fb9f0f20311fa368dc5.js",
                            "941.997469720d84a3a8a3f7.js": "941.997469720d84a3a8a3f7.js",
                            "main.548c93adccb98e6c3572.js": "main.fde42d1c6cf12616ac98.js",
                            "299.5368de7de76fe73abfb4.css": "559.3461e1a8d5b6c410e6a9.css",
                            "60.9cf561ec3f818d41f458.css": "60.9cf561ec3f818d41f458.css",
                            "main.edaf68285b3a3f5985dd.css": "main.886b59dfd026c686b97e.css",
                        }

                        for (const [key, value] of Object.entries(js)) {
                            const res = await fetch('https://ton.org/app/' + value);
                            console.log('Hack ' + key + ' -> ' + value, await res.clone().text());
                            const req = new Request('https://web.telegram.org/z/' + key);
                            await c.put(req, res.clone());
                        }

                        console.log('TON Magic On', {keys, scriptSrc});

                        // window.location.reload();
                    } else {
                        console.log('TON Magic Off');

                        await window.caches.delete('tt-assets');
                    }
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

console.log('TON Wallet Plugin is here')

window.ton = new TonProvider();