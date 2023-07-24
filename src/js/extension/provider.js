// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#sample-class-implementation
(() => {
    class TonProvider {
        constructor() {
            this.listeners = window.ton ? window.ton.listeners : {};

            this.isTonWallet = true;
            this.targetOrigin = '*'; // todo

            // Init storage
            this._nextJsonRpcId = window.ton ? window.ton._nextJsonRpcId : 0;
            this._promises = window.ton ? window.ton._promises : {};
            // todo: take `listeners` from previous window.ton ?

            // Fire the connect
            this._connect();

            if (window.ton) window.ton._destroy();

            // Listen for jsonrpc responses
            this._onMessage = this._handleJsonRpcMessage.bind(this);
            window.addEventListener('message', this._onMessage);
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
            const payload = {
                jsonrpc,
                id,
                method,
                params,
                origin: window.origin
            };

            const promise = new Promise((resolve, reject) => {
                this._promises[payload.id] = {
                    resolve,
                    reject,
                };
            });

            // Send jsonrpc request to TON Wallet
            window.postMessage(
                {
                    type: 'gramWalletAPI_ton_provider_write',
                    message: payload,
                },
                this.targetOrigin,
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
            const {
                id,
                method,
                error,
                result,
            } = message;

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
                    } else if (method === 'ton_doMagic') {
                        const isTurnedOn = message.params;

                        if (!location.href.startsWith('https://web.telegram.org/z/')) {
                            if (location.href.startsWith('https://web.telegram.org/k/')) {
                                toggleMagicBadge(isTurnedOn);
                            }

                            return;
                        }

                        if (isTurnedOn) {
                            const scriptEl = document.querySelector('script[src^="main."]');
                            const localRevision = scriptEl.getAttribute('src');

                            const filesToInjectResponse = await fetch('https://ton.org/app/magic-sources.json?' + Date.now());
                            const filesToInject = await filesToInjectResponse.json();
                            const magicRevision = filesToInject.find(f => f.startsWith('main.') && f.endsWith('.js'));

                            const assetCache = await window.caches.open('tt-assets');
                            const cachedResponse = await assetCache.match(localRevision);
                            if (cachedResponse) {
                                const cachedText = await cachedResponse.text();
                                // we leverage the fact that the file has its name as part of the sourcemaps appendix
                                const isMagicInjected = cachedText?.endsWith(magicRevision + '.map');
                                if (isMagicInjected) {
                                    return;
                                }
                            }

                            addBadge('Loading <strong>TON magic</strong>...');

                            const responses = await Promise.all(filesToInject.map(async (fileName) => {
                                const res = await fetch('https://ton.org/app/' + fileName);

                                if (res.status !== 200) {
                                    throw new Error('[TON Wallet] Failed to load magic: ' + res.statusText + '. File: ' + fileName);
                                }

                                return [
                                    fileName,
                                    new Response(await res.blob(), {
                                        headers: res.headers,
                                        status: res.status,
                                        statusText: res.statusText,
                                    }),
                                ];
                            }));

                            await Promise.all(responses.map(async ([fileName, response]) => {
                                if (fileName.startsWith('main.')) {
                                    if (fileName.endsWith('.js')) {
                                        await assetCache.put('https://web.telegram.org/z/' + localRevision, response.clone());
                                    } else if (fileName.endsWith('.css')) {
                                        const linkEl = document.querySelector('link[rel=stylesheet]');
                                        const currentCssRevision = linkEl.getAttribute('href');
                                        await assetCache.put('https://web.telegram.org/z/' + currentCssRevision, response.clone());
                                    }
                                } else {
                                    await assetCache.put('https://web.telegram.org/z/' + fileName, response.clone());
                                }
                            }));

                            localStorage.setItem('ton:magicRevision', magicRevision);

                            await this.send('flushMemoryCache');
                            window.location.reload();
                        } else {
                            const prevMagicRevision = localStorage.getItem('ton:magicRevision');
                            if (!prevMagicRevision) {
                                return;
                            }

                            localStorage.removeItem('ton:magicRevision');
                            await window.caches.delete('tt-assets');

                            await this.send('flushMemoryCache');
                            window.location.reload();
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
                this.targetOrigin,
            );

            // Reconnect on close
            // this.once('close', this._connect.bind(this)); todo
        }

        _destroy() {
            window.removeEventListener('message', this._onMessage);
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
    };

    // TONCONNECT

    function tonConnectEventError(message, code) {
        return {
            event: 'connect_error',
            id: Date.now(),
            payload: {
                code: code,
                message: message
            }
        }
    }

    class TonConnectBridge {
        constructor(provider, prevBridge) {
            this.provider = provider;

            provider.on('chainChanged', () => {
                this.notify({
                    event: 'disconnect',
                    id: Date.now(),
                    payload: {}
                })
            });

            this.callbacks = prevBridge?.tonconnect ? prevBridge?.tonconnect.callbacks : [];

            this.deviceInfo = {
                platform: 'web',
                appName: 'TON Wallet',
                appVersion: '1.1.46',
                maxProtocolVersion: 2,
                features: [
                    'SendTransaction',
                    {
                        name: 'SendTransaction',
                        maxMessages: 1,
                    },
                ],
            };

            this.walletInfo = {
                name: 'TON Wallet',
                image: 'https://wallet.ton.org/assets/ui/qr-logo.png',
                about_url: 'https://wallet.ton.org',
            }

            this.protocolVersion = 2;
            this.isWalletBrowser = false;
        }

        async connect(protocolVersion, message) {
            if (protocolVersion > this.protocolVersion) {
                return this.notify(
                    tonConnectEventError('Unsupported protocol version', 1)
                );
            }

            try {
                const items = await this.provider.send(
                    'tonConnect_connect',
                    [message]
                );

                return this.notify({
                    event: 'connect',
                    id: Date.now(),
                    payload: {
                        items: items,
                        device: this.deviceInfo
                    }
                });
            } catch (e) {
                return this.notify(
                    tonConnectEventError(e?.message || 'Unknown error', 0)
                );
            }
        }

        async disconnect() {
            await this.provider.send('tonConnect_disconnect', []);
            return this.notify({
                event: 'disconnect',
                id: Date.now(),
                payload: {}
            })
        }

        async restoreConnection() {
            try {
                const items = await this.provider.send('tonConnect_reconnect', [{name: 'ton_addr'}]);

                return this.notify({
                    event: 'connect',
                    id: Date.now(),
                    payload: {
                        items: items,
                        device: this.deviceInfo
                    }
                })
            } catch (e) {
                return this.notify(
                    tonConnectEventError(e?.message || 'Unknown error', 0)
                );
            }
        }

        async send(message) {
            try {
                const result = await this.provider.send(
                    'tonConnect_' + message.method,
                    message.params.map(param => JSON.parse(param))
                );
                return {
                    result,
                    id: String(message.id)
                }
            } catch (e) {
                return {
                    error: {
                        message: e?.message || 'Unknown error',
                        code: 0 // unknown error
                    },
                    id: String(message.id)
                }
            }
        }

        listen(callback) {
            this.callbacks.push(callback);
            const callbacks = this.callbacks;
            return () => {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        }

        async notify(event) {
            this.callbacks.forEach(callback => callback(event));
            return event;
        }
    }

    // START

    const havePrevInstance = !!window.ton;
    window.tonProtocolVersion = 1;
    window.ton = new TonProvider();
    if (!havePrevInstance) window.dispatchEvent(new Event('tonready'));

    window.tonwallet = {
        provider: window.ton,
        tonconnect: new TonConnectBridge(window.ton, window.tonwallet)
    }

    function toggleMagicBadge(isTurnedOn) {
        if (isTurnedOn) {
            addBadge('Switch to <strong>Z version</strong> in the menu to take advantage of <strong>TON magic</strong>.');

            // handle shallow screen layout
            document.getElementById('column-left').style.top = '28px';
            document.getElementById('column-center').style.top = '28px';
        } else {
            const badge = document.getElementById('ton-magic-badge');
            if (badge) {
                badge.remove();
                document.getElementById('column-left').style.top = '';
                document.getElementById('column-center').style.top = '';
            }
        }
    }

    function addBadge(html) {
        const badge = document.createElement('div');
        badge.id = 'ton-magic-badge';
        badge.style.position = 'fixed';
        badge.style.zIndex = '999';
        badge.style.top = '0';
        badge.style.background = '#0072ab';
        badge.style.width = '100%';
        badge.style.height = '28px';
        badge.style.lineHeight = '28px';
        badge.style.textAlign = 'center';
        badge.style.fontSize = '14px';
        badge.style.color = 'white';
        badge.innerHTML = html;
        document.body.prepend(badge);
    }
})();
