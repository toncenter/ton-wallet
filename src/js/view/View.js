import {
    $, clearElement,
    copyToClipboard,
    createElement,
    formatDate,
    formatDateFull,
    formatTime,
    IMPORT_WORDS_COUNT,
    onInput, setAddr,
    toggle,
} from "./Utils.js";

import {initLotties, lotties} from "./Lottie.js";
import DropDown from "./DropDown.js";

const toNano = TonWeb.utils.toNano;
const formatNanograms = TonWeb.utils.fromNano;
const BN = TonWeb.utils.BN;

function toggleLottie(lottie, visible) {
    if (visible) {
        lottie.player.play();
    } else {
        lottie.player.stop();
        lottie.ctx.clearRect(0, 0, 1000, 1000);
    }
}

class View {
    constructor(mnemonicWords) {
        /** @type   {[string]} */
        this.mnemonicWords = mnemonicWords;
        /** @type {Controller} */
        this.controller = null;
        this.port = null;
        /** @type   {string} */
        this.myAddress = null;
        /** @type   {BN} */
        this.balance = null;
        /** @type   {string} */
        this.currentScreenName = null;
        /** @type   {boolean} */
        this.isTestnet = false;

        this.createImportInputs();

        initLotties().then(() => {
            const lottie = lotties[this.currentScreenName];
            if (lottie) {
                toggleLottie(lottie, true);
            }
        });

        function resetErrors(e) {
            const input = e.target;
            input.classList.remove('error');
        }

        onInput($('#amountInput'), resetErrors);
        onInput($('#toWalletInput'), resetErrors);
        onInput($('#createPassword_repeatInput'), resetErrors);
        onInput($('#enterPassword_input'), resetErrors);
        onInput($('#changePassword_oldInput'), resetErrors);
        onInput($('#changePassword_newInput'), resetErrors);
        onInput($('#changePassword_repeatInput'), resetErrors);

        function getClipboardData(e) {
            const s = (e.clipboardData || window.clipboardData).getData('text');
            try {
                return decodeURI(s).replaceAll(/%23/g, '#');
            } catch (e) { // URIError
                return s;
            }
        }

        $('#toWalletInput').addEventListener('paste', e => {
            // ton://transfer/EQA0i8-CdGnF_DhUHHf92R1ONH6sIA9vLZ_WLcCIhfBBXwtG
            // ton://transfer/EQA0i8-CdGnF_DhUHHf92R1ONH6sIA9vLZ_WLcCIhfBBXwtG?amount=1000000000
            // ton://transfer/EQA0i8-CdGnF_DhUHHf92R1ONH6sIA9vLZ_WLcCIhfBBXwtG?amount=1000000000&text=data

            const url = getClipboardData(e);

            if (url.startsWith('ton://transfer/')) {
                if (!(url.length === 63 || url[63] === '?')) {
                    e.preventDefault();
                    return;
                }
                let s = url.substring('ton://transfer/'.length);
                $('#toWalletInput').value = s.substring(0, 48);
                s = s.substring(49);
                const pairs = s.split('&');
                pairs
                    .map(p => p.split('='))
                    .forEach(arr => {
                        if (arr[0] === 'amount') {
                            $('#amountInput').value = TonWeb.utils.fromNano(new BN(arr[1]));
                        } else if (arr[0] === 'text') {
                            $('#commentInput').value = arr[1];
                        }
                    });

                e.preventDefault();
            }
        });

        onInput($('#invoice_amountInput'), () => this.updateInvoiceLink());
        onInput($('#invoice_commentInput'), () => this.updateInvoiceLink());

        $("#start_createBtn").addEventListener('click', () => this.sendMessage('showScreen', {name: 'created'}));
        $("#start_importBtn").addEventListener('click', () => this.sendMessage('showScreen', {name: 'import'}));

        let needShowLedger = false;
        try {
            needShowLedger = window.location.href.indexOf('ledgerReview') > -1;
        } catch (e) {

        }
        if (needShowLedger) {
            toggle($("#start_importLedgerHidBtn"), 'inline-block');
        }

        $("#start_importLedgerHidBtn").addEventListener('click', () => {
            this.showPopup('connectLedger');
            this.sendMessage('showScreen', {name: 'importLedger', transportType: 'hid'})
        });
        // $("#start_importLedgerBleBtn").addEventListener('click', () => this.sendMessage('showScreen', {name: 'importLedger', transportType: 'ble'}));

        // $('#main_buyBtn').addEventListener('click', () => {
        //     window.open('https://exchange.mercuryo.io/?currency=TONCOIN&address=' + this.myAddress, '_blank');
        // });

        $('#import_alertBtn').addEventListener('click', () => alert('Too Bad. Without the secret words, you can\'t restore access to your wallet.'));
        $('#import_continueBtn').addEventListener('click', async () => this.sendMessage('import', {words: await this.getImportWords()}));

        $('#createdContinueButton').addEventListener('click', () => this.sendMessage('createPrivateKey'));

        $('#backup_continueBtn').addEventListener('click', () => this.sendMessage('onBackupDone'));

        $('#createPassword_continueBtn').addEventListener('click', () => {
            const password = $('#createPassword_input').value;
            const passwordRepeat = $('#createPassword_repeatInput').value;

            const isEmpty = password.length === 0 && !this.isTestnet;

            if (isEmpty) {
                $('#createPassword_input').classList.add('error');
            } else if (password !== passwordRepeat) {
                $('#createPassword_repeatInput').classList.add('error');
            } else {
                this.sendMessage('passwordCreated', {password});
            }
        });

        $('#readyToGo_continueBtn').addEventListener('click', () => this.sendMessage('showMain'));

        $('#main_refreshBtn').addEventListener('click', () => {
            this.setUpdating(true);
            this.sendMessage('update')
        });
        $('#main_settingsButton').addEventListener('click', () => this.onSettingsClick());

        $('#main_receiveBtn').addEventListener('click', () => {
            toggle($('#receive_showAddressOnDeviceBtn'), !!this.isLedger);
            this.showPopup('receive');
        });
        $('#sendButton').addEventListener('click', () => this.onMessage('showPopup', {name: 'send'}));

        $('#modal').addEventListener('click', () => this.closePopup());

        $('#menu_magic').addEventListener('click', () => {
            $('#menu_magic .dropdown-toggle').classList.toggle('toggle-on');
            const isTurnedOn = $('#menu_magic .dropdown-toggle').classList.contains('toggle-on');
            $('#menu_telegram').classList.toggle('menu_telegram-show', isTurnedOn);
            this.sendMessage('onMagicClick', isTurnedOn);
        });

        $('#menu_telegram').addEventListener('click', () => {
            chrome.tabs.update({url: 'https://web.telegram.org/z'});
        });

        $('#menu_proxy').addEventListener('click', () => {
            $('#menu_proxy .dropdown-toggle').classList.toggle('toggle-on');
            this.sendMessage('onProxyClick', $('#menu_proxy .dropdown-toggle').classList.contains('toggle-on'));
        });

        $('#menu_about').addEventListener('click', () => this.showPopup('about'));
        $('#menu_changePassword').addEventListener('click', () => this.onMessage('showPopup', {name: 'changePassword'}));
        $('#menu_backupWallet').addEventListener('click', () => this.sendMessage('onBackupWalletClick'));
        $('#menu_delete').addEventListener('click', () => this.showPopup('delete'));

        $('#receive_showAddressOnDeviceBtn').addEventListener('click', () => this.onShowAddressOnDevice());
        $('#receive_invoiceBtn').addEventListener('click', () => this.onCreateInvoiceClick());
        $('#receive_shareBtn').addEventListener('click', () => this.onShareAddressClick(false));
        $('#receive .addr').addEventListener('click', () => this.onShareAddressClick(true));
        $('#receive_closeBtn').addEventListener('click', () => this.closePopup());

        $('#invoice_qrBtn').addEventListener('click', () => this.onCreateInvoiceQrClick());
        $('#invoice_shareBtn').addEventListener('click', () => this.onShareInvoiceClick());
        $('#invoice_closeBtn').addEventListener('click', () => this.showPopup('receive'));

        $('#invoiceQr_shareBtn').addEventListener('click', () => this.onShareInvoiceClick());
        $('#invoiceQr_closeBtn').addEventListener('click', () => this.showPopup('invoice'));

        $('#transaction_sendBtn').addEventListener('click', () => this.onTransactionButtonClick());
        $('#transaction_closeBtn').addEventListener('click', () => this.closePopup());

        $('#connectLedger_cancelBtn').addEventListener('click', () => this.closePopup());

        $('#send_btn').addEventListener('click', () => {
            const amount = Number($('#amountInput').value);
            const amountNano = toNano(amount);
            if (amountNano.lte(0) || this.balance.lt(amountNano)) {
                $('#amountInput').classList.add('error');
                return;
            }
            const toAddress = $('#toWalletInput').value;
            if (!TonWeb.Address.isValid(toAddress)) {
                $('#toWalletInput').classList.add('error');
                return;
            }
            const comment = $('#commentInput').value;

            this.sendMessage('onSend', {amount: amountNano.toString(), toAddress, comment});
        });
        $('#send_closeBtn').addEventListener('click', () => this.closePopup());

        $('#sendConfirm_closeBtn').addEventListener('click', () => this.closePopup());
        $('#sendConfirm_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#sendConfirm_okBtn').addEventListener('click', () => this.onMessage('showPopup', {name: 'enterPassword'}));

        $('#signConfirm_closeBtn').addEventListener('click', () => this.closePopup());
        $('#signConfirm_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#signConfirm_okBtn').addEventListener('click', () => this.onMessage('showPopup', {name: 'enterPassword'}));

        $('#processing_closeBtn').addEventListener('click', () => this.closePopup());
        $('#done_closeBtn').addEventListener('click', () => this.closePopup());
        $('#about_closeBtn').addEventListener('click', () => this.closePopup());

        $('#menu_changeWalletAddress').addEventListener('click', () => this.onMessage('showPopup', {name: 'changeWalletAddress'}));
        $('#changeWalletAddress_okBtn').addEventListener('click', async () => {
            const walletAddress = $('#changeWalletAddress_newInput').value;
            this.sendMessage('onChangeWalletAddress', {walletAddress});
        });
        $('#changeWalletAddress_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#changeWalletAddress_restoreDefaults').addEventListener('click', async () => {
            this.sendMessage('onRestoreWalletAddress', {});
        });

        $('#changePassword_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#changePassword_okBtn').addEventListener('click', async () => {
            const oldPassword = $('#changePassword_oldInput').value;
            const newPassword = $('#changePassword_newInput').value;
            const passwordRepeat = $('#changePassword_repeatInput').value;

            const isEmpty = newPassword.length === 0 && !this.isTestnet;

            if (isEmpty) {
                $('#changePassword_newInput').classList.add('error');
                return;
            }

            if (newPassword !== passwordRepeat) {
                $('#changePassword_repeatInput').classList.add('error');
                return;
            }

            this.sendMessage('onChangePassword', {oldPassword, newPassword});
        });

        $('#enterPassword_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#enterPassword_okBtn').addEventListener('click', async () => {
            const password = $('#enterPassword_input').value;

            this.sendMessage('onEnterPassword', {password})
        });

        $('#delete_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#delete_okBtn').addEventListener('click', () => this.sendMessage('disconnect'));
    }

    // COMMON

    showScreen(name) {
        this.closePopup();

        const screens = ['start', 'created', 'backup', 'import', 'createPassword', 'readyToGo', 'main'];

        screens.forEach(screen => {
            const display = screen === 'main' ? 'flex' : 'block';
            toggle($('#' + screen), name === screen ? display : false);

            const lottie = lotties[screen];
            if (lottie) {
                toggleLottie(lottie, name === screen);
            }
        });
        this.currentScreenName = name;

        window.scrollTo(0, 0);
    }

    showPopup(name) {
        $('#enterPassword_input').value = '';

        toggle($('#modal'), name !== '');

        const popups = ['receive', 'invoice', 'invoiceQr', 'send', 'sendConfirm', 'signConfirm', 'processing', 'done', 'menuDropdown', 'about', 'delete', 'changePassword', 'changeWalletAddress', 'enterPassword', 'transaction', 'connectLedger'];

        popups.forEach(popup => {
            toggle($('#' + popup), name === popup);
            const lottie = lotties[popup];
            if (lottie) {
                toggleLottie(lottie, name === popup);
            }
        });
    }

    isPopupVisible(name) {
        return $('#' + name).style.display === 'block';
    }

    closePopup() {
        this.showPopup('');
        this.sendMessage('onClosePopup');
    }

    // BACKUP SCREEN

    setBackupWords(words) {
        const createBackupWord = n => {
            $('#createWords').appendChild(
                createElement({
                    tag: 'div',
                    clazz: 'create-word-item',
                    child: [
                        createElement({
                            tag: 'span',
                            clazz: 'word-num',
                            text: (n + 1) + '.'
                        }),
                        createElement({
                            tag: 'span',
                            style: {
                                'font-weight': 'bold'
                            },
                            text: words[n]
                        })
                    ]
                })
            );
        };

        clearElement($('#createWords'));
        for (let i = 0; i < words.length / 2; i++) {
            createBackupWord(i);
            createBackupWord(i + 12);
        }
    }

    clearBackupWords() {
        clearElement($('#createWords'));
    }

    // IMPORT SCREEN

    createImportInputs() {
        const onEnter = input => {
            const i = Number(input.getAttribute('tabindex'));
            if (i === IMPORT_WORDS_COUNT) {

            } else {
                $('#importInput' + i).focus();
            }
        };

        this.importDropDown = new DropDown($('#wordsPopup'), onEnter, this.mnemonicWords);

        let lastInput = null;

        const showWordsPopup = input => {
            const text = input.value;
            if (text === null || text.length === 0) {
                toggle($('#wordsPopup'), false);
                return;
            }

            this.importDropDown.show(input, text.toLowerCase());
        };

        function onWordInput(e) {
            const input = e.target;
            input.classList.remove('error');

            showWordsPopup(input);
        }

        const onFocusIn = (e) => {
            const input = e.target;
            lastInput = input;
            showWordsPopup(input);
        };

        const onFocusOut = (e) => {
            toggle($('#wordsPopup'), false);
            if (lastInput) {
                const value = lastInput.value.toLowerCase().trim();
                if (value.length > 0 && this.mnemonicWords.indexOf(value) === -1) {
                    lastInput.classList.add('error');
                } else {
                    lastInput.classList.remove('error');
                }
            }
        };

        const onKeyDown = (e) => {
            const input = e.target;
            switch (e.key) {
                case 'Enter':
                    const selectedText = this.importDropDown.getSelectedText();
                    if (selectedText) {
                        input.value = selectedText;
                        input.classList.remove('error');
                        this.importDropDown.hide();
                    }
                    onEnter(input);
                    break;
                case 'ArrowUp':
                    this.importDropDown.up();
                    break;
                case 'ArrowDown':
                    this.importDropDown.down();
                    break;
            }
        };

        const onPaste = (event) => {
            const text = (event.clipboardData || window.clipboardData).getData('text');
            let arr = text.split(' ');
            if (arr.length !== IMPORT_WORDS_COUNT) {
                arr = text.split(',');
            }
            if (arr.length === IMPORT_WORDS_COUNT) {
                for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
                    const input = $('#importInput' + i);
                    const value = arr[i].toLowerCase().trim();
                    if (!value || this.mnemonicWords.indexOf(value) === -1) {
                        input.classList.add('error');
                    } else {
                        input.classList.remove('error');
                    }
                    input.value = value;
                }
                event.preventDefault();
            }
        }

        const createInput = (n) => {
            const inputContainer = createElement({tag: 'div', clazz: 'word-item'});
            const span = createElement({tag: 'span', clazz: 'word-num', text: (n + 1) + '.'});
            inputContainer.appendChild(span);
            const input = createElement({tag: 'input'});
            input.id = 'importInput' + n;
            input.type = 'text';
            input.tabIndex = n + 1;
            inputContainer.appendChild(input);

            input.addEventListener('focusin', onFocusIn);
            input.addEventListener('focusout', onFocusOut);
            input.addEventListener('keydown', onKeyDown);
            input.addEventListener('paste', onPaste);
            onInput(input, onWordInput);

            $('#importWords').appendChild(inputContainer);
        };

        for (let i = 0; i < IMPORT_WORDS_COUNT / 2; i++) {
            createInput(i);
            createInput(i + IMPORT_WORDS_COUNT / 2);
        }
    }

    clearImportWords() {
        toggle($('#wordsPopup'), false);
        for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
            const input = $('#importInput' + i);
            input.value = '';
            input.classList.remove('error');
        }
    }

    async getImportWords() {
        let isValid = true;
        const words = [];
        for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
            const input = $('#importInput' + i);
            const value = input.value.toLowerCase().trim();
            if (!value || this.mnemonicWords.indexOf(value) === -1) {
                input.classList.add('error');
                isValid = false;
            }
            words.push(value);
        }

        if (isValid) {
            isValid = await TonWeb.mnemonic.validateMnemonic(words);
            if (!isValid) {
                for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
                    const input = $('#importInput' + i);
                    input.classList.add('error');
                }
            }
        }

        return isValid ? words : null;
    }

    // CREATE PASSWORD SCREEN

    clearCreatePassword() {
        $('#createPassword_input').value = '';
        $('#createPassword_repeatInput').value = '';
    }

    // CHANGE PASSWORD POPUP

    clearChangePassword() {
        $('#changePassword_oldInput').value = '';
        $('#changePassword_newInput').value = '';
        $('#changePassword_repeatInput').value = '';
    }

    // MAIN SCREEN

    setUpdating(updating) {
        $('#updateLabel').innerText = updating ? 'updating..' : 'updated just now';
    }

    onSettingsClick() {
        toggle($('#modal'), true);
        toggle($('#menuDropdown'), true);
        toggle($('#menu_changePassword'), !this.isLedger);
        toggle($('#menu_backupWallet'), !this.isLedger);
    }

    clearBalance() {
        clearElement($('#balance'));
        $('#balance').innerText = '💎';
        clearElement($('#transactionsList'));
        toggle($('#walletCreated'), false);
    }

    setBalance(balance, txs) {
        this.balance = balance;
        let s = formatNanograms(balance);
        if (s === '0') s = '0.00';
        const i = s.indexOf('.');
        const first = s.substring(0, i);
        const last = s.substring(i);

        clearElement($('#balance'));
        $('#balance').appendChild(createElement({tag: 'span', text: first}));
        $('#balance').appendChild(createElement({tag: 'span', style: {'font-size': '24px'}, text: last}));
        $('#balance').appendChild(createElement({tag: 'span', text: ' 💎'}));

        $('#sendBalance').innerText = 'Balance: ' + s + ' 💎';
        toggle($('#sendButton'), balance.gt(new BN(0)) ? 'inline-block' : 'none');
        this.setTransactions(txs);
        this.setUpdating(false);
    }

    setTransactions(txs) {
        clearElement($('#transactionsList'));
        let date = '';

        toggle($('#walletCreated'), txs.length === 0);

        txs.forEach(tx => {
            tx.amount = new BN(tx.amount);
            tx.fee = new BN(tx.fee);
            tx.otherFee = new BN(tx.otherFee);
            tx.storageFee = new BN(tx.storageFee);
            tx.date = new Date(tx.date);

            const txDate = formatDate(tx.date);
            if (date !== txDate) {
                this.addDateSeparator(txDate);
                date = txDate;
            }
            this.addTx(tx)
        });
    }

    addDateSeparator(dateString) {
        $('#transactionsList').appendChild(createElement({tag: 'div', clazz: 'date-separator', text: dateString}));
    }

    addTx(tx) {
        const isReceive = !tx.amount.isNeg();
        const amountFormatted = formatNanograms(tx.amount);
        const addr = isReceive ? tx.from_addr : tx.to_addr;

        const item = createElement({
            tag: 'div',
            clazz: 'tx-item',
            child: [
                createElement({
                    tag: 'div',
                child: isReceive ? [
                    createElement({tag: 'span', clazz: ['tx-amount', 'tx-amount-green'], text: '+' + amountFormatted}),
                    createElement({tag: 'span', text: ' 💎'}),
                    createElement({tag: 'span', clazz: 'tx-from', text: ' from:'})
                ] : [
                    createElement({tag: 'span', clazz: 'tx-amount', text: amountFormatted}),
                    createElement({tag: 'span', text: ' 💎'}),
                    createElement({tag: 'span', clazz: 'tx-from', text: ' to:'})
                ]}),
                setAddr(createElement({tag: 'div', clazz: ['tx-addr', 'addr']}), addr),
                tx.comment ? createElement({tag: 'div', clazz: 'tx-comment', text: tx.comment}) : undefined,
                createElement({tag: 'div', clazz: 'tx-fee', text: `blockchain fees: ${formatNanograms(tx.fee)}` }),
                createElement({tag: 'div', clazz: 'tx-item-date', text: formatTime(tx.date)})
            ]
        })

        item.addEventListener('click', () => this.onTransactionClick(tx));

        $('#transactionsList').appendChild(item);
    }

    // TRANSACTION POPUP

    onTransactionClick(tx) {
        this.showPopup('transaction');
        const isReceive = !tx.amount.isNeg();
        const addr = isReceive ? tx.from_addr : tx.to_addr;
        this.currentTransactionAddr = addr;
        const amountFormatted = formatNanograms(tx.amount);
        $('#transactionAmount').innerText = (isReceive ? '+' + amountFormatted : amountFormatted) + ' 💎';
        $('#transactionFee').innerText = formatNanograms(tx.otherFee) + ' transaction fee';
        $('#transactionStorageFee').innerText = formatNanograms(tx.storageFee) + ' storage fee';
        $('#transactionSenderLabel').innerText = isReceive ? 'Sender' : 'Recipient';
        setAddr($('#transactionSender'), addr);
        toggle($('#transactionCommentLabel'), !!tx.comment);
        $('#transactionComment').innerText = tx.comment;
        $('#transactionDate').innerText = formatDateFull(tx.date);
    }

    onTransactionButtonClick() {
        this.onMessage('showPopup', {name: 'send', toAddr: this.currentTransactionAddr});
    }

    // SEND POPUP

    clearSend() {
        $('#toWalletInput').value = '';
        $('#amountInput').value = '';
        $('#commentInput').value = '';
    }

    // RECEIVE POPUP

    setMyAddress(address) {
        setAddr($('#receive .addr'), address);
        clearElement($('#qr'));
        const options = {
            text: 'ton://transfer/' + address,
            width: 185 * window.devicePixelRatio,
            height: 185 * window.devicePixelRatio,
            logo: "assets/gem@large.png",
            logoWidth: 44 * window.devicePixelRatio,
            logoHeight: 44 * window.devicePixelRatio,
            correctLevel: QRCode.CorrectLevel.L
        };
        new QRCode($('#qr'), options);
    }

    onShareAddressClick(onyAddress) {
        const data = onyAddress ? this.myAddress : 'ton://transfer/' + this.myAddress;
        const text = onyAddress ? 'Wallet address copied to clipboard' : 'Transfer link copied to clipboard';
        $('#notify').innerText = copyToClipboard(data) ? text : 'Can\'t copy link';
        toggle($('#notify'), true);
        setTimeout(() => toggle($('#notify'), false), 2000);
    }

    onShowAddressOnDevice() {
        this.sendMessage('showAddressOnDevice');
        $('#notify').innerText = 'Please check the address on your device';
        toggle($('#notify'), true);
        setTimeout(() => toggle($('#notify'), false), 2000);
    }

    // RECEIVE INVOICE POPUP

    onCreateInvoiceClick() {
        this.onMessage('showPopup', {name: 'invoice'});
    }

    updateInvoiceLink() {
        $('#invoice_link').innerText = this.getInvoiceLink();
    };

    getInvoiceLink() {
        let url = 'ton://transfer/' + this.myAddress;

        const params = [];

        const amount = $('#invoice_amountInput').value;
        if (amount) {
            params.push('amount=' + toNano(Number(amount)));
        }
        const comment = $('#invoice_commentInput').value;
        if (comment) {
            params.push('text=' + comment);
        }

        if (params.length === 0) return url;
        else return url + '?' + params.join('&');
    }

    onShareInvoiceClick() {
        $('#notify').innerText = copyToClipboard(this.getInvoiceLink()) ? 'Transfer link copied to clipboard' : 'Can\'t copy link';
        toggle($('#notify'), true);
        setTimeout(() => toggle($('#notify'), false), 2000);
    }

    // RECEIVE INVOICE QR POPUP

    onCreateInvoiceQrClick() {
        this.onMessage('showPopup', {name: 'invoiceQr'});
    }

    drawInvoiceQr(link) {
        clearElement($('#invoiceQrImg'));
        const options = {
            text: link,
            width: 185 * window.devicePixelRatio,
            height: 185 * window.devicePixelRatio,
            logo: "assets/gem@large.png",
            logoWidth: 44 * window.devicePixelRatio,
            logoHeight: 44 * window.devicePixelRatio,
            correctLevel: QRCode.CorrectLevel.L
        };
        new QRCode($('#invoiceQrImg'), options);
    }

    // TRANSPORT

    // send message to Controller.js
    sendMessage(method, params) {
        if (this.controller) {
            this.controller.onViewMessage(method, params);
        } else {
            this.port.postMessage({method, params});
        }
    }

    // receive message from Controller.js
    onMessage(method, params) {
        switch (method) {
            case 'disableCreated':
                $('#createdContinueButton').disabled = params;
                break;

            case 'setIsTestnet':
                this.isTestnet = params;
                $('.your-balance').innerText = params ? 'Your testnet balance' : 'Your mainnet balance';
                break;

            case 'setBalance':
                this.setBalance(new BN(params.balance), params.txs);
                break;

            case 'setIsLedger':
                this.isLedger = params;
                break;

            case 'setIsMagic':
                const isTurnedOn = params;
                $('#menu_magic .dropdown-toggle').classList.toggle('toggle-on', isTurnedOn);
                $('#menu_telegram').classList.toggle('menu_telegram-show', isTurnedOn);
                break;

            case 'setIsProxy':
                if (params) {
                    $('#menu_proxy .dropdown-toggle').classList.add('toggle-on');
                } else {
                    $('#menu_proxy .dropdown-toggle').classList.remove('toggle-on');
                }
                break;

            case 'showChangePasswordError':
                $('#changePassword_oldInput').classList.add('error');
                break;

            case 'showEnterPasswordError':
                $('#enterPassword_input').classList.add('error');
                break;

            case 'changeWalletAddressError':
                $('#changeWalletAddress_newInput').classList.add('error');
                break;

            case 'showScreen':
                this.showScreen(params.name);

                switch (params.name) {
                    case 'start':
                        this.clearBalance();
                        break;
                    case 'created':
                        break;
                    case 'import':
                        this.clearImportWords();
                        $('#importInput0').focus();
                        break;
                    case 'backup':
                        this.setBackupWords(params.words);
                        break;
                    case 'createPassword':
                        this.clearImportWords();
                        this.clearCreatePassword();
                        $('#createPassword_input').focus();
                        break;
                    case 'readyToGo':
                        this.clearCreatePassword();
                        break;
                    case 'main':
                        this.clearBackupWords();
                        if (params.myAddress) {
                            this.myAddress = params.myAddress;
                            this.setMyAddress(params.myAddress);
                        }
                        break;
                }
                break;

            case 'showPopup':
                this.showPopup(params.name);

                switch (params.name) {
                    case 'changePassword':
                        this.clearChangePassword();
                        $('#changePassword_oldInput').focus();
                        break;
                    case 'changeWalletAddress':
                        $('#changeWalletAddress_newInput').value = window.localStorage['address'];
                        $('#changeWalletAddress_newInput').focus();
                        break;
                    case 'enterPassword':
                        $('#enterPassword_input').focus();
                        break;
                    case 'done':
                        $('#done .popup-grey-text').innerText = params.message;
                        break;
                    case 'invoice':
                        $('#invoice_amountInput').value = '';
                        $('#invoice_commentInput').value = '';
                        this.updateInvoiceLink();
                        $('#invoice_amountInput').focus();
                        break;
                    case 'invoiceQr':
                        this.drawInvoiceQr(this.getInvoiceLink());
                        $('#invoiceQrAmount').innerText = $('#invoice_amountInput').value;
                        break;
                    case 'send':
                        this.clearSend();
                        if (params.toAddr) {
                            $('#toWalletInput').value = params.toAddr;
                        }
                        toggle($('#commentInput'), !this.isLedger);
                        $('#toWalletInput').focus();
                        break;
                    case 'sendConfirm':
                        $('#sendConfirmAmount').innerText = formatNanograms(new BN(params.amount)) + ' TON';
                        setAddr($('#sendConfirmAddr'), params.toAddress);
                        $('#sendConfirmFee').innerText = params.fee ? 'Fee: ~' + formatNanograms(new BN(params.fee)) + ' TON' : '';
                        toggle($('#sendConfirm .popup-footer'), !this.isLedger);
                        toggle($('#sendConfirm_closeBtn'), !this.isLedger);
                        // todo: show label 'Please approve on device'
                        break;
                    case 'signConfirm':
                        const hex = params.data.length > 48 ? params.data.substring(0, 47) + '…' : params.data;
                        setAddr($('#signConfirmData'), hex);
                        break;
                }
                break;

            case 'closePopup':
                this.closePopup();
                break;
        }
    }
}

window.view = new View(TonWeb.mnemonic.wordlists.EN);

try {
    const port = chrome.runtime.connect({name: 'gramWalletPopup'})
    window.view.port = port;
    port.onMessage.addListener(function (msg) {
        window.view.onMessage(msg.method, msg.params);
    });
} catch (e) {

}


