import storage from './util/storage.js';
import {decryptMessageComment, encryptMessageComment, makeSnakeCells} from "./util/encryption.js";

const TONCONNECT_MAINNET = '-239';
const TONCONNECT_TESTNET = '-3';

let extensionWindowId = -1;
let contentScriptPorts = new Set();
let popupPort = null;
const queueToPopup = [];

/**
 * @type {Promise<void> | null}
 */
let dAppPromise = null;

const createDappPromise = () => {
    if (dAppPromise) dAppPromise.resolve(false);

    let resolve;
    let reject;

    dAppPromise = new Promise((localResolve, localReject) => {
        resolve = localResolve;
        reject = localReject;
    });

    dAppPromise.resolve = (...args) => {
        resolve(...args);
        dAppPromise = null;
    };
    dAppPromise.reject = (...args) => {
        reject(...args);
        dAppPromise = null;
    };
};

const showExtensionWindow = () => {
    return new Promise(async resolve => {
        if (extensionWindowId > -1) {
            chrome.windows.update(extensionWindowId, {focused: true});
            return resolve();
        }

        const windowState = (await storage.getItem('windowState')) || {};

        windowState.top = windowState.top || 0;
        windowState.left = windowState.left || 0;
        windowState.height = windowState.height || 800;
        windowState.width = windowState.width || 480;

        chrome.windows.create(Object.assign(windowState, {
            url: 'index.html',
            type: 'popup',
            focused: true
        }), window => {
            extensionWindowId = window.id;
            resolve();
        });
    });
};

const BN = TonWeb.utils.BN;
const nacl = TonWeb.utils.nacl;
const Address = TonWeb.utils.Address;
const formatNanograms = TonWeb.utils.fromNano;

// ENCRYPTION

/**
 * @param plaintext {string}
 * @param password {string}
 * @return {Promise<string>}
 */
async function encrypt(plaintext, password) {
    const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

    const iv = crypto.getRandomValues(new Uint8Array(12));                             // get 96-bit random iv

    const alg = {name: 'AES-GCM', iv: iv};                                           // specify algorithm to use

    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']); // generate key from pw

    const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
    const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);                   // encrypt plaintext using key

    const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
    const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
    const ctBase64 = btoa(ctStr);                                                      // encode ciphertext as base64

    const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join(''); // iv as hex string

    return ivHex + ctBase64;                                                             // return iv+ciphertext
}

/**
 * @param ciphertext {string}
 * @param password {string}
 * @return {Promise<string>}
 */
async function decrypt(ciphertext, password) {
    const pwUtf8 = new TextEncoder().encode(password);                                  // encode password as UTF-8
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                       // hash the password

    const iv = ciphertext.slice(0, 24).match(/.{2}/g).map(byte => parseInt(byte, 16));   // get iv from ciphertext

    const alg = {name: 'AES-GCM', iv: new Uint8Array(iv)};                            // specify algorithm to use

    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);  // use pw to generate key

    const ctStr = atob(ciphertext.slice(24));                                           // decode base64 ciphertext
    const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
    // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

    const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8);                 // decrypt ciphertext using key
    const plaintext = new TextDecoder().decode(plainBuffer);                            // decode password from UTF-8

    return plaintext;                                                                   // return the plaintext
}

// CONTROLLER

const IS_EXTENSION = !!(self.chrome && chrome.runtime && chrome.runtime.onConnect);

const ACCOUNT_NUMBER = 0;

const DEFAULT_WALLET_VERSION = 'v3R2';
const DEFAULT_LEDGER_WALLET_VERSION = 'v3R1';

class Controller {
    constructor() {
        /** @type {boolean} */
        this.isTestnet = false;
        /** @type {boolean} */
        this.isDebug = false;
        /** @type {string} */
        this.myAddress = null;
        /** @type {string} */
        this.publicKeyHex = null;
        /** @type {string[]} */
        this.myMnemonicWords = null;
        /** @type   {BN | null} */
        this.balance = null;
        /** @type {WalletContract} */
        this.walletContract = null;
        this.transactions = [];
        /** @type {number} */
        this.updateIntervalId = 0;

        /** @type {null | {totalAmount: BN, bodyHashBase64: string }} */
        this.sendingData = null;

        /** @type {boolean} */
        this.processingVisible = false;

        this.ledgerApp = null;
        /** @type {boolean} */
        this.isLedger = false;

        /** @type {(words: string[]) => Promise<void> | null} */
        this.afterEnterPassword = null;

        if (self.view) {
            self.view.controller = this;
        }

        this.pendingMessageResolvers = new Map();
        this._lastMsgId = 1;

        if (IS_EXTENSION) {
            setInterval(() => storage.setItem('__time', Date.now()), 5 * 1000);
        }

        this.whenReady = this._init();
    }

    debug(...args) {
        if (!this.isDebug) return;
        console.log(...args);
    }

    /**
     * @param words {string[]}
     * @return {Promise<string>} base64
     */
    static async wordsToPrivateKey(words) {
        const keyPair = await TonWeb.mnemonic.mnemonicToKeyPair(words);
        return TonWeb.utils.bytesToBase64(keyPair.secretKey.slice(0, 32));
    }

    /**
     * @param words {string[]}
     * @param password  {string}
     * @return {Promise<void>}
     */
    static async saveWords(words, password) {
        await storage.setItem('words', await encrypt(words.join(','), password));
    }

    /**
     * @param password  {string}
     * @return {Promise<string[]>}
     */
    static async loadWords(password) {
        return (await decrypt(await storage.getItem('words'), password)).split(',');
    }

    /**
     * @return {Promise<{seqno: number | null, balance: any}>}
     */
    async getMyWalletInfo() {
        return this.ton.provider.getWalletInfo(this.myAddress);
    }

    /**
     * @return {boolean}
     */
    checkContractInitialized(getWalletResponse) {
        return getWalletResponse.account_state === "active";
    }

    /**
     * @return {BN} in nanotons
     */
    getBalance(getWalletResponse) {
        return new BN(getWalletResponse.balance);
    }

    async _init() {
        return new Promise(async (resolve) => {
            await storage.removeItem('pwdHash');

            this.isTestnet = IS_EXTENSION ? (await storage.getItem('isTestnet')) : (self.location.href.indexOf('testnet') > -1);
            this.isDebug = IS_EXTENSION ? (await storage.getItem('isDebug')) : (self.location.href.indexOf('debug') > -1);

            const mainnetRpc = 'https://toncenter.com/api/v2/jsonRPC';
            const testnetRpc = 'https://testnet.toncenter.com/api/v2/jsonRPC';

            const apiKey = this.isTestnet
                ? TONCENTER_API_KEY_WEB_TEST
                : TONCENTER_API_KEY_WEB_MAIN;
            const extensionApiKey = this.isTestnet
                ? TONCENTER_API_KEY_EXT_TEST
                : TONCENTER_API_KEY_EXT_MAIN;

            if (IS_EXTENSION && !(await storage.getItem('address'))) {
                await this._restoreDeprecatedStorage();
            }

            this.ton = new TonWeb(new TonWeb.HttpProvider(this.isTestnet ? testnetRpc : mainnetRpc, {apiKey: IS_EXTENSION ? extensionApiKey : apiKey}));
            this.myAddress = await storage.getItem('address');
            this.publicKeyHex = await storage.getItem('publicKey');

            if (!this.myAddress || !(await storage.getItem('words'))) {
                await storage.clear();
                this.sendToView('showScreen', {name: 'start', noAnimation: true});
            } else {
                if ((await storage.getItem('isLedger')) === 'true') {
                    this.isLedger = true;
                    this.sendToView('setIsLedger', this.isLedger);
                }

                await this.showMain();
            }
            this.sendToView('setIsTestnet', this.isTestnet);

            resolve();
        });
    }

    async _restoreDeprecatedStorage() {
        const {
            address, words, walletVersion, magic, proxy,
        } = await this.sendToView('restoreDeprecatedStorage', undefined, true, true);

        if (!address || !words) {
            return;
        }

        await Promise.all([
            storage.setItem('address', address),
            storage.setItem('words', words),
            storage.setItem('walletVersion', walletVersion),
            storage.setItem('magic', magic),
            storage.setItem('proxy', proxy),
        ]);
    }

    async toggleTestnet() {
        this.isTestnet = !this.isTestnet;
        if (this.isTestnet) {
            await storage.setItem('isTestnet', 'true');
        } else {
            await storage.removeItem('isTestnet');
        }
        this.clearVars();
        await this._init();
        await this.sendToView('setIsTestnet', this.isTestnet);
    }

    async toggleDebug() {
        this.isDebug = !this.isDebug;
        if (this.isDebug) {
            await storage.setItem('isDebug', 'true');
        } else {
            await storage.removeItem('isDebug');
        }
    }

    /**
     * @param limit? {number}
     * @return {Promise<any[]>} transactions
     */
    async getTransactions(limit = 10) {

        /**
         * @param msg   {any} raw.message
         * @return {string}
         */
        function getComment(msg) {
            if (!msg.msg_data) return '';
            if (msg.msg_data['@type'] !== 'msg.dataText') return '';
            const base64 = msg.msg_data.text;
            return new TextDecoder().decode(TonWeb.utils.base64ToBytes(base64));
        }

        /**
         * @param msg {any} raw.message
         * @return {string} '' or base64
         */
        function getEncryptedComment(msg) {
            if (!msg.msg_data) return '';
            if (msg.msg_data['@type'] !== 'msg.dataEncryptedText') return '';
            const base64 = msg.msg_data.text;
            return base64;
        }

        const arr = [];
        const transactions = await this.ton.getTransactions(this.myAddress, limit); // raw.transaction[]
        for (const t of transactions) {
            let amount = new BN(t.in_msg.value);
            for (const outMsg of t.out_msgs) {
                amount = amount.sub(new BN(outMsg.value));
            }
            //amount = amount.sub(new BN(t.fee));

            let from_addr = "";
            let to_addr = "";
            let comment = "";
            let encryptedComment = "";
            let inbound = false;

            if (t.in_msg.source) { // internal message with Toncoins, set source
                inbound = true;
                from_addr = t.in_msg.source;
                to_addr = t.in_msg.destination;
                comment = getComment(t.in_msg);
                encryptedComment = getEncryptedComment(t.in_msg);
            } else if (t.out_msgs.length) { // external message, we sending Toncoins
                inbound = false;
                from_addr = t.out_msgs[0].source;
                to_addr = t.out_msgs[0].destination;
                comment = getComment(t.out_msgs[0]);
                encryptedComment = getEncryptedComment(t.out_msgs[0]);
                //TODO support many out messages. We need to show separate outgoing payment for each? How to show fees?
            } else {
                // Deploying wallet contract onchain
            }

            if (to_addr) {
                arr.push({
                    bodyHashBase64: t.in_msg.body_hash,
                    inbound,
                    hash: t.transaction_id.hash,
                    amount: amount.toString(),
                    from_addr: from_addr,
                    to_addr: to_addr,
                    fee: t.fee.toString(),
                    storageFee: t.storage_fee.toString(),
                    otherFee: t.other_fee.toString(),
                    comment: comment,
                    encryptedComment: encryptedComment,
                    date: t.utime * 1000
                });
            }
        }
        return arr;
    }

    /**
     * @param request {{expireAt?: number, messages: [{amount: BN, toAddress: string, comment?: string | Uint8Array | Cell, needEncryptComment: boolean, stateInit?: Cell}]}}
     * @param keyPair    {nacl.KeyPair | null} null if estimates fee, keyPair if real sending
     * @return Promise<{{send: () => Promise<*>, getQuery: () => Promise<Cell>, estimateFee: () => Promise<*>}}> transfer object
     */
    async sign(request, keyPair) {
        const walletInfo = await this.getMyWalletInfo();

        /** @type {number} */
        const seqno = walletInfo.seqno || 0;

        /** @type {Uint8Array | null} */
        const secretKey = keyPair ? keyPair.secretKey : null;

        return this.walletContract.methods.transfers({
            secretKey: secretKey,
            seqno: seqno,
            expireAt: request.expireAt,
            messages: request.messages.map(message => {
                return {
                    toAddress: message.toAddress,
                    amount: message.amount,
                    payload: message.comment,
                    sendMode: 3,
                    stateInit: message.stateInit
                }
            })
        });
    }

    // CREATE WALLET

    async showCreated() {
        this.sendToView('showScreen', {name: 'created'});
        this.sendToView('disableCreated', true);
        this.myMnemonicWords = await TonWeb.mnemonic.generateMnemonic();
        const privateKey = await Controller.wordsToPrivateKey(this.myMnemonicWords);
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        const walletVersion = DEFAULT_WALLET_VERSION;
        const WalletClass = this.ton.wallet.all[walletVersion];
        this.walletContract = new WalletClass(this.ton.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        this.myAddress = (await this.walletContract.getAddress()).toString(true, true, true);
        this.publicKeyHex = TonWeb.utils.bytesToHex(keyPair.publicKey);
        await storage.setItem('publicKey', this.publicKeyHex);
        await storage.setItem('walletVersion', walletVersion);
        this.sendToView('disableCreated', false);
    }

    async createPrivateKey() {
        this.showBackup(this.myMnemonicWords, true);
    }

    // BACKUP WALLET

    onBackupWalletClick() {
        this.afterEnterPassword = async mnemonicWords => {
            this.showBackup(mnemonicWords);
        };
        this.sendToView('showPopup', {name: 'enterPassword'});
    }

    showBackup(words, isFirst) {
        this.sendToView('showScreen', {name: 'backup', words, isFirst});
    }

    async onBackupDone() {
        if (await storage.getItem('words')) {
            this.sendToView('showScreen', {name: 'main'});
        } else {
            this.sendToView('showScreen', {name: 'wordsConfirm', words: this.myMnemonicWords});
        }
    }

    onConfirmDone(words) {
        if (words) {
            let isValid = true;

            Object.keys(words).forEach(index => {
                if (this.myMnemonicWords[index] !== words[index]) {
                    isValid = false;
                }
            });

            if (!isValid) {
                return;
            }

            this.showCreatePassword();
        }
    }

    // IMPORT LEDGER

    async createLedger(transportType) {
        let transport;

        switch (transportType) {
            case 'hid':
                transport = await TonWeb.ledger.TransportWebHID.create();
                break;
            case 'ble':
                transport = await TonWeb.ledger.BluetoothTransport.create();
                break;
            default:
                throw new Error('unknown transportType' + transportType);
        }

        transport.setDebugMode(true);
        this.isLedger = true;
        this.ledgerApp = new TonWeb.ledger.AppTon(transport, this.ton);
        const ledgerVersion = (await this.ledgerApp.getAppConfiguration()).version;
        this.debug('ledgerAppConfig=', ledgerVersion);
        if (!ledgerVersion.startsWith('2')) {
            alert('Please update your Ledger TON-app to v2.0.1 or upper or use old wallet version https://tonwallet.me/prev/');
            throw new Error('outdated ledger ton-app version');
        }
        const {publicKey} = await this.ledgerApp.getPublicKey(ACCOUNT_NUMBER, false); // todo: можно сохранять publicKey и не запрашивать это

        const WalletClass = this.ton.wallet.all[DEFAULT_LEDGER_WALLET_VERSION];
        const wallet = new WalletClass(this.ton.provider, {
            publicKey: publicKey,
            wc: 0
        });
        this.walletContract = wallet;

        const address = await wallet.getAddress();
        this.myAddress = address.toString(true, true, true);
        this.publicKeyHex = TonWeb.utils.bytesToHex(publicKey);
    }

    async importLedger(transportType) {
        await this.createLedger(transportType);
        await storage.setItem('walletVersion', this.walletContract.getName());
        await storage.setItem('address', this.myAddress);
        await storage.setItem('isLedger', 'true');
        await storage.setItem('ledgerTransportType', transportType);
        await storage.setItem('words', 'ledger');
        await storage.setItem('publicKey', this.publicKeyHex);
        this.sendToView('setIsLedger', this.isLedger);
        this.sendToView('showScreen', {name: 'readyToGo'});
    }

    // IMPORT WALLET

    showImport() {
        this.sendToView('showScreen', {name: 'import'});
    }

    async import(words) {
        this.myMnemonicWords = words;
        if (this.myMnemonicWords) {
            try {
                const privateKey = await Controller.wordsToPrivateKey(this.myMnemonicWords);
                const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));

                let hasBalance = [];

                for (let WalletClass of this.ton.wallet.list) {
                    const wallet = new WalletClass(this.ton.provider, {
                        publicKey: keyPair.publicKey,
                        wc: 0
                    });
                    const walletAddress = (await wallet.getAddress()).toString(true, true, true);
                    const walletInfo = await this.ton.provider.getWalletInfo(walletAddress);
                    const walletBalance = this.getBalance(walletInfo);
                    if (walletBalance.gt(new BN(0))) {
                        hasBalance.push({balance: walletBalance, clazz: WalletClass});
                    }
                    this.debug(wallet.getName(), walletAddress, walletInfo, walletBalance.toString());
                }

                let walletClass = this.ton.wallet.all[DEFAULT_WALLET_VERSION];

                if (hasBalance.length > 0) {
                    hasBalance.sort((a, b) => {
                        return a.balance.cmp(b.balance);
                    });
                    walletClass = hasBalance[hasBalance.length - 1].clazz;
                }

                await this.importImpl(keyPair, walletClass);

                this.sendToView('importCompleted', {state: 'success'});
            } catch (e) {
                this.debug(e);
                this.sendToView('importCompleted', {state: 'failure'});
            }
        } else {
            this.sendToView('importCompleted', {state: 'failure'});
        }
    }

    async importImpl(keyPair, WalletClass) {
        this.walletContract = new WalletClass(this.ton.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        this.myAddress = (await this.walletContract.getAddress()).toString(true, true, true);
        this.publicKeyHex = TonWeb.utils.bytesToHex(keyPair.publicKey);
        await storage.setItem('publicKey', this.publicKeyHex);
        await storage.setItem('walletVersion', this.walletContract.getName());
        this.showCreatePassword();
    }

    // PASSWORD

    showCreatePassword() {
        this.sendToView('showScreen', {name: 'createPassword'});
    }

    /**
     * @param password  {string}
     * @return {Promise<void>}
     */
    async savePrivateKey(password) {
        this.isLedger = false;
        await storage.setItem('isLedger', 'false');
        await storage.setItem('address', this.myAddress);
        await Controller.saveWords(this.myMnemonicWords, password);
        this.myMnemonicWords = null;

        this.sendToView('setIsLedger', this.isLedger);
        this.sendToView('showScreen', {name: 'readyToGo'});
        this.sendToView('privateKeySaved');
    }

    /**
     * @param oldPassword   {string}
     * @param newPassword   {string}
     * @return {Promise<void>}
     */
    async onChangePassword(oldPassword, newPassword) {
        let words;
        try {
            words = await Controller.loadWords(oldPassword);
        } catch (e) {
            this.sendToView('showChangePasswordError');
            return;
        }
        await Controller.saveWords(words, newPassword);

        this.sendToView('closePopup');
        this.sendToView('passwordChanged');
    }

    /**
     * @param password  {string}
     * @return {Promise<void>}
     */
    async onEnterPassword(password) {
        let words;
        try {
            words = await Controller.loadWords(password);
        } catch (e) {
            this.sendToView('showEnterPasswordError');
            return;
        }

        this.afterEnterPassword(words);
        this.sendToView('passwordEntered');
    }

    // MAIN

    /**
     * @return {Promise<void>}
     */
    async showMain() {
        this.sendToView('showScreen', {name: 'main', myAddress: this.myAddress});
        if (!this.walletContract) {
            const walletVersion = await storage.getItem('walletVersion');
            const walletClass = walletVersion ? this.ton.wallet.all[walletVersion] : this.ton.wallet.default;

            this.walletContract = new walletClass(this.ton.provider, {
                address: this.myAddress,
                publicKey: this.publicKeyHex ? TonWeb.utils.hexToBytes(this.publicKeyHex) : undefined,
                wc: 0
            });
        }
        this.updateIntervalId = setInterval(() => this.update(false), 5000);
        this.update(true);
        this.sendToDapp('ton_accounts', [this.myAddress]);
    }

    /**
     * @return {Promise<void>}
     */
    async initDapp() {
        this.sendToDapp('ton_accounts', this.myAddress ? [this.myAddress] : []);
        this.doMagic((await storage.getItem('magic')) === 'true');
        this.doProxy((await storage.getItem('proxy')) === 'true');
    }

    /**
     * @return {Promise<void>}
     */
    async initView() {
        if (!this.myAddress || !(await storage.getItem('words'))) {
            this.sendToView('showScreen', {name: 'start', noAnimation: true});
        } else {
            this.sendToView('showScreen', {name: 'main', myAddress: this.myAddress});
            if (this.balance !== null) {
                this.sendToView('setBalance', {balance: this.balance.toString(), txs: this.transactions});
            }
        }
        this.sendToView('setIsMagic', (await storage.getItem('magic')) === 'true');
        this.sendToView('setIsProxy', (await storage.getItem('proxy')) === 'true');
        this.sendToView('setIsTestnet', this.isTestnet);
    }

    /**
     * @return {Promise<boolean>} successfully updated
     */
    async updateBalance() {
        try {
            const myWalletInfo = await this.getMyWalletInfo();
            this.balance = this.getBalance(myWalletInfo);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /**
     * @param force {boolean}
     * @return {Promise<boolean>} successfully updated
     */
    async update(force) {
        try {
            // if (!document.hasFocus()) {
            //     return true;
            // }
            const needUpdate = (this.processingVisible && this.sendingData) || (this.balance === null) || force;

            if (!needUpdate) return true;

            if (!(await this.updateBalance())) return false;

            const txs = await this.getTransactions();
            if (txs.length > 0) {
                this.transactions = txs;

                if (this.processingVisible && this.sendingData) {
                    for (let tx of txs) {
                        if (tx.bodyHashBase64 === this.sendingData.bodyHashBase64) {
                            this.sendToView('showPopup', {
                                name: 'done',
                                message: formatNanograms(this.sendingData.totalAmount) + ' TON have been sent'
                            });
                            this.processingVisible = false;
                            this.sendingData = null;
                            break;
                        }
                    }
                }
            }

            this.sendToView('setBalance', {balance: this.balance.toString(), txs: this.transactions});
            return true;

        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async showAddressOnDevice() {
        if (!this.ledgerApp) {
            await this.createLedger((await storage.getItem('ledgerTransportType')) || 'hid');
        }
        const {address} = await this.ledgerApp.getAddress(ACCOUNT_NUMBER, true, this.ledgerApp.ADDRESS_FORMAT_USER_FRIENDLY + this.ledgerApp.ADDRESS_FORMAT_URL_SAFE + this.ledgerApp.ADDRESS_FORMAT_BOUNCEABLE);
        this.debug(address.toString(true, true, true));
    }

    // DECRYPT MESSAGE COMMENT

    /**
     * @param hash  {string}
     * @param encryptedComment  {string} base64
     * @param senderAddress {string | Address}
     */
    onDecryptComment(hash, encryptedComment, senderAddress) {
        this.afterEnterPassword = async mnemonicWords => {
            const keyPair = await TonWeb.mnemonic.mnemonicToKeyPair(mnemonicWords);
            let decryptedComment = ''
            try {
                decryptedComment = await decryptMessageComment(TonWeb.utils.base64ToBytes(encryptedComment), keyPair.publicKey, keyPair.secretKey, senderAddress);
            } catch (e) {
                console.error(e);
            }
            this.sendToView('decryptedComment', {hash, decryptedComment});
        };
        this.sendToView('showPopup', {name: 'enterPassword'});
    }

    // SEND TONCOIN

    /**
     * @param request {{expireAt?: number, messages: [{amount: BN, toAddress: string, comment?: string | Uint8Array | Cell, needEncryptComment: boolean, stateInit?: Cell}]}}
     * @return {Promise<BN>} total fees in nanotons
     */
    async getFees(request) {
        /** @type {{expireAt?: number, messages: [{amount: BN, toAddress: string, comment?: string | Uint8Array | Cell, needEncryptComment: boolean, stateInit?: Cell}]}} */
        const tempRequest = {
            expireAt: request.expireAt,
            messages: []
        };

        for (const message of request.messages) {
            let tempComment = message.comment

            if (message.needEncryptComment) {
                const tempKeyPair = TonWeb.utils.newKeyPair();  // encrypt with random key just to get estimage fees
                const tempEncryptedCommentCell = await encryptMessageComment(message.comment, tempKeyPair.publicKey, tempKeyPair.publicKey, tempKeyPair.secretKey, this.myAddress);
                tempComment = tempEncryptedCommentCell;

            }
            tempRequest.messages.push({
                amount: message.amount,
                toAddress: message.toAddress,
                comment: tempComment,
                needEncryptComment: message.needEncryptComment,
                stateInit: message.stateInit
            });
        }

        const query = await this.sign(tempRequest, null);
        const all_fees = await query.estimateFee();
        const fees = all_fees.source_fees;
        const in_fwd_fee = new BN(fees.in_fwd_fee); // External processing fee
        const storage_fee = new BN(fees.storage_fee);
        const gas_fee = new BN(fees.gas_fee);
        const fwd_fee = new BN(fees.fwd_fee);

        return in_fwd_fee.add(storage_fee).add(gas_fee).add(fwd_fee);
    };

    /**
     * @param request {{expireAt?: number, messages: [{amount: BN, toAddress: string, comment?: string | Uint8Array | Cell, needEncryptComment: boolean, stateInit?: Cell}]}}
     * @param needQueue? {boolean}
     * @return {Promise<Cell | null>} successfully sent BoC
     */
    async showSendConfirm(request, needQueue) {
        createDappPromise();

        if (!request.messages) throw new Error('no messages');
        if (!request.messages.length) throw new Error('no messages to send');
        if (request.messages.length > 4) throw new Error('maximum 4 message at once');

        /** @type {BN} */
        let totalAmount = new BN(0);

        for (const message of request.messages) {

            // message.address

            if (!message.amount) throw new Error('no amount');

            if (!message.amount.gte(new BN(0))) {
                this.sendToView('sendCheckFailed', {message: 'Amount must be positive'});
                return null;
            }

            if (message.amount.eq(new BN(0)) && !message.comment) {
                this.sendToView('sendCheckFailed', {message: 'You can send 0 TON only with comment'});
                return null;
            }

            totalAmount = totalAmount.add(message.amount);

            // message.toAddress

            if (!message.toAddress) throw new Error('no toAddress');

            if (!Address.isValid(message.toAddress)) {
                try {
                    message.toAddress = message.toAddress.toLowerCase();
                    if (!message.toAddress.endsWith('.ton') && !message.toAddress.endsWith('.t.me')) {
                        throw new Error();
                    }

                    message.toAddress = await this.ton.dns.getWalletAddress(message.toAddress);
                    if (!message.toAddress) {
                        throw new Error();
                    }
                    if (!Address.isValid(message.toAddress)) {
                        throw new Error();
                    }
                    message.toAddress = message.toAddress.toString(true, true, true, this.isTestnet);

                } catch (e) {
                    this.sendToView('sendCheckFailed', {message: 'Invalid address or domain'});
                    return null;
                }
            }

            // make toAddress non-bounceable if destination contract uninitialized
            if (!this.checkContractInitialized(await this.ton.provider.getWalletInfo(message.toAddress))) {
                message.toAddress = (new Address(message.toAddress)).toString(true, true, false);
            }

            // message.payload

            if (!message.comment) {
                message.needEncryptComment = false;
            }

            // serialize long text comment
            if (!message.needEncryptComment && (typeof message.comment === 'string')) {
                if (message.comment.length > 0) {
                    const commentBytes = new TextEncoder().encode(message.comment);
                    const payloadBytes = new Uint8Array(4 + commentBytes.length);
                    payloadBytes[0] = 0; // zero uint32 means simple text message
                    payloadBytes[1] = 0;
                    payloadBytes[2] = 0;
                    payloadBytes[3] = 0;
                    payloadBytes.set(commentBytes, 4);
                    message.comment = makeSnakeCells(payloadBytes);
                }
            }

            // get destination public key for encryption

            if (message.needEncryptComment) {
                let toPublicKey = null;

                try {
                    const toPublicKeyBN = await this.ton.provider.call2(message.toAddress, 'get_public_key');
                    let toPublicKeyHex = toPublicKeyBN.toString(16);
                    if (toPublicKeyHex.length % 2 !== 0) {
                        toPublicKeyHex = '0' + toPublicKeyHex;
                    }
                    toPublicKey = TonWeb.utils.hexToBytes(toPublicKeyHex);
                } catch (e) {
                    console.error(e);
                }

                if (!toPublicKey) {
                    this.sendToView('sendCheckCantPublicKey', {});
                    return null;
                }

                message.toPublicKey = toPublicKey;
            }
        }

        // check balance

        if (!(await this.updateBalance())) {
            this.sendToView('sendCheckFailed', {message: 'API request error'});
            return null;
        }

        if (this.balance.lt(totalAmount)) {
            this.sendToView('sendCheckFailed', {
                message: 'Not enough balance'
            });
            return null;
        }

        let fee;

        try {
            fee = await this.getFees(request);
        } catch (e) {
            console.error(e);
            this.sendToView('sendCheckFailed', {message: 'API request error'});
            return null;
        }

        if (this.balance.sub(fee).lt(totalAmount)) {
            this.sendToView('sendCheckCantPayFee', {fee});
            return null;
        }

        // start

        if (this.isLedger) {
            const message = request.messages[0];

            this.sendToView('showPopup', {
                name: 'sendConfirm',
                amount: message.amount.toString(),
                toAddress: message.toAddress,
                needEncryptComment: false,
                fee: fee.toString()
            }, needQueue);

            const sentBoc = await this.send(request, null, totalAmount);

            if (sentBoc) {
                dAppPromise.resolve(sentBoc);
            } else {
                this.sendToView('sendCheckFailed', {message: 'API request error'});
                dAppPromise.resolve(null);
            }
        } else {
            this.afterEnterPassword = async words => {
                this.processingVisible = true;
                this.sendToView('showPopup', {name: 'processing'});

                const keyPair = await TonWeb.mnemonic.mnemonicToKeyPair(words);

                for (const message of request.messages) {
                    if (message.needEncryptComment) {
                        const encryptedCommentCell = await encryptMessageComment(message.comment, keyPair.publicKey, message.toPublicKey, keyPair.secretKey, this.myAddress);
                        message.comment = encryptedCommentCell;
                    }
                }

                const privateKeyBase64 = await Controller.wordsToPrivateKey(words);
                const sentBoc = await this.send(request, privateKeyBase64, totalAmount);

                this.onCancelAction = null;

                if (sentBoc) {
                    dAppPromise.resolve(sentBoc);
                } else {
                    this.sendToView('sendCheckFailed', {message: 'API request error'});
                    dAppPromise.resolve(null);
                }
            };

            this.onCancelAction = () => {
                dAppPromise.resolve(null);
            };

            this.sendToView('showPopup', {
                name: 'sendConfirm',
                amount: totalAmount.toString(),
                toAddress: request.messages.length === 1 ? request.messages[0].toAddress : `${request.messages.length} addresses`,
                fee: fee.toString(),
                needEncryptComment: request.messages[0].needEncryptComment // todo
            }, needQueue);
        }

        this.sendToView('sendCheckSucceeded');

        return dAppPromise;
    }

    /**
     * @param request {{expireAt?: number, messages: [{amount: BN, toAddress: string, comment?: string | Uint8Array | Cell, needEncryptComment: boolean, stateInit?: Cell}]}}
     * @param privateKeyBase64 {string | null} null if Ledger
     * @param totalAmount {BN}
     * @return  {Promise<Cell | null>} successfully sent BoC
     */
    async send(request, privateKeyBase64, totalAmount) {
        try {
            let query;

            if (this.isLedger) {
                if (request.messages.length !== 1) {
                    throw new Error('Ledger support only 1 message at once');
                }

                const message = request.messages[0];

                if (message.needEncryptComment) {
                    throw new Error('encrypted comment dont supported by Ledger');
                }

                if (message.stateInit) {
                    throw new Error('stateInit dont supported by Ledger');
                }

                if (!this.ledgerApp) {
                    await this.createLedger((await storage.getItem('ledgerTransportType')) || 'hid');
                }

                let addressFormat = 0;

                const toAddress = new Address(message.toAddress);
                if (toAddress.isUserFriendly) {
                    addressFormat += this.ledgerApp.ADDRESS_FORMAT_USER_FRIENDLY;
                    if (toAddress.isUrlSafe) {
                        addressFormat += this.ledgerApp.ADDRESS_FORMAT_URL_SAFE;
                    }
                    if (toAddress.isBounceable) {
                        addressFormat += this.ledgerApp.ADDRESS_FORMAT_BOUNCEABLE;
                    }
                    if (toAddress.isTestOnly) {
                        addressFormat += this.ledgerApp.ADDRESS_FORMAT_TEST_ONLY;
                    }
                }

                const wallet = await this.getMyWalletInfo();
                const seqno = wallet.seqno || 0;

                query = await this.ledgerApp.transfer(ACCOUNT_NUMBER, this.walletContract, message.toAddress, message.amount, seqno, addressFormat);
                this.sendToView('showPopup', {name: 'processing'});
                this.processingVisible = true;

            } else {

                const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKeyBase64));
                query = await this.sign(request, keyPair);

            }

            /** @type {Cell | null} */
            const sentBoc = await this.sendQuery(query);

            if (!sentBoc) return null;

            /** @type {Cell} */
            const bodyCell = await query.getBody();
            /** @type {Uint8Array} */
            const bodyHash = await bodyCell.hash();

            this.sendingData = {
                bodyHashBase64: TonWeb.utils.bytesToBase64(bodyHash),
                totalAmount: totalAmount
            };

            return sentBoc;

        } catch (e) {
            this.debug(e);
            this.sendToView('closePopup');
            alert('Error sending');
            return null;
        }
    }

    /**
     * @param hexToSign   {string} hex to sign
     * @param privateKey    {string}
     * @returns {Promise<string>} signature in hex
     */
    rawSign(hexToSign, privateKey) {
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        const signature = nacl.sign.detached(TonWeb.utils.hexToBytes(hexToSign), keyPair.secretKey);
        return TonWeb.utils.bytesToHex(signature);
    }

    /**
     * @param query {{send: () => Promise<*>, getQuery: () => Promise<Cell>}}
     * @return {Promise<Cell | null>} successfully sent BoC
     */
    async sendQuery(query) {
        const sendResponse = await query.send();
        if (sendResponse["@type"] === "ok") { // response from ton-http-api
            // wait for transaction, then show Done popup
            return query.getQuery();
        } else {
            this.sendToView('closePopup');
            alert('Send error');
            return null;
        }
    }

    // RAW SIGN

    /**
     * @param hexToSign  {string} hex data to sign
     * @param isConnect {boolean}
     * @param needQueue {boolean}
     * @returns {Promise<string>} signature in hex
     */
    showSignConfirm(hexToSign, isConnect, needQueue) {
        return new Promise((resolve, reject) => {
            if (this.isLedger) {
                alert('sign not supported by Ledger');
                reject();
            } else {

                this.onCancelAction = () => {
                    reject('User cancel');
                };

                this.afterEnterPassword = async words => {
                    this.sendToView('closePopup');
                    const privateKeyBase64 = await Controller.wordsToPrivateKey(words);
                    const signature = this.rawSign(hexToSign, privateKeyBase64);
                    resolve(signature);
                };

                this.sendToView('showPopup', {
                    name: 'signConfirm',
                    data: hexToSign,
                    isConnect: isConnect
                }, needQueue);

            }
        });
    }

    /**
     * Ask user for password and set `this.publicKeyHex`
     * @param needQueue {boolean}
     * @return {Promise<void>}
     */
    requestPublicKey(needQueue) {
        return new Promise(async (resolve, reject) => {
            await showExtensionWindow();

            this.onCancelAction = () => {
                reject('User cancel');
            };

            this.afterEnterPassword = async words => {
                const privateKey = await Controller.wordsToPrivateKey(words);
                const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
                this.publicKeyHex = TonWeb.utils.bytesToHex(keyPair.publicKey);
                await storage.setItem('publicKey', this.publicKeyHex);
                resolve();
            };

            this.sendToView('showPopup', {name: 'enterPassword'}, needQueue);
        });
    }

    /**
     * @param needQueue {boolean}
     * @returns {Promise<void>}
     */
    showConnectConfirm(needQueue) {
        return new Promise((resolve, reject) => {
            this.onCancelAction = () => {
                reject({
                    message: 'Reject request',
                    code: 300 // USER_REJECTS_ERROR
                });
            };

            this.onConnectConfirmed = async () => {
                this.sendToView('closePopup');
                resolve();
            };

            this.sendToView('showPopup', {
                name: 'connectConfirm',
            }, needQueue);
        });
    }

    // DISCONNECT WALLET

    clearVars() {
        this.myAddress = null;
        this.publicKeyHex = null;
        this.balance = null;
        this.walletContract = null;
        this.transactions = [];
        this.sendingData = null;
        this.processingVisible = false;
        this.isLedger = false;
        this.ledgerApp = null;
        clearInterval(this.updateIntervalId);
    }

    async onDisconnectClick() {
        this.clearVars();
        await storage.clear();
        this.sendToView('showScreen', {name: 'start'});
        this.sendToDapp('ton_accounts', []);
    }

    // MAGIC

    doMagic(enabled) {
        try {
            this.sendToDapp('ton_doMagic', enabled);
        } catch (e) {

        }
    }

    // PROXY

    doProxy(enabled) {

    }

    // TRANSPORT WITH VIEW

    sendToView(method, params, needQueue, needResult) {
        if (self.view) {
            const result = self.view.onMessage(method, params);
            if (needResult) {
                return result;
            }
        } else {
            const msg = {method, params};
            const exec = () => {
                if (popupPort) {
                    popupPort.postMessage(msg);
                } else if (needQueue) {
                    queueToPopup.push(msg);
                }
            };

            if (!needResult) {
                exec();
                return;
            }

            return new Promise((resolve) => {
                msg.id = this._lastMsgId++;
                this.pendingMessageResolvers.set(msg.id, resolve);
                exec();
            });
        }
    }

    /**
     * @param method    {string}
     * @param params   {Object}
     * @return {Promise<void>}
     */
    async onViewMessage(method, params) {
        switch (method) {
            case 'showScreen':
                switch (params.name) {
                    case 'created':
                        await this.showCreated();
                        break;
                    case 'import':
                        this.showImport();
                        break;
                    case 'importLedger':
                        await this.importLedger(params.transportType);
                        break;
                }
                break;
            case 'import':
                await this.import(params.words);
                break;
            case 'createPrivateKey':
                await this.createPrivateKey();
                break;
            case 'passwordCreated':
                await this.savePrivateKey(params.password);
                break;
            case 'update':
                this.update(true);
                break;
            case 'showAddressOnDevice':
                await this.showAddressOnDevice();
                break;
            case 'onCancelAction':
                if (this.onCancelAction) {
                    await this.onCancelAction();
                    this.onCancelAction = null;
                }
                break;
            case 'onConnectConfirmed':
                if (this.onConnectConfirmed) {
                    this.onConnectConfirmed();
                    this.onConnectConfirmed = null;
                }
                break;
            case 'onEnterPassword':
                await this.onEnterPassword(params.password);
                break;
            case 'decryptComment':
                await this.onDecryptComment(params.hash, params.encryptedComment, params.senderAddress);
                break;
            case 'onChangePassword':
                await this.onChangePassword(params.oldPassword, params.newPassword);
                break;
            case 'onSend':
                await this.showSendConfirm({
                    messages: [
                        {
                            amount: new BN(params.amount),
                            toAddress: params.toAddress,
                            comment: params.comment,
                            needEncryptComment: params.needEncryptComment
                        }
                    ]
                }, false);
                break;
            case 'onBackupDone':
                await this.onBackupDone();
                break;
            case 'onConfirmBack':
                this.showBackup(this.myMnemonicWords);
                break;
            case 'onImportBack':
                this.sendToView('showScreen', {name: 'start'});
                break;
            case 'onConfirmDone':
                this.onConfirmDone(params.words);
                break;
            case 'showMain':
                await this.showMain();
                break;
            case 'onBackupWalletClick':
                this.onBackupWalletClick();
                break;
            case 'disconnect':
                await this.onDisconnectClick();
                break;
            case 'onClosePopup':
                this.processingVisible = false;
                break;
            case 'onMagicClick':
                await storage.setItem('magic', params ? 'true' : 'false');
                this.doMagic(params);
                break;
            case 'onProxyClick':
                await storage.setItem('proxy', params ? 'true' : 'false');
                this.doProxy(params);
                break;
            case 'toggleTestnet':
                await this.toggleTestnet();
                break;
            case 'toggleDebug':
                await this.toggleDebug();
                break;
            case 'onWindowUpdate':
                await storage.setItem('windowState', {
                    top: params.top,
                    left: params.left,
                    // -2 need for remove frames size
                    // TODO: check in linux and macos
                    height: params.height - 2,
                    width: params.width - 2
                });
                break;
        }
    }

    // TRANSPORT WITH DAPP

    /**
     * @param method    {string}
     * @param params    {any | any[]}
     */
    sendToDapp(method, params) {
        contentScriptPorts.forEach(port => {
            port.postMessage(JSON.stringify({
                type: 'gramWalletAPI',
                message: {jsonrpc: '2.0', method: method, params: params}
            }));
        });
    }

    /**
     * @param needQueue {boolean}
     * @return {Promise<{name: 'ton_addr', address: string, network: string, walletStateInit: string, publicKey: string }>}
     */
    async createTonAddrItemReply(needQueue) {
        if (!this.myAddress) {
            throw {
                message: 'Missing connection',
                code: 1 // BAD_REQUEST_ERROR
            };
        }
        if (!this.publicKeyHex) {
            await this.requestPublicKey(needQueue);
        }
        const walletVersion = await storage.getItem('walletVersion');

        const rawAddressString = new TonWeb.utils.Address(this.myAddress).toString(false);
        const WalletClass = walletVersion ? this.ton.wallet.all[walletVersion] : this.ton.wallet.default;
        const wallet = new WalletClass(this.ton.provider, {
            publicKey: TonWeb.utils.hexToBytes(this.publicKeyHex),
            wc: 0
        });
        const {stateInit} = await wallet.createStateInit();
        const stateInitBase64 = TonWeb.utils.bytesToBase64(await stateInit.toBoc(false));

        return {
            name: 'ton_addr',
            address: rawAddressString,
            network: this.isTestnet ? TONCONNECT_TESTNET : TONCONNECT_MAINNET,
            walletStateInit: stateInitBase64,
            publicKey: this.publicKeyHex
        };
    }

    /**
     * @param origin    {string}
     * @param payload   {string}
     * @param needQueue {boolean}
     * @return {any} ton_proof item
     */
    async createTonProofItemReply(origin, payload, needQueue) {
        if (!this.myAddress) {
            throw {
                message: 'Missing connection',
                code: 1 // BAD_REQUEST_ERROR
            };
        }

        const timestamp = Math.round(Date.now() / 1000);
        const timestampBuffer = new BigInt64Array(1);
        timestampBuffer[0] = BigInt(timestamp);

        const domain = new URL(origin).host;
        const domainBuffer = new TextEncoder().encode(domain);
        const domainLengthBuffer = new Int32Array(1);
        domainLengthBuffer[0] = domainBuffer.byteLength;

        const address = new TonWeb.utils.Address(this.myAddress);

        const addressWorkchainBuffer = new Int32Array(1);
        addressWorkchainBuffer[0] = address.wc;

        const addressBuffer = new Uint8Array(4 + address.hashPart.length);
        addressBuffer.set(addressWorkchainBuffer, 0);
        addressBuffer.set(address.hashPart, 4);

        const prefixBuffer = new TextEncoder().encode('ton-proof-item-v2/');
        const payloadBuffer = new TextEncoder().encode(payload);
        const messageBuffer = new Uint8Array(prefixBuffer.byteLength + addressBuffer.byteLength + domainLengthBuffer.byteLength + domainBuffer.byteLength + timestampBuffer.byteLength + payloadBuffer.byteLength);

        let offset = 0;
        messageBuffer.set(prefixBuffer, offset);
        offset += prefixBuffer.byteLength;
        messageBuffer.set(addressBuffer, offset);
        offset += addressBuffer.byteLength;
        messageBuffer.set(domainLengthBuffer, offset);
        offset += domainLengthBuffer.byteLength;
        messageBuffer.set(domainBuffer, offset);
        offset += domainBuffer.byteLength;
        messageBuffer.set(new Uint8Array(timestampBuffer.buffer), offset);
        offset += 8;
        messageBuffer.set(payloadBuffer, offset);

        const ffffPrefix = new Uint8Array([0xff, 0xff]);
        const tonconnectPrefix = new TextEncoder().encode('ton-connect')

        const messageBufferHash = new Uint8Array(await TonWeb.utils.sha256(messageBuffer));
        const bufferToSign = new Uint8Array(ffffPrefix.byteLength + tonconnectPrefix.byteLength + messageBufferHash.byteLength);
        offset = 0;
        bufferToSign.set(ffffPrefix, offset);
        offset += ffffPrefix.byteLength;
        bufferToSign.set(tonconnectPrefix, offset);
        offset += tonconnectPrefix.byteLength;
        bufferToSign.set(messageBufferHash, offset);

        const hexToSign = TonWeb.utils.bytesToHex(new Uint8Array(await TonWeb.utils.sha256(bufferToSign)));
        const signatureHex = await this.showSignConfirm(hexToSign, true, needQueue);
        console.log({signatureHex});
        const signatureBase64 = TonWeb.utils.bytesToBase64(TonWeb.utils.hexToBytes(signatureHex));
        console.log({signatureBase64});

        return {
            name: 'ton_proof',
            proof: {
                timestamp: timestamp, // 64-bit unix epoch time of the signing operation (seconds)
                domain: {
                    lengthBytes: domainBuffer.byteLength, // AppDomain Length
                    value: domain, // app domain name (as url part, without encoding)
                },
                signature: signatureBase64, // base64-encoded signature
                payload: payload, // payload from the request
            },
        }
    }

    async onDappMessage(method, params, origin) {
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1102.md
        await this.whenReady;

        const needQueue = !popupPort;

        switch (method) {
            case 'tonConnect_connect':
                await showExtensionWindow();
                if (!this.myAddress) {
                    throw {
                        message: 'Missing connection',
                        code: 1 // BAD_REQUEST_ERROR
                    }
                }

                const data = params[0];
                const tonProof = data.items.find((item) => item.name === 'ton_proof');


                if (!tonProof &&
                    !(await storage.getItem('tonconnect_' + this.myAddress + '_' + (this.isTestnet ? 'testnet' : 'mainnet') + '_' + origin))) {

                    await this.showConnectConfirm(needQueue);
                }

                await storage.setItem('tonconnect_' + this.myAddress + '_' + (this.isTestnet ? 'testnet' : 'mainnet') + '_' + origin, 'true');

                const connectResult = [
                    await this.createTonAddrItemReply(needQueue),
                ];
                if (tonProof) {
                    connectResult.push(await this.createTonProofItemReply(origin, tonProof.payload, needQueue))
                }

                return connectResult;

            case 'tonConnect_reconnect':
                if (!this.myAddress ||
                    !(await storage.getItem('tonconnect_' + this.myAddress + '_' + (this.isTestnet ? 'testnet' : 'mainnet') + '_' + origin))) {
                    throw {
                        message: 'Missing connection',
                        code: 1 // BAD_REQUEST_ERROR
                    }
                }

                return [
                    await this.createTonAddrItemReply(needQueue)
                ];

            case 'tonConnect_disconnect':
                await storage.removeItem('tonconnect_' + this.myAddress + '_' + (this.isTestnet ? 'testnet' : 'mainnet') + '_' + origin);
                return;

            case 'tonConnect_sendTransaction':
                await showExtensionWindow();

                const tx = params[0];
                console.log('tonConnect_sendTransaction', params, origin, tx);

                // check is dapp connected to wallet

                if (!this.myAddress) {
                    throw {
                        message: 'Missing connection',
                        code: 1 // BAD_REQUEST_ERROR
                    }
                }
                if (!(await storage.getItem('tonconnect_' + this.myAddress + '_' + (this.isTestnet ? 'testnet' : 'mainnet') + '_' + origin))) {
                    throw {
                        message: 'dApp don\'t have an access to wallet',
                        code: 1 // BAD_REQUEST_ERROR
                    }
                }

                // check tonConnect_sendTransaction request

                /** @type {number | undefined} */
                let expireAt = undefined;

                if (tx.valid_until) {
                    expireAt = Number(tx.valid_until);
                    if (isNaN(expireAt)) {
                        throw {
                            message: 'invalid validUntil',
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }
                    if (expireAt > 9999999999) {
                        expireAt = expireAt / 1000; // convert millis to seconds, todo: it's not good
                    }
                    if (expireAt < Date.now() / 1000) {
                        throw {
                            message: 'expired',
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }
                }

                if (tx.from) {
                    if (!Address.isValid(tx.from)) {
                        throw {
                            message: 'Invalid source address',
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }

                    if (new TonWeb.utils.Address(tx.from).toString(false) !== new TonWeb.utils.Address(this.myAddress).toString(false)) {
                        throw {
                            message: 'Different source address',
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }
                }

                if (tx.network) {
                    if (tx.network !== TONCONNECT_TESTNET && tx.network !== TONCONNECT_MAINNET) {
                        throw {
                            message: 'Invalid network',
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }

                    if ((tx.network === TONCONNECT_TESTNET) !== !!this.isTestnet) {
                        throw {
                            message: 'Different network',
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }
                }

                if (!tx.messages || !tx.messages.length) {
                    throw {
                        message: 'no messages',
                        code: 1 // BAD_REQUEST_ERROR
                    }
                }

                const convertTonconnectMessage = (message) => {
                    try {
                        if (!message.address) {
                            throw new Error('no address')
                        }
                        if (!Address.isValid(message.address)) {
                            throw new Error('invalid address');
                        }
                        if (!message.amount) {
                            throw new Error('no amount')
                        }
                        message.amount = new BN(message.amount);
                        if (message.payload) {
                            message.payload = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(message.payload));
                        }
                        if (message.stateInit) {
                            message.stateInit = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(message.stateInit));
                        }

                        return {
                            amount: message.amount,
                            toAddress: message.address,
                            comment: message.payload,
                            needEncryptComment: false,
                            stateInit: message.stateInit
                        }
                    } catch (e) {
                        throw {
                            message: e.message,
                            code: 1 // BAD_REQUEST_ERROR
                        }
                    }
                }

                const messages = [];
                for (const message of tx.messages) {
                    messages.push(convertTonconnectMessage(message));
                }

                this.sendToView('showPopup', {
                    name: 'loader',
                });

                /** @type {Cell | null} */
                const sentBoc = await this.showSendConfirm(
                    {
                        expireAt: expireAt,
                        messages
                    },
                    needQueue
                );

                if (!sentBoc) {
                    this.sendToView('closePopup');
                    throw {
                        message: 'Reject request',
                        code: 300 // USER_REJECTS_ERROR
                    }
                }

                return TonWeb.utils.bytesToBase64(await sentBoc.toBoc(false));

            case 'ton_requestAccounts':
                return (this.myAddress ? [this.myAddress] : []);
            case 'ton_requestWallets':
                if (!this.myAddress) {
                    return [];
                }
                if (!this.publicKeyHex) {
                    await this.requestPublicKey(needQueue);
                }
                const walletVersion = await storage.getItem('walletVersion');
                return [{
                    address: this.myAddress,
                    publicKey: this.publicKeyHex,
                    walletVersion: walletVersion
                }];
            case 'ton_getBalance':
                await this.updateBalance();
                return (this.balance ? this.balance.toString() : '');
            case 'ton_sendTransaction':
                const param = params[0];
                await showExtensionWindow();

                if (param.data) {
                    if (param.dataType === 'hex') {
                        param.data = TonWeb.utils.hexToBytes(param.data);
                    } else if (param.dataType === 'base64') {
                        param.data = TonWeb.utils.base64ToBytes(param.data);
                    } else if (param.dataType === 'boc') {
                        param.data = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(param.data));
                    }
                }
                if (param.stateInit) {
                    param.stateInit = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(param.stateInit));
                }

                this.sendToView('showPopup', {
                    name: 'loader',
                });

                const result = await this.showSendConfirm(
                    {
                        messages: [{
                            amount: new BN(param.value),
                            toAddress: param.to,
                            comment: param.data,
                            needEncryptComment: false,
                            stateInit: param.stateInit,
                        }]
                    },
                    needQueue
                );
                if (!result) {
                    this.sendToView('closePopup');
                }
                return !!result;
            case 'ton_rawSign':
                const signParam = params[0];
                await showExtensionWindow();

                return this.showSignConfirm(signParam.data, false, needQueue);
            case 'flushMemoryCache':
                await chrome.webRequest.handlerBehaviorChanged();
                return true;
            default:
                throw {
                    message: `Method "${method}" not implemented`,
                    code: 400 // METHOD_NOT_SUPPORTED
                };
        }
    }
}

const controller = new Controller();

if (IS_EXTENSION) {
    chrome.runtime.onConnect.addListener(port => {
        if (port.name === 'gramWalletContentScript') { // dapp
            contentScriptPorts.add(port)
            port.onMessage.addListener(async (msg, port) => {
                if (msg.type === 'gramWalletAPI_ton_provider_connect') {
                    controller.whenReady.then(() => {
                        controller.initDapp();
                    });
                }

                if (!msg.message) return;

                const origin = decodeURIComponent(msg.message.origin);

                let result = undefined;
                let error = undefined;
                try {
                    result = await controller.onDappMessage(msg.message.method, msg.message.params, origin);
                } catch (e) {
                    console.error(e);
                    error = {
                        message: e.message,
                        code: e.code || 0
                    };
                }
                if (port) {
                    port.postMessage(JSON.stringify({
                        type: 'gramWalletAPI',
                        message: {jsonrpc: '2.0', id: msg.message.id, method: msg.message.method, result, error}
                    }));
                }
            });
            port.onDisconnect.addListener(port => {
                contentScriptPorts.delete(port)
            })
        } else if (port.name === 'gramWalletPopup') { // view
            popupPort = port;
            popupPort.onMessage.addListener(function (msg) {
                if (msg.method === 'response') {
                    const resolver = controller.pendingMessageResolvers.get(msg.id);
                    if (resolver) {
                        resolver(msg.result);
                        controller.pendingMessageResolvers.delete(msg.id);
                    }
                } else {
                    controller.onViewMessage(msg.method, msg.params);
                }
            });
            popupPort.onDisconnect.addListener(() => {
                popupPort = null;
            });

            const runQueueToPopup = () => {
                queueToPopup.forEach(msg => popupPort.postMessage(msg));
                queueToPopup.length = 0;
            };

            if (!controller.myAddress) { // if controller not initialized yet
                runQueueToPopup();
            }

            controller.whenReady.then(async () => {
                await controller.initView();
                runQueueToPopup();
            });
        }
    });

    let actionApiName = 'action';
    if (chrome.runtime.getManifest().manifest_version === 2) actionApiName = 'browserAction';

    chrome[actionApiName].onClicked.addListener(showExtensionWindow);

    chrome.windows.onRemoved.addListener(removedWindowId => {
        if (dAppPromise) dAppPromise.resolve(false);

        if (removedWindowId !== extensionWindowId) return;
        extensionWindowId = -1;
    });
}
