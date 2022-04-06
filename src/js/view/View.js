import {
    $, $$, clearElement,
    copyToClipboard,
    createElement,
    IMPORT_WORDS_COUNT,
    CONFIRM_WORDS_COUNT,
    onInput, setAddr,
    toggle,
    toggleFaded,
    triggerClass
} from "./Utils.js";

import {
    getAvailableLocales, getLocaleItem as l, setElementLocaleText,
    formatDate, formatTime, formatDateTime, setLocalesDebug, setupLocale
 } from './Locales.js';

import {initLotties, toggleLottie, lotties} from "./Lottie.js";
import DropDown from "./DropDown.js";

const IS_EXTENSION = !!(self.chrome && chrome.runtime && chrome.runtime.onConnect);

const toNano = TonWeb.utils.toNano;
const formatNanograms = TonWeb.utils.fromNano;
const BN = TonWeb.utils.BN;

const IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

const logXssAttentionMessage = () => {
    if (window.top !== window || !window.console) return;

    console.log(
        '%c%s', 'color: red; background: yellow; font-size: 24px;',
        l('xss_attention.title')
    );
    console.log('%c%s', 'font-size: 18px;', l('xss_attention.message'));
};

const drawQRCode = (text, containerSelector) => {
    const $container = $(containerSelector);

    clearElement($container);

    new QRCode($container, {
        text: text,
        width: 185 * window.devicePixelRatio,
        height: 185 * window.devicePixelRatio,
        colorDark: '#303757',
        logo: "assets/ui/qr-logo.png",
        logoBackgroundTransparent: false,
        logoWidth: 44 * window.devicePixelRatio,
        logoHeight: 44 * window.devicePixelRatio,
        correctLevel: QRCode.CorrectLevel.L
    });

    const canvas = $container.querySelector('canvas');
    canvas.style.width = '185px';
    canvas.style.height = '185px';
};

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
        /** @type   {boolean} */
        this.isDebug = false;
        /** @type   {string} */
        this.popup = ''; // current opened popup

        this.createWordInputs({
            count: IMPORT_WORDS_COUNT,
            dropdownId: '#wordsPopup',
            inputId: '#importsInput',
            containerId: '#importWords',
            multiColumns: true
        });
        this.createWordInputs({
            count: CONFIRM_WORDS_COUNT,
            dropdownId: '#wordsConfirmPopup',
            inputId: '#confirmInput',
            containerId: '#confirmWords',
            multiColumns: false
        });

        this._initLotties = initLotties().then(() => toggleLottie(lotties[this.currentScreenName], true));

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

        const availableLocales = getAvailableLocales();
        const $localesDropdown = $('#localesDropdown');

        Object.keys(availableLocales).forEach(localeId => {
            $localesDropdown.appendChild(createElement({
                tag: 'div',
                clazz: 'dropdown-item',
                text: availableLocales[localeId],
                dataset: { locale: localeId }
            }));
        });

        $('#toWalletInput').addEventListener('paste', e => {
            const urlString = getClipboardData(e);
            if (!urlString.startsWith('ton://')) return;

            let parsedTransferUrl;

            try {
                parsedTransferUrl = TonWeb.utils.parseTransferUrl(urlString);
            } catch (e) {
                setElementLocaleText($('#notify'), 'send.parse_uri_error');
                triggerClass($('#notify'), 'faded-show', 2000);
                return;
            }

            $('#toWalletInput').value = parsedTransferUrl.address;

            if (parsedTransferUrl.amount) {
                $('#amountInput').value = TonWeb.utils.fromNano(new BN(parsedTransferUrl.amount));
            }

            if (parsedTransferUrl.text) {
                $('#commentInput').value = parsedTransferUrl.text;
            }

            e.preventDefault();
        });

        onInput($('#invoice_amountInput'), () => this.updateInvoiceLink());
        onInput($('#invoice_commentInput'), () => this.updateInvoiceLink());

        $("#start_createBtn").addEventListener('click', () => this.sendMessage('showScreen', {name: 'created'}));
        $("#start_importBtn").addEventListener('click', () => this.sendMessage('showScreen', {name: 'import'}));
        $('#start_localeButton').addEventListener('click', () => this.onLocaleClick());

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
            this.sendMessage('showScreen', {name: 'importLedger', transportType: 'hid'});
        });
        // $("#start_importLedgerBleBtn").addEventListener('click', () => this.sendMessage('showScreen', {name: 'importLedger', transportType: 'ble'}));

        // $('#main_buyBtn').addEventListener('click', () => {
        //     window.open('https://exchange.mercuryo.io/?currency=TONCOIN&address=' + this.myAddress, '_blank');
        // });

        $('#import_backBtn').addEventListener('click', () => {
            this.isBack = true;
            this.sendMessage('onImportBack');
        });

        $('#import_alertBtn').addEventListener('click', () => {
            this.showAlert({
                title: 'import.alert_title',
                message: 'import.alert_message',
                buttons: [
                    {
                        label: 'common.got_it',
                        callback: () => {
                            this.closePopup();
                        }
                    },
                ]
            });
        });
        $('#import_continueBtn').addEventListener('click', async (e) => {
            this.toggleButtonLoader(e.currentTarget, true);
            this.sendMessage('import', {words: await this.getImportWords()});
        });

        $('#createdContinueButton').addEventListener('click', () => this.sendMessage('createPrivateKey'));

        $('#backup_continueBtn').addEventListener('click', () => {
            const currentTime = +new Date();
            if (currentTime - this.backupShownTime < 60000) { //1 minute
                this.showAlert({
                    title: 'save.alert_title',
                    message: 'save.alert_message',
                    buttons: [
                        {
                            label: 'save.alert_confirm',
                            callback: () => {
                                this.sendMessage('onBackupDone');
                            }
                        },
                        {
                            label: 'save.alert_return',
                            callback: () => {
                                this.closePopup();
                            }
                        },
                    ]
                });
            } else {
                this.sendMessage('onBackupDone');
            }
        });

        $('#wordsConfirm_backBtn').addEventListener('click', () => {
            this.isBack = true;
            this.sendMessage('onConfirmBack');
        });

        $('#wordsConfirm_continueBtn').addEventListener('click', () => {
            const confirmWords = this.getConfirmWords();

            if (!confirmWords.isWordsFromList) {
                return;
            }

            if (!confirmWords.isRightWords) {
                this.showAlert({
                    title: 'confirm.alert_title',
                    message: 'confirm.alert_message',
                    buttons: [
                        {
                            label: 'confirm.alert_back',
                            callback: () => {
                                this.isBack = true;
                                this.sendMessage('onConfirmBack');
                            }
                        },
                        {
                            label: 'confirm.alert_close',
                            callback: () => {
                                this.closePopup();
                            }
                        },
                    ]
                });
            } else {
                this.sendMessage('onConfirmDone', {words: confirmWords.words});
            }
        });


        $('#createPassword_continueBtn').addEventListener('click', (e) => {
            const password = $('#createPassword_input').value;
            const passwordRepeat = $('#createPassword_repeatInput').value;

            const isAllowEmpty = this.isTestnet || this.isDebug;
            const isEmpty = password.length === 0 && !isAllowEmpty;

            if (isEmpty) {
                $('#createPassword_input').classList.add('error');
            } else if (password !== passwordRepeat) {
                $('#createPassword_repeatInput').classList.add('error');
            } else {
                this.toggleButtonLoader(e.currentTarget, true);
                this.sendMessage('passwordCreated', {password});
            }
        });

        $('#readyToGo_continueBtn').addEventListener('click', () => this.sendMessage('showMain'));

        $('#main_refreshBtn').addEventListener('click', () => {
            this.setUpdating(true);
            this.sendMessage('update');
        });
        $('#main_settingsButton').addEventListener('click', () => this.onSettingsClick());

        $('#main_receiveBtn').addEventListener('click', () => {
            toggle($('#receive_showAddressOnDeviceBtn'), !!this.isLedger);
            this.showPopup('receive');
        });
        $('#sendButton').addEventListener('click', () => this.onMessage('showPopup', {name: 'send'}));

        $('#modal').addEventListener('click', () => {
            this.sendMessage('onCancelAction');
            this.closePopup();
        });

        if (IS_FIREFOX) {
            toggle($('#menu_protocol'), false);
            toggle($('#menu_magic'), false);
            toggle($('.about-magic'), false);
        }

        $('#menu_protocol').addEventListener('click', () => {
            $('#menu_protocol .dropdown-toggle').classList.toggle('toggle-on');
            const isTurnedOn = $('#menu_protocol .dropdown-toggle').classList.contains('toggle-on');
            this.sendMessage('onProtocolClick', isTurnedOn);
        });

        $('#menu_magic').addEventListener('click', () => {
            $('#menu_magic .dropdown-toggle').classList.toggle('toggle-on');
            const isTurnedOn = $('#menu_magic .dropdown-toggle').classList.contains('toggle-on');
            $('#menu_telegram').classList.toggle('menu_telegram-show', isTurnedOn);
            this.sendMessage('onMagicClick', isTurnedOn);
        });

        $('#menu_telegram').addEventListener('click', () => {
            window.open('https://web.telegram.org/z', '_blank');
        });

        $('#menu_proxy').addEventListener('click', () => {
            $('#menu_proxy .dropdown-toggle').classList.toggle('toggle-on');
            this.sendMessage('onProxyClick', $('#menu_proxy .dropdown-toggle').classList.contains('toggle-on'));
        });

        $('#menu_extension_chrome').addEventListener('click', () => window.open('https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd', '_blank'));
        $('#menu_extension_firefox').addEventListener('click', () => window.open('https://addons.mozilla.org/ru/firefox/addon/', '_blank'));
        $('#menu_about').addEventListener('click', () => this.showPopup('about'));
        $('#menu_changePassword').addEventListener('click', () => this.onMessage('showPopup', {name: 'changePassword'}));
        $('#menu_backupWallet').addEventListener('click', () => this.sendMessage('onBackupWalletClick'));
        $('#menu_delete').addEventListener('click', () => this.showPopup('delete'));
        $('#menu_changeLocale').addEventListener('click', () => this.onLocaleClick());

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

        $('#send_btn').addEventListener('click', (e) => {
            const amount = Number($('#amountInput').value);
            const amountNano = toNano(amount);
            if (!amountNano.gt(new BN(0)) || this.balance.lt(amountNano)) {
                $('#amountInput').classList.add('error');
                return;
            }
            const toAddress = $('#toWalletInput').value;
            if (!TonWeb.Address.isValid(toAddress)) {
                $('#toWalletInput').classList.add('error');
                return;
            }
            const comment = $('#commentInput').value;

            this.toggleButtonLoader(e.currentTarget, true);
            this.sendMessage('onSend', {amount: amountNano.toString(), toAddress, comment});
        });
        $('#send_closeBtn').addEventListener('click', () => this.closePopup());

        $('#sendConfirm_closeBtn').addEventListener('click', () => {
            this.sendMessage('onCancelAction');
            this.closePopup();
        });
        $('#sendConfirm_cancelBtn').addEventListener('click', () => {
            this.sendMessage('onCancelAction');
            this.closePopup();
        });
        $('#sendConfirm_okBtn').addEventListener('click', () => this.onMessage('showPopup', {name: 'enterPassword'}));

        $('#signConfirm_closeBtn').addEventListener('click', () => this.closePopup());
        $('#signConfirm_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#signConfirm_okBtn').addEventListener('click', () => this.onMessage('showPopup', {name: 'enterPassword'}));

        $('#processing_closeBtn').addEventListener('click', () => this.closePopup());
        $('#done_closeBtn').addEventListener('click', () => this.closePopup());
        $('#about_closeBtn').addEventListener('click', () => this.closePopup());
        $('#about_version').addEventListener('click', (e) => {
            if (e.shiftKey) {
                this.showAlert({
                    title: 'mode_switch.net_title',
                    message: 'mode_switch.net_message',
                    buttons: [
                        {
                            label: 'common.sure',
                            callback: () => {
                                this.sendMessage('toggleTestnet');
                            }
                        },
                        {
                            label: 'common.back',
                            callback: () => {
                                this.closePopup();
                            }
                        },
                    ]
                });
            } else if (e.altKey) {
                this.showAlert({
                    title: 'mode_switch.debug_title',
                    message: 'mode_switch.debug_message',
                    buttons: [
                        {
                            label: 'common.sure',
                            callback: () => {
                                this.sendMessage('toggleDebug');
                            }
                        },
                        {
                            label: 'common.back',
                            callback: () => {
                                this.closePopup();
                            }
                        },
                    ]
                });
            }
        });

        $('#changePassword_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#changePassword_okBtn').addEventListener('click', async (e) => {
            const oldPassword = $('#changePassword_oldInput').value;
            const newPassword = $('#changePassword_newInput').value;
            const passwordRepeat = $('#changePassword_repeatInput').value;

            const isAllowEmpty = this.isTestnet || this.isDebug;
            const isEmpty = newPassword.length === 0 && !isAllowEmpty;

            if (isEmpty) {
                $('#changePassword_newInput').classList.add('error');
                return;
            }

            if (newPassword !== passwordRepeat) {
                $('#changePassword_repeatInput').classList.add('error');
                return;
            }

            this.toggleButtonLoader(e.currentTarget, true);
            this.sendMessage('onChangePassword', {oldPassword, newPassword});
        });

        $('#enterPassword_cancelBtn').addEventListener('click', () => {
            this.sendMessage('onCancelAction');
            this.closePopup();
        });
        $('#enterPassword_okBtn').addEventListener('click', async (e) => {
            const password = $('#enterPassword_input').value;

            this.toggleButtonLoader(e.currentTarget, true);
            this.sendMessage('onEnterPassword', {password});
        });

        $('#delete_cancelBtn').addEventListener('click', () => this.closePopup());
        $('#delete_okBtn').addEventListener('click', () => this.sendMessage('disconnect'));

        $('#localesDropdown').addEventListener('click', e => {
            const localeId = e.target.dataset.locale;
            if (!localeId) return;

            this._localesSetupPromise = setupLocale(localeId).then(logXssAttentionMessage);
            this.closePopup();
        });

        this._localesSetupPromise = setupLocale().then(logXssAttentionMessage);
    }

    // COMMON

    showScreen(name) {
        this.closePopup();

        const screens = ['start', 'created', 'backup', 'wordsConfirm', 'import', 'createPassword', 'readyToGo', 'main'];

        screens.forEach(screen => {
            toggleFaded($('#' + screen), name === screen, {
                isBack: this.isBack,
            });

            toggleLottie(lotties[screen], name === screen, {hideDelay: 300}); //300ms, as for screen show/hide animation duration in CSS
        });
        this.currentScreenName = name;

        this.isBack = false;

        window.scrollTo(0, 0);
    }

    toggleButtonLoader(el, enable) {
        el.disabled = enable;
        enable ? el.classList.add('btn-loader') : el.classList.remove('btn-loader');
    }

    showAlert(params) {
        setElementLocaleText($('#alert .popup-title'), params.title);
        setElementLocaleText($('#alert .popup-black-text'), params.message);

        $('#alert .popup-footer').innerHTML = '';

        if (params.buttons) {
            params.buttons.forEach(button => {
                const el = createElement({
                    tag: 'button',
                    clazz: 'btn-lite'
                });
                setElementLocaleText(el, button.label);
                $('#alert .popup-footer').appendChild(el);
                el.addEventListener('click', button.callback);
            });
        }

        this.showPopup('alert');
    }

    async showPopup(name) {
        this.popup = name;

        $('#enterPassword_input').value = '';

        //popups switching without animations
        if (this.popup && name) {
            triggerClass(document.body, 'disable-animations', 20);
        }

        toggleFaded($('#modal'), name !== '');

        const popups = ['alert', 'receive', 'invoice', 'invoiceQr', 'send', 'sendConfirm', 'signConfirm', 'processing', 'done', 'menuDropdown', 'localesDropdown', 'about', 'delete', 'changePassword', 'enterPassword', 'transaction', 'connectLedger', 'loader'];

        popups.forEach(popup => {
            toggleFaded($('#' + popup), name === popup);
            toggleLottie(lotties[popup], name === popup);
        });
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

    // IMPORT && CONFIRM SCREENS

    createWordInputs(params) {

        const onEnter = input => {
            const i = Number(input.getAttribute('tabindex'));
            if (i === params.count) {

            } else {
                $(params.inputId + i).focus();
            }
        };

        const dropdown = new DropDown($(params.dropdownId), onEnter, this.mnemonicWords);
        let lastInput = null;

        const showWordsPopup = input => {
            const text = input.value;
            if (text === null || text.length === 0) {
                toggle($(params.dropdownId), false);
                return;
            }

            dropdown.show(input, text.toLowerCase());
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
            toggle($(params.dropdownId), false);
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
                    const selectedText = dropdown.getSelectedText();
                    if (selectedText) {
                        input.value = selectedText;
                        input.classList.remove('error');
                        dropdown.hide();
                    }
                    onEnter(input);
                    break;
                case 'ArrowUp':
                    dropdown.up();
                    break;
                case 'ArrowDown':
                    dropdown.down();
                    break;
            }
        };

        const onPaste = (event) => {
            const text = (event.clipboardData || window.clipboardData).getData('text');
            let arr = text.split(' ');
            if (arr.length !== params.count) {
                arr = text.split(',');
            }
            if (arr.length === params.count) {
                for (let i = 0; i < params.count; i++) {
                    const input = $(params.inputId + i);
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
        };

        const createInput = (n) => {
            const inputContainer = createElement({tag: 'div', clazz: 'word-item'});
            const span = createElement({tag: 'span', clazz: 'word-num', text: (n + 1) + '.'});
            inputContainer.appendChild(span);
            const input = createElement({tag: 'input'});
            input.id = params.inputId.slice(1) + n;
            input.type = 'text';
            input.tabIndex = n + 1;
            input.autocomplete = 'off';
            inputContainer.appendChild(input);

            input.addEventListener('focusin', onFocusIn);
            input.addEventListener('focusout', onFocusOut);
            input.addEventListener('keydown', onKeyDown);
            input.addEventListener('paste', onPaste);
            onInput(input, onWordInput);

            $(params.containerId).appendChild(inputContainer);
        };

        if (params.multiColumns) {
            for (let i = 0; i < params.count / 2; i++) {
                createInput(i);
                createInput(i + params.count / 2);
            }
        } else {
            for (let i = 0; i < params.count; i++) {
                createInput(i);
            }
        }
    }

    clearImportWords() {
        toggle($('#wordsPopup'), false);
        for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
            const input = $('#importsInput' + i);
            input.value = '';
            input.classList.remove('error');
        }
    }

    clearConfirmWords() {
        toggle($('#wordsConfirmPopup'), false);
        for (let i = 0; i < CONFIRM_WORDS_COUNT; i++) {
            const input = $('#confirmInput' + i);
            input.value = '';
            input.setAttribute('data-word', '');
            input.classList.remove('error');
        }
    }

    setConfirmWords(words) {
        const nums = Array(IMPORT_WORDS_COUNT)
            .fill(0)
            .map((_, i) => ({i, rnd: Math.random()}))
            .sort((a, b) => a.rnd - b.rnd)
            .map(i => i.i)
            .slice(0, CONFIRM_WORDS_COUNT)
            .sort((a, b) => a - b);

        const spans = $$('#confirmWordsNums .js-confirm-number');
        for (let i = 0; i < CONFIRM_WORDS_COUNT; i++) {
            const input = $('#confirmInput' + i);
            input.setAttribute('data-index', nums[i]);
            input.setAttribute('data-word', words[nums[i]]);
            spans[i].innerText = nums[i] + 1;
            input.parentNode.children[0].innerText = (nums[i] + 1) + '.';
        }
    }

    async getImportWords() {
        let isValid = true;
        const words = [];
        for (let i = 0; i < IMPORT_WORDS_COUNT; i++) {
            const input = $('#importsInput' + i);
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
                    const input = $('#importsInput' + i);
                    input.classList.add('error');
                }
            }
        }

        return isValid ? words : null;
    }

    getConfirmWords() {
        let isWordsFromList = true;
        let isRightWords = true;
        const words = {};

        for (let i = 0; i < CONFIRM_WORDS_COUNT; i++) {
            const input = $('#confirmInput' + i);
            const value = input.value.toLowerCase().trim();
            const index = input.getAttribute('data-index');
            const validValue = input.getAttribute('data-word');
            if (!value || this.mnemonicWords.indexOf(value) === -1) {
                input.classList.add('error');
                isWordsFromList = false;
            }
            if (value !== validValue) {
                isRightWords = false;
            }
            words[index] = value;
        }

        return {
            isWordsFromList,
            isRightWords,
            words: isWordsFromList && isRightWords ? words : null
        };
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
        setElementLocaleText($('#updateLabel'), updating ? 'main.updating' : 'main.updated');
    }

    onSettingsClick() {
        toggleFaded($('#modal'), true);
        toggleFaded($('#menuDropdown'), true);
        toggle($('#menu_changePassword'), !this.isLedger);
        toggle($('#menu_backupWallet'), !this.isLedger);
    }

    onLocaleClick() {
        toggleFaded($('#modal'), true);
        toggleFaded($('#menuDropdown'), false);
        toggleFaded($('#localesDropdown'), true);
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
        $('#sendBalance').innerText = s;
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
                this.addDateSeparator(txDate, tx.date);
                date = txDate;
            }
            this.addTx(tx);
        });
    }

    addDateSeparator(dateString, dateObject) {
        $('#transactionsList').appendChild(createElement({tag: 'div', clazz: 'date-separator', text: dateString, dataset: { ldate: +dateObject }}));
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
                        createElement({
                            tag: 'span',
                            clazz: ['tx-amount', 'tx-amount-green'],
                            text: '+' + amountFormatted
                        }),
                        createElement({tag: 'span', text: ' 💎'}),
                        createElement({
                            tag: 'span',
                            clazz: 'tx-from',
                            child: [
                                document.createTextNode(' '),
                                createElement({
                                    tag: 'span',
                                    text: l('main.sender'),
                                    dataset: { l: 'main.sender' }
                                }),
                                document.createTextNode(':')
                            ]
                        })
                    ] : [
                        createElement({tag: 'span', clazz: 'tx-amount', text: amountFormatted}),
                        createElement({tag: 'span', text: ' 💎'}),
                        createElement({
                            tag: 'span',
                            clazz: 'tx-from',
                            child: [
                                document.createTextNode(' '),
                                createElement({
                                    tag: 'span',
                                    text: l('main.recipient'),
                                    dataset: { l: 'main.recipient' }
                                }),
                                document.createTextNode(':')
                            ]
                        })
                    ]
                }),
                setAddr(createElement({tag: 'div', clazz: ['tx-addr', 'addr']}), addr),
                tx.comment ? createElement({tag: 'div', clazz: 'tx-comment', text: tx.comment}) : undefined,
                createElement({
                    tag: 'div',
                    clazz: 'tx-fee',
                    child: [
                        createElement({
                            tag: 'span',
                            text: l('main.fee'),
                            dataset: { l: 'main.fee' }
                        }),
                        document.createTextNode(': '),
                        createElement({
                            tag: 'span',
                            text: formatNanograms(tx.fee)
                        })
                    ]
                }),
                createElement({tag: 'div', clazz: 'tx-item-date', text: formatTime(tx.date), dataset: { ltime: +tx.date }})
            ]
        });

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

        $('#transactionFee').innerText = formatNanograms(tx.otherFee);
        $('#transactionStorageFee').innerText = formatNanograms(tx.storageFee);

        setElementLocaleText(
            $('#transactionSenderLabel'), isReceive ? 'main.sender' : 'main.recipient'
        );

        setAddr($('#transactionSender'), addr);
        toggle($('#transactionCommentLabel'), !!tx.comment);
        $('#transactionComment').innerText = tx.comment;

        const $transactionDate = $('#transactionDate');
        $transactionDate.dataset.ldatetime = +tx.date;
        $transactionDate.innerText = formatDateTime(tx.date);
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

        drawQRCode(TonWeb.utils.formatTransferUrl(address), '#qr');
    }

    onShareAddressClick(onlyAddress) {
        const data = onlyAddress ? this.myAddress : TonWeb.utils.formatTransferUrl(this.myAddress);
        const localeItem = onlyAddress ? 'receive.address_copied' : 'receive.link_copied';

        setElementLocaleText(
            $('#notify'), copyToClipboard(data) ? localeItem : 'receive.copy_error'
        );
        triggerClass($('#notify'), 'faded-show', 2000);
    }

    onShowAddressOnDevice() {
        this.sendMessage('showAddressOnDevice');
        setElementLocaleText($('#notify'), 'receive.check_device');
        triggerClass($('#notify'), 'faded-show', 2000);
    }

    // RECEIVE INVOICE POPUP

    onCreateInvoiceClick() {
        this.onMessage('showPopup', {name: 'invoice'});
    }

    updateInvoiceLink() {
        $('#invoice_link').innerText = this.getInvoiceLink();
    };

    getInvoiceLink() {
        const amountString = $('#invoice_amountInput').value;
        const amount = amountString ? TonWeb.utils.toNano(amountString) : undefined;
        return TonWeb.utils.formatTransferUrl(this.myAddress, amount, $('#invoice_commentInput').value);
    }

    onShareInvoiceClick() {
        setElementLocaleText(
            $('#notify'),
            copyToClipboard(this.getInvoiceLink()) ? 'receive.link_copied' : 'receive.copy_error'
        );
        triggerClass($('#notify'), 'faded-show', 2000);
    }

    // RECEIVE INVOICE QR POPUP

    onCreateInvoiceQrClick() {
        this.onMessage('showPopup', {name: 'invoiceQr'});
    }

    drawInvoiceQr(link) {
        drawQRCode(link, '#invoiceQrImg');
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
    async onMessage(method, params) {
        await this._localesSetupPromise;

        switch (method) {
            case 'disableCreated':
                $('#createdContinueButton').disabled = params;
                break;

            case 'setIsTestnet':
                this.isTestnet = params;
                setElementLocaleText(
                    $('.your-balance'), params ? 'main.your_balance_testnet' : 'main.your_balance'
                );
                break;

            case 'setIsDebug':
                this.isDebug = params;
                setLocalesDebug(params);
                break;

            case 'setBalance':
                this.setBalance(new BN(params.balance), params.txs);
                break;

            case 'setIsLedger':
                this.isLedger = params;
                break;

            case 'setIsProtocol':
                const isProtocolTurnedOn = params;
                $('#menu_protocol .dropdown-toggle').classList.toggle('toggle-on', isProtocolTurnedOn && !IS_FIREFOX);
                break;

            case 'setIsMagic':
                const isTurnedOn = params;
                $('#menu_magic .dropdown-toggle').classList.toggle('toggle-on', isTurnedOn && !IS_FIREFOX);
                $('#menu_telegram').classList.toggle('menu_telegram-show', isTurnedOn && !IS_FIREFOX);
                break;

            case 'setIsProxy':
                if (params) {
                    $('#menu_proxy .dropdown-toggle').classList.add('toggle-on');
                } else {
                    $('#menu_proxy .dropdown-toggle').classList.remove('toggle-on');
                }
                break;

            case 'privateKeySaved':
                this.toggleButtonLoader($('#createPassword_continueBtn'), false);
                break;

            case 'passwordChanged':
                this.toggleButtonLoader($('#changePassword_okBtn'), false);
                break;

            case 'showChangePasswordError':
                this.toggleButtonLoader($('#changePassword_okBtn'), false);
                $('#changePassword_oldInput').classList.add('error');
                break;

            case 'passwordEntered':
                this.toggleButtonLoader($('#enterPassword_okBtn'), false);
                break;

            case 'showEnterPasswordError':
                this.toggleButtonLoader($('#enterPassword_okBtn'), false);
                $('#enterPassword_input').classList.add('error');
                break;

            case 'importCompleted':
                this.toggleButtonLoader($('#import_continueBtn'), false);
                break;

            case 'sendCheckFailed':
                if (params) {
                    setElementLocaleText($('#notify'), params);
                    triggerClass($('#notify'), 'faded-show', 3000);
                }

                this.toggleButtonLoader($('#send_btn'), false);
                break;

            case 'sendCheckSucceeded':
                this.toggleButtonLoader($('#send_btn'), false);
                break;

            case 'sendCheckCantPayFee':
                this.toggleButtonLoader($('#send_btn'), false);
                $('#amountInput').classList.add('error');

                const $notify = $('#notify');
                $notify.dataset.l = 'main.estimated_fee_is';
                $notify.innerText = `${l('main.estimated_fee_is')} ~${formatNanograms(params.fee)} TON`;
                triggerClass($notify, 'faded-show', 3000);

                break;

            case 'showNotify':
                setElementLocaleText($('#notify'), params);
                triggerClass($('#notify'), 'faded-show', 3000);

                break;

            case 'showScreen':
                if (params.noAnimation) {
                    triggerClass(document.body, 'disable-animations', 300);
                }

                this.showScreen(params.name);

                switch (params.name) {
                    case 'start':
                        this.clearBalance();
                        this.clearImportWords();
                        break;
                    case 'created':
                        break;
                    case 'import':
                        this.clearImportWords();
                        $('#importsInput0').focus();
                        break;
                    case 'backup':
                        this.clearConfirmWords();
                        this.setBackupWords(params.words);
                        this.backupShownTime = params.isFirst ? (+new Date()) : 0;
                        break;
                    case 'wordsConfirm':
                        this.clearConfirmWords();
                        this.clearBackupWords();
                        $('#confirmInput0').focus();
                        this.setConfirmWords(params.words);
                        break;
                    case 'createPassword':
                        this.clearImportWords();
                        this.clearConfirmWords();
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
                            this.sendMessage('ready');
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
                    case 'enterPassword':
                        $('#enterPassword_input').focus();
                        break;
                    case 'done':
                        $('#doneAmount').innerText = params.amount;
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
                        if (params.url) {
                            const parsed = TonWeb.utils.parseTransferUrl(params.url);
                            $('#toWalletInput').value = parsed.address;
                            if (parsed.amount) {
                                $('#amountInput').value = TonWeb.utils.fromNano(new BN(parsed.amount));
                            }
                            if (parsed.text) {
                                $('#commentInput').value = parsed.text;
                            }
                        }
                        toggle($('#commentInput'), !this.isLedger);
                        $('#toWalletInput').focus();
                        break;
                    case 'sendConfirm':
                        $('#sendConfirmAmount').innerText = formatNanograms(new BN(params.amount)) + ' TON';
                        setAddr($('#sendConfirmAddr'), params.toAddress);

                        const $sendConfirmFee = $('#sendConfirmFee');
                        if (params.fee) {
                            $sendConfirmFee.dataset.l = 'main.fee';
                            $sendConfirmFee.innerText = `${l('main.fee')}: ~${formatNanograms(new BN(params.fee))} TON`;
                        } else {
                            delete($sendConfirmFee.dataset.l);
                            $sendConfirmFee.innerText = '';
                        }

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

            case 'restoreDeprecatedStorage':
                const address = localStorage.getItem('address');
                const words = localStorage.getItem('words');
                const walletVersion = localStorage.getItem('walletVersion');
                const magic = localStorage.getItem('magic');
                const proxy = localStorage.getItem('proxy');
                localStorage.clear();

                return {address, words, walletVersion, magic, proxy};

        }
    }
}

window.view = new View(TonWeb.mnemonic.wordlists.EN);

if (IS_EXTENSION) {
    let port;

    const connectToBackground = () => {
        port = chrome.runtime.connect({ name: 'gramWalletPopup' });
        window.view.port = port;

        port.onMessage.addListener(data => {
            const result = window.view.onMessage(data.method, data.params);
            if (result && data.id) {
                port.postMessage({ method: 'response', id: data.id, result });
            }
        });

        port.onDisconnect.addListener(() => {
            connectToBackground();
        });
    }

    connectToBackground();

    (async () => {
        let prevWindow = await chrome.windows.getCurrent();

        setInterval(async () => {
            const currentWindow = await chrome.windows.getCurrent();

            if (
                currentWindow.top === prevWindow.top &&
                currentWindow.left === prevWindow.left &&
                currentWindow.height === prevWindow.height &&
                currentWindow.width === prevWindow.width
            ) return;

            window.view.sendMessage('onWindowUpdate', {
                top: currentWindow.top,
                left: currentWindow.left,
                height: currentWindow.height,
                width: currentWindow.width
            });

            prevWindow = currentWindow;
        }, 3000);
    })();
}
