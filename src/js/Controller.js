let contentScriptPort = null;
let popupPort = null;
const queueToPopup = [];

const showExtensionPopup = () => {
    const cb = (currentPopup) => {
        this._popupId = currentPopup.id
    };
    const creation = chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 400,
        height: 600,
        top: 0,
        left: window.innerWidth - 400,
    }, cb);
}

const BN = TonWeb.utils.BN;
const nacl = TonWeb.utils.nacl;
const Address = TonWeb.utils.Address;
const formatNanograms = TonWeb.utils.fromNano;

/**
 * @return  String
 */
async function hash(s) {
    const bytes = new TextEncoder().encode(s);
    return TonWeb.utils.bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

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

const IS_TESTNET = window.location.href.indexOf('testnet') > -1;

const ACCOUNT_NUMBER = 0;

const DEFAULT_WALLET_VERSION = 'v3R2';
const DEFAULT_LEDGER_WALLET_VERSION = 'v3R1';

class Controller {
    constructor() {
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
        this.updateIntervalId = 0;
        this.lastTransactionTime = 0;
        this.isContractInitialized = false;
        this.sendingData = null;
        this.processingVisible = false;

        this.ledgerApp = null;
        this.isLedger = false;

        if (window.view) {
            window.view.controller = this;
        }

        const mainnetRpc = 'https://toncenter.com/api/v2/jsonRPC';
        const testnetRpc = 'https://testnet.toncenter.com/api/v2/jsonRPC';
        this.sendToView('setIsTestnet', IS_TESTNET)

        localStorage.removeItem('pwdHash');

        this.ton = new TonWeb(new TonWeb.HttpProvider(IS_TESTNET ? testnetRpc : mainnetRpc));
        this.myAddress = localStorage.getItem('address');
        if (!this.myAddress || !localStorage.getItem('words')) {
            localStorage.clear();
            this.sendToView('showScreen', {name: 'start'})
        } else {
            if (localStorage.getItem('isLedger') === 'true') {
                this.isLedger = true;
                this.publicKeyHex = localStorage.getItem('publicKey');
                this.sendToView('setIsLedger', this.isLedger);
            }

            this.showMain();
        }
    }

    /**
     * @param words {string[]}
     * @return {Promise<string>}
     */
    static async wordsToPrivateKey(words) {
        const keyPair = await TonWeb.mnemonic.mnemonicToKeyPair(words);
        return TonWeb.utils.bytesToBase64(keyPair.secretKey.slice(0, 32));
    }

    /**
     *
     * @param walletAddress
     * @returns {Promise<void>}
     */
    static async saveWalletAddress(walletAddress) {
        if (!localStorage.getItem('defaultAddress')) {
            localStorage.setItem('defaultAddress', localStorage.getItem('address'));
        }
        localStorage.setItem('address', walletAddress);
    }

    /**
     * @param words {string[]}
     * @param password  {string}
     * @return {Promise<void>}
     */
    static async saveWords(words, password) {
        localStorage.setItem('words', await encrypt(words.join(','), password));
    }

    /**
     * @param password  {string}
     * @return {Promise<string[]>}
     */
    static async loadWords(password) {
        return (await decrypt(localStorage.getItem('words'), password)).split(',');
    }

    async getWallet() {
        return this.ton.provider.getWalletInfo(this.myAddress);
    }

    isUsingCustomWallet() {
        return !!localStorage.getItem('defaultAddress') && localStorage.getItem('defaultAddress') !== localStorage.getItem('address');
    }

    async getSeqno(contractAddress, method = "seqno") {
        try {
            let result = await this.ton.provider.call(contractAddress, method, []);
            return parseInt(result.stack[0][1], 16);
        } catch (e) {
            console.log(e);
            return 0;
        }
    }

    checkContractInitialized(getWalletResponse) {
        return getWalletResponse.account_state === "active";
    }

    /**
     * @return {BN} in nanograms
     */
    getBalance(getWalletResponse) {
        return new BN(getWalletResponse.balance);
    }

    async getTransactions(limit = 20) {

        function getComment(msg) {
            if (!msg.msg_data) return '';
            if (msg.msg_data['@type'] !== 'msg.dataText') return '';
            const base64 = msg.msg_data.text;
            return new TextDecoder().decode(TonWeb.utils.base64ToBytes(base64));
        }

        const arr = [];
        const transactions = await this.ton.getTransactions(this.myAddress, limit);
        for (let t of transactions) {
            let amount = new BN(t.in_msg.value);
            for (let outMsg of t.out_msgs) {
                amount = amount.sub(new BN(outMsg.value));
            }
            //amount = amount.sub(new BN(t.fee));

            let from_addr = "";
            let to_addr = "";
            let comment = "";
            if (t.in_msg.source) { // internal message with grams, set source
                from_addr = t.in_msg.source;
                to_addr = t.in_msg.destination;
                comment = getComment(t.in_msg);
            } else if (t.out_msgs.length) { // external message, we sending grams
                from_addr = t.out_msgs[0].source;
                to_addr = t.out_msgs[0].destination;
                comment = getComment(t.out_msgs[0]);
                //TODO support many out messages. We need to show separate outgoing payment for each? How to show fees?
            } else {
                // Deploying wallet contract onchain
            }

            if (to_addr) {
                arr.push({
                    amount: amount.toString(),
                    from_addr: from_addr,
                    to_addr: to_addr,
                    fee: t.fee.toString(),
                    storageFee: t.storage_fee.toString(),
                    otherFee: t.other_fee.toString(),
                    comment: comment,
                    date: t.utime * 1000
                });
            }
        }
        return arr;
    }

    /**
     * @param toAddress {String}  Destination address in any format
     * @param amount    {BN}  Transfer value in nanograms
     * @param comment   {String}  Transfer comment
     * @param keyPair    nacl.KeyPair
     * @return Promise<{send: Function, estimateFee: Function}>
     */
    async sign(toAddress, amount, comment, keyPair) {
        const wallet = await this.getWallet(this.myAddress);
        let seqno = this.isUsingCustomWallet() ? (await this.getSeqno(this.myAddress)) : wallet.seqno;
        if (!seqno) seqno = 0;

        const secretKey = keyPair ? keyPair.secretKey : null;
        return this.walletContract.methods.transfer({
            secretKey: secretKey,
            toAddress: toAddress,
            amount: amount,
            seqno: seqno,
            payload: comment,
            sendMode: 3
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
        localStorage.setItem('walletVersion', walletVersion);
        this.sendToView('disableCreated', false);
    }

    async createPrivateKey() {
        this.showBackup(this.myMnemonicWords);
    }

    // BACKUP WALLET

    onBackupWalletClick() {
        this.afterEnterPassword = async mnemonicWords => {
            this.showBackup(mnemonicWords);
        };
        this.sendToView('showPopup', {name: 'enterPassword'});
    }

    showBackup(words) {
        this.sendToView('showScreen', {name: 'backup', words});
    }

    onBackupDone() {
        if (localStorage.getItem('words')) {
            this.sendToView('showScreen', {name: 'main'});
        } else {
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
                throw new Error('unknown transportType' + transportType)
        }

        transport.setDebugMode(true);
        this.isLedger = true;
        this.ledgerApp = new TonWeb.ledger.AppTon(transport, this.ton);
        const ledgerVersion = (await this.ledgerApp.getAppConfiguration()).version;
        console.log('ledgerAppConfig=', ledgerVersion);
        if (!ledgerVersion.startsWith('2')) {
            alert('Please update your Ledger TON-app to v2.0.1 or upper or use old wallet version https://tonwallet.me/prev/')
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
        localStorage.setItem('walletVersion', this.walletContract.getName());
        localStorage.setItem('address', this.myAddress);
        localStorage.setItem('isLedger', 'true');
        localStorage.setItem('ledgerTransportType', transportType);
        localStorage.setItem('words', 'ledger');
        localStorage.setItem('publicKey', this.publicKeyHex);
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
                console.log(wallet.getName(), walletAddress, walletInfo, walletBalance.toString());
            }

            let walletClass = this.ton.wallet.all[DEFAULT_WALLET_VERSION];

            if (hasBalance.length > 0) {
                hasBalance.sort((a, b) => {
                    return a.balance.cmp(b.balance);
                });
                walletClass = hasBalance[hasBalance.length - 1].clazz;
            }

            await this.importImpl(keyPair, walletClass);
        }
    }

    async importImpl(keyPair, WalletClass) {
        this.walletContract = new WalletClass(this.ton.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        this.myAddress = (await this.walletContract.getAddress()).toString(true, true, true);
        localStorage.setItem('walletVersion', this.walletContract.getName());
        this.showCreatePassword();
    }

    // PASSWORD

    showCreatePassword() {
        this.sendToView('showScreen', {name: 'createPassword'});
    }

    async savePrivateKey(password) {
        this.isLedger = false;
        localStorage.setItem('isLedger', 'false');
        localStorage.setItem('address', this.myAddress);
        await Controller.saveWords(this.myMnemonicWords, password);
        this.myMnemonicWords = null;

        this.sendToView('setIsLedger', this.isLedger);
        this.sendToView('showScreen', {name: 'readyToGo'});
    }

    async onChangeWalletAddress(walletAddress) {
        if (!walletAddress) {
            this.sendToView('changeWalletAddressError');
        } else {
            await Controller.saveWalletAddress(walletAddress);
            this.sendToView('closePopup');
            if (chrome.runtime) {
                chrome.runtime.reload();
            } else {
                window.location.reload();
            }
        }
    }

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
    }

    async onEnterPassword(password) {
        let words;
        try {
            words = await Controller.loadWords(password);
        } catch (e) {
            this.sendToView('showEnterPasswordError');
            return;
        }

        this.afterEnterPassword(words);
    }

    // MAIN

    showMain() {
        this.sendToView('showScreen', {name: 'main', myAddress: this.myAddress});
        if (!this.walletContract) {
            const walletVersion = localStorage.getItem('walletVersion');
            const walletClass = walletVersion ? this.ton.wallet.all[walletVersion] : this.ton.wallet.default;

            this.walletContract = new walletClass(this.ton.provider, {
                address: this.myAddress,
                wc: 0
            });
        }
        this.updateIntervalId = setInterval(() => this.update(), 5000);
        this.update(true);
        this.sendToDapp('ton_accounts', [this.myAddress]);
    }

    initDapp() {
        this.sendToDapp('ton_accounts', this.myAddress ? [this.myAddress] : []);
        this.doMagic(localStorage.getItem('magic') === 'true');
        this.doProxy(localStorage.getItem('proxy') === 'true');
    }

    initView() {
        if (!this.myAddress || !localStorage.getItem('words')) {
            this.sendToView('showScreen', {name: 'start'})
        } else {
            this.sendToView('showScreen', {name: 'main', myAddress: this.myAddress});
            if (this.balance !== null) {
                this.sendToView('setBalance', {balance: this.balance.toString(), txs: this.transactions});
            }
        }
        this.sendToView('setIsMagic', localStorage.getItem('magic') === 'true');
        this.sendToView('setIsProxy', localStorage.getItem('proxy') === 'true');
    }

    update(force) {
        // if (!document.hasFocus()) {
        //     return;
        // }
        const needUpdate = (this.processingVisible && this.sendingData) || (this.balance === null) || force;

        if (!needUpdate) return;

        this.getWallet().then(async (response) => {
            const balance = this.getBalance(response);
            const isBalanceChanged = (this.balance === null) || (this.balance.cmp(balance) !== 0);
            this.balance = balance;

            const isContractInitialized = this.checkContractInitialized(response)
                && (this.isUsingCustomWallet() ? await this.getSeqno(this.myAddress) : response.seqno);

            console.log('isBalanceChanged', isBalanceChanged);
            console.log('isContractInitialized', isContractInitialized);

            if (!this.isContractInitialized && isContractInitialized) {
                this.isContractInitialized = true;
            }

            if (isBalanceChanged) {
                this.getTransactions().then(txs => {
                    if (txs.length > 0) {
                        this.transactions = txs;
                        const newTxs = txs.filter(tx => Number(tx.date) > this.lastTransactionTime);
                        this.lastTransactionTime = Number(txs[0].date);

                        if (this.processingVisible && this.sendingData) {
                            for (let tx of newTxs) {
                                const txAddr = (new Address(tx.to_addr)).toString(true, true, true);
                                const myAddr = (new Address(this.sendingData.toAddress)).toString(true, true, true);
                                const txAmount = tx.amount;
                                const myAmount = '-' + this.sendingData.amount.toString();

                                if (txAddr === myAddr && txAmount === myAmount) {
                                    this.sendToView('showPopup', {
                                        name: 'done',
                                        message: formatNanograms(this.sendingData.amount) + ' TON have been sent'
                                    });
                                    this.processingVisible = false;
                                    this.sendingData = null;
                                    break;
                                }
                            }
                        }
                    }

                    this.sendToView('setBalance', {balance: balance.toString(), txs});
                });
            } else {
                this.sendToView('setBalance', {balance: balance.toString(), txs: this.transactions});
            }
        });
    }

    async showAddressOnDevice() {
        if (!this.ledgerApp) {
            await this.createLedger(localStorage.getItem('ledgerTransportType') || 'hid');
        }
        const {address} = await this.ledgerApp.getAddress(ACCOUNT_NUMBER, true, this.ledgerApp.ADDRESS_FORMAT_USER_FRIENDLY + this.ledgerApp.ADDRESS_FORMAT_URL_SAFE + this.ledgerApp.ADDRESS_FORMAT_BOUNCEABLE);
        console.log(address.toString(true, true, true));
    }

    // SEND GRAMS

    /**
     * @param amount    {BN}    in nanograms
     * @param toAddress {string}
     * @param comment?  {string}
     * @return {Promise<BN>} in nanograms
     */
    async getFees(amount, toAddress, comment) {
        if (!this.isContractInitialized) {
            return TonWeb.utils.toNano(0.010966001);
        }

        try {
            const query = await this.sign(toAddress, amount, comment, null);
            const all_fees = await query.estimateFee();
            const fees = all_fees.source_fees;
            const in_fwd_fee = new BN(fees.in_fwd_fee);
            const storage_fee = new BN(fees.storage_fee);
            const gas_fee = new BN(fees.gas_fee);
            const fwd_fee = new BN(fees.fwd_fee);

            // const tooltip_text = '<span>External processing fee ' + (fees.in_fwd_fee / 1e9).toString() + ' grams</span></br>' +
            //     '<span>Storage fee ' + (fees.storage_fee / 1e9).toString() + ' grams</span></br>' +
            //     '<span>Gas fee ' + (fees.gas_fee / 1e9).toString() + ' grams</span></br>' +
            //     '<span>Forwarding fees ' + (fees.fwd_fee / 1e9).toString() + ' grams</span>';
            //
            return in_fwd_fee.add(storage_fee).add(gas_fee).add(fwd_fee);
        } catch (err) {
            console.error(err);
            return new BN(0);
        }
    };

    /**
     * @param amount    {BN} in nanograms
     * @param toAddress {string}
     * @param comment?  {string | Uint8Array}
     * @param needQueue {boolean}
     */
    async showSendConfirm(amount, toAddress, comment, needQueue) {
        if (amount.lte(0) || this.balance.lt(amount)) {
            return;
        }
        if (!Address.isValid(toAddress)) {
            return;
        }

        const fee = await this.getFees(amount, toAddress, comment);

        if (this.isLedger) {

            this.sendToView('showPopup', {
                name: 'sendConfirm',
                amount: amount.toString(),
                toAddress: toAddress,
                fee: fee.toString()
            }, needQueue);

            this.send(toAddress, amount, comment, null);

        } else {

            this.afterEnterPassword = async words => {
                this.processingVisible = true;
                this.sendToView('showPopup', {name: 'processing'});
                const privateKey = await Controller.wordsToPrivateKey(words);
                this.send(toAddress, amount, comment, privateKey);
            };

            this.sendToView('showPopup', {
                name: 'sendConfirm',
                amount: amount.toString(),
                toAddress: toAddress,
                fee: fee.toString()
            }, needQueue);

        }
    }

    /**
     * @param hexToSign  {string} hex data to sign
     * @param needQueue {boolean}
     * @returns {Promise<string>} signature in hex
     */
    showSignConfirm(hexToSign, needQueue) {
        return new Promise((resolve, reject) => {
            if (this.isLedger) {
                alert('sign not supported by Ledger');
                reject();
            } else {

                this.afterEnterPassword = async words => {
                    this.sendToView('closePopup');
                    const privateKey = await Controller.wordsToPrivateKey(words);
                    const signature = this.rawSign(hexToSign, privateKey);
                    resolve(signature);
                };

                this.sendToView('showPopup', {
                    name: 'signConfirm',
                    data: hexToSign,
                }, needQueue);

            }
        });
    }

    /**
     * @param toAddress {string}
     * @param amount    {BN} in nanograms
     * @param comment   {string}
     * @param privateKey    {string}
     */
    async send(toAddress, amount, comment, privateKey) {
        try {
            let addressFormat = 0;
            if (this.isLedger) {

                if (!this.ledgerApp) {
                    await this.createLedger(localStorage.getItem('ledgerTransportType') || 'hid');
                }

                const toAddress_ = new Address(toAddress);
                if (toAddress_.isUserFriendly) {
                    addressFormat += this.ledgerApp.ADDRESS_FORMAT_USER_FRIENDLY;
                    if (toAddress_.isUrlSafe) {
                        addressFormat += this.ledgerApp.ADDRESS_FORMAT_URL_SAFE;
                    }
                    if (toAddress_.isBounceable) {
                        addressFormat += this.ledgerApp.ADDRESS_FORMAT_BOUNCEABLE;
                    }
                    if (toAddress_.isTestOnly) {
                        addressFormat += this.ledgerApp.ADDRESS_FORMAT_TEST_ONLY;
                    }
                }
            }

            if (!this.checkContractInitialized(await this.ton.provider.getWalletInfo(toAddress))) {
                toAddress = (new Address(toAddress)).toString(true, true, false);
            }

            if (this.isLedger) {

                const wallet = await this.getWallet(this.myAddress);
                let seqno = this.isUsingCustomWallet() ? await this.getSeqno(this.myAddress) : wallet.seqno;
                if (!seqno) seqno = 0;

                const query = await this.ledgerApp.transfer(ACCOUNT_NUMBER, this.walletContract, toAddress, amount, seqno, addressFormat);
                this.sendingData = {toAddress: toAddress, amount: amount, comment: comment, query: query};

                this.sendToView('showPopup', {name: 'processing'});
                this.processingVisible = true;

                await this.sendQuery(query);

            } else {

                const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
                const query = await this.sign(toAddress, amount, comment, keyPair);
                this.sendingData = {toAddress: toAddress, amount: amount, comment: comment, query: query};
                await this.sendQuery(query);

            }
        } catch (e) {
            console.error(e);
            this.sendToView('closePopup');
            alert('Error sending');
        }
    }

    /**
     * @param hex   {string} hex to sign
     * @param privateKey    {string}
     * @returns {Promise<string>} signature in hex
     */
    rawSign(hex, privateKey) {
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        const signature = nacl.sign.detached(TonWeb.utils.hexToBytes(hex), keyPair.secretKey);
        return TonWeb.utils.bytesToHex(signature);
    }

    /**
     * @param query - return by sign()
     * @return {Promise<void>}
     */
    async sendQuery(query) {
        console.log('Send');
        const sendResponse = await query.send();
        if (sendResponse["@type"] === "ok") {
            // wait for transaction, then show Done popup
        } else {
            this.sendToView('closePopup');
            alert('Send error');
        }
    }

    // DISCONNECT WALLET

    onDisconnectClick() {
        this.myAddress = null;
        this.publicKeyHex = null;
        this.balance = null;
        this.walletContract = null;
        this.transactions = [];
        this.lastTransactionTime = 0;
        this.isContractInitialized = false;
        this.sendingData = null;
        this.processingVisible = false;
        this.isLedger = false;
        this.ledgerApp = null;
        clearInterval(this.updateIntervalId);
        localStorage.clear();
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

    sendToView(method, params, needQueue) {
        if (window.view) {
            window.view.onMessage(method, params);
        } else {
            const msg = {method, params};
            if (popupPort) {
                popupPort.postMessage(msg);
            } else {
                if (needQueue) {
                    queueToPopup.push(msg);
                }
            }
        }
    }

    onViewMessage(method, params) {
        switch (method) {
            case 'showScreen':
                switch (params.name) {
                    case 'created':
                        this.showCreated();
                        break;
                    case 'import':
                        this.showImport();
                        break;
                    case 'importLedger':
                        this.importLedger(params.transportType);
                        break;
                }
                break;
            case 'import':
                this.import(params.words);
                break;
            case 'createPrivateKey':
                this.createPrivateKey();
                break;
            case 'passwordCreated':
                this.savePrivateKey(params.password);
                break;
            case 'update':
                this.update(true);
                break;
            case 'showAddressOnDevice':
                this.showAddressOnDevice();
                break;
            case 'onEnterPassword':
                this.onEnterPassword(params.password);
                break;
            case 'onChangeWalletAddress':
                this.onChangeWalletAddress(params.walletAddress);
                break;
            case 'onRestoreWalletAddress':
                this.onChangeWalletAddress(localStorage.getItem('defaultAddress') || localStorage.getItem('address'));
                break;
            case 'onChangePassword':
                this.onChangePassword(params.oldPassword, params.newPassword);
                break;
            case 'onSend':
                this.showSendConfirm(new BN(params.amount), params.toAddress, params.comment);
                break;
            case 'onBackupDone':
                this.onBackupDone();
                break;
            case 'showMain':
                this.showMain();
                break;
            case 'onBackupWalletClick':
                this.onBackupWalletClick();
                break;
            case 'disconnect':
                this.onDisconnectClick();
                break;
            case 'onClosePopup':
                this.processingVisible = false;
                break;
            case 'onMagicClick':
                localStorage.setItem('magic', params ? 'true' : 'false');
                this.doMagic(params);
                break;
            case 'onProxyClick':
                localStorage.setItem('proxy', params ? 'true' : 'false');
                this.doProxy(params);
                break;
        }
    }

    // TRANSPORT WITH DAPP

    sendToDapp(method, params) {
        if (contentScriptPort) {
            contentScriptPort.postMessage(JSON.stringify({
                type: 'gramWalletAPI',
                message: {jsonrpc: '2.0', method: method, params: params}
            }));
        }
    }

    async onDappMessage(method, params) {
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1102.md
        const needQueue = !popupPort;

        switch (method) {
            case 'ton_requestAccounts':
                return (this.myAddress ? [this.myAddress] : []);
            case 'ton_getBalance':
                return (this.balance ? this.balance.toString() : '');
            case 'ton_sendTransaction':
                const param = params[0];
                if (!popupPort) {
                    showExtensionPopup();
                }
                if (param.dataType === 'hex') {
                    param.data = TonWeb.utils.hexToBytes(param.data);
                } else if (param.dataType === 'base64') {
                    param.data = TonWeb.utils.base64ToBytes(param.data);
                } else if (param.dataType === 'boc') {
                    param.data = TonWeb.boc.Cell.fromBoc(TonWeb.utils.base64ToBytes(param.data))[0];
                }
                this.showSendConfirm(new BN(param.value), param.to, param.data, needQueue);
                return true;
            case 'ton_rawSign':
                const signParam = params[0];
                if (!popupPort) {
                    showExtensionPopup();
                }
                return this.showSignConfirm(signParam.data, needQueue);
            case 'flushMemoryCache':
                await chrome.webRequest.handlerBehaviorChanged();
                return true;
        }
    }
}

const controller = new Controller();

if (chrome.runtime && chrome.runtime.onConnect) {
    chrome.runtime.onConnect.addListener(port => {
        if (port.name === 'gramWalletContentScript') {
            contentScriptPort = port;
            contentScriptPort.onMessage.addListener(async msg => {
                if (!msg.message) return;
                const result = await controller.onDappMessage(msg.message.method, msg.message.params);
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
                controller.onViewMessage(msg.method, msg.params);
            });
            popupPort.onDisconnect.addListener(() => {
                popupPort = null;
            });
            controller.initView()
            queueToPopup.forEach(msg => popupPort.postMessage(msg));
            queueToPopup.length = 0;
        }
    });
}
