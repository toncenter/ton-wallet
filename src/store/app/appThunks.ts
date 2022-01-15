import { createAsyncThunk } from '@reduxjs/toolkit';
import TonWeb from 'tonweb';
import nacl from 'tweetnacl';

import { encrypt } from 'utils/cryptUtils';
import { RootState } from 'store/store';
import { DEFAULT_WALLET_VERSION } from 'constants/app';
import { withError } from 'utils/storeUtils';
import { setPopup } from './appSlice';
import { PopupEnum } from 'enums/popupEnum';
import TonWebService from 'services/tonWebService';

const ACCOUNT_NUMBER = 0;
const IS_TESTNET = window.location.href.indexOf('testnet') > -1

const tonWebService = new TonWebService(IS_TESTNET);

export const createWallet = createAsyncThunk(
    'app/wallet/create',
    withError<void, any, any>(async () => {
        const myMnemonicWords = await tonWebService.generateMnemonicWords();
        const privateKey = await tonWebService.wordsToPrivateKey(myMnemonicWords);
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        const walletVersion = DEFAULT_WALLET_VERSION;
        const WalletClass = tonWebService.ton.wallet.all[DEFAULT_WALLET_VERSION];
        const walletContract = new WalletClass(tonWebService.ton.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        const myAddress = (await walletContract.getAddress()).toString(true, true, true);

        return {
            myMnemonicWords,
            myAddress,
            walletVersion,
        };
    }),
)

export const createWalletContract = createAsyncThunk(
    'app/wallet/contract/create',
    withError<void, any, any>(async (empty, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        const walletVersion = localStorage.getItem('walletVersion');
        const walletClass = walletVersion ? tonWebService.ton.wallet.all[walletVersion] : tonWebService.ton.wallet.default;
        const walletContract = new walletClass(tonWebService.ton.provider, {
            address: state.app.myAddress,
            wc: 0
        });
        tonWebService.setWalletContract(walletContract);
        thunkAPI.dispatch(updateWallet());
    }),
)

export const savePrivateKey = createAsyncThunk(
    'app/wallet/privateKey',
    withError<string, any, any>(async (password: string, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        const encryptedWords = await encrypt(state.app.myMnemonicWords.join(','), password);
        return {
            encryptedWords
        };
    }),
)

export const saveWords = createAsyncThunk(
    'app/wallet/words',
    withError<{ words: string[], password: string }, any, any>(async ({words, password}) => {
        const encryptedWords = await encrypt(words.join(','), password);
        return {
            encryptedWords
        };
    }),
)

export const updateWallet = createAsyncThunk(
    'app/wallet/update',
    withError<void, any, any>(async (empty, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        const walletInfo = await tonWebService.ton.provider.getWalletInfo(state.app.myAddress);
        const balance = new TonWeb.utils.BN(walletInfo.balance);
        const isBalanceChanged = (state.app.balance === null) || (new TonWeb.utils.BN(state.app.balance).cmp(balance) !== 0);
        const isContractInitialized = walletInfo.account_state === "active" && walletInfo.seqno;

        if (isBalanceChanged ||
            (!balance.eq(new TonWeb.utils.BN(0)) && state.app.transactions.length === 0) ||
            (state.app.popup === PopupEnum.processing && state.app.sendingData)
        ) {
            thunkAPI.dispatch(getWalletTransactions());
        }

        return {
            balance: balance.toString(),
            isContractInitialized,
        };
    }),
)

export const getWalletTransactions = createAsyncThunk(
    'app/wallet/transactions',
    withError<void, any, any>(async (empty, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        let transactions = state.app.transactions;
        let lastTransactionTime = state.app.lastTransactionTime;
        let sendingData = state.app.sendingData;

        const txs = await tonWebService.getTransactions(state.app.myAddress);
        if (txs.length > 0) {
            transactions = txs;
            lastTransactionTime = Number(txs[0].date);
            if (state.app.popup === PopupEnum.processing && sendingData) {
                const newTxs = txs.filter(tx => Number(tx.date) > state.app.lastTransactionTime);
                for (let tx of newTxs) {
                    const txAddr = (new TonWeb.utils.Address(tx.to_addr)).toString(true, true, true);
                    const myAddr = (new TonWeb.utils.Address(sendingData.address)).toString(true, true, true);
                    const txAmount = tx.amount;
                    const myAmount = '-' + sendingData.amount;

                    if (txAddr === myAddr && txAmount === myAmount) {
                        thunkAPI.dispatch(setPopup({
                            popup: PopupEnum.done,
                            state: {
                                message: TonWeb.utils.fromNano(sendingData.amount) + ' TON have been sent',
                            }
                        }));
                        sendingData = null;
                        break;
                    }
                }
            }
        }

        return {
            transactions,
            lastTransactionTime,
            sendingData,
        };
    }),
)

export const importWallet = createAsyncThunk(
    'app/wallet/import',
    withError<string[], any, any>(async (myMnemonicWords) => {
        const privateKey = await tonWebService.wordsToPrivateKey(myMnemonicWords);
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        let hasBalance = [];

        for (let WalletClass of tonWebService.ton.wallet.list) {
            const wallet = new WalletClass(tonWebService.ton.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
            });
            const walletAddress = (await wallet.getAddress()).toString(true, true, true);
            const walletInfo = await tonWebService.ton.provider.getWalletInfo(walletAddress);
            const walletBalance = new TonWeb.utils.BN(walletInfo.balance);
            if (walletBalance.gt(new TonWeb.utils.BN(0))) {
                hasBalance.push({balance: walletBalance, clazz: WalletClass});
            }
        }

        let WalletClass = tonWebService.ton.wallet.all[DEFAULT_WALLET_VERSION];

        if (hasBalance.length > 0) {
            hasBalance.sort((a, b) => {
                return a.balance.cmp(b.balance);
            });
            WalletClass = hasBalance[hasBalance.length - 1].clazz;
        }

        const walletContract = new WalletClass(tonWebService.ton.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        const myAddress = (await walletContract.getAddress()).toString(true, true, true);
        const walletVersion = walletContract.getName();

        return {
            myMnemonicWords,
            myAddress,
            walletVersion,
        };
    }),
)

export const getFees = createAsyncThunk(
    'app/wallet/fee',
    withError<{ address: string, amount: string, comment: string }, any, any>(async ({address, amount, comment}, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        if (!state.app.isContractInitialized) {
            return {
                fee: TonWeb.utils.toNano(0.010966001).toString(),
            }
        }

        try {
            const query = await tonWebService.sign(state.app.myAddress, address, amount, comment, null);
            const all_fees = await query.estimateFee();
            const fees = all_fees.source_fees;
            const in_fwd_fee = new TonWeb.utils.BN(fees.in_fwd_fee);
            const storage_fee = new TonWeb.utils.BN(fees.storage_fee);
            const gas_fee = new TonWeb.utils.BN(fees.gas_fee);
            const fwd_fee = new TonWeb.utils.BN(fees.fwd_fee);

            return {
                fee: in_fwd_fee.add(storage_fee).add(gas_fee).add(fwd_fee).toString(),
            }
        } catch (err) {
            console.error(err);
            return {
                fee: "0",
            }
        }
    }),
)

export const walletSend = createAsyncThunk(
    'app/wallet/send',
    withError<{ address: string, amount: string, comment: string, words: string[] }, any, any>(async ({address, amount, comment, words}, thunkAPI) => {
        try {
            const state = thunkAPI.getState() as RootState;
            let myAddress = state.app.myAddress;
            let ledgerApp = state.app.ledgerApp;
            let addressFormat = 0;
            let sendingData = null;
            if (state.app.isLedger) {
                if (!ledgerApp) {
                    const ledger = await tonWebService.createLedger(localStorage.getItem('ledgerTransportType') || 'hid');
                    ledgerApp = ledger.ledgerApp;
                    myAddress = ledger.myAddress;
                    tonWebService.setWalletContract(ledger.walletContract);
                }

                const toAddress_ = new TonWeb.utils.Address(address);
                if (toAddress_.isUserFriendly) {
                    addressFormat += ledgerApp.ADDRESS_FORMAT_USER_FRIENDLY;
                    if (toAddress_.isUrlSafe) {
                        addressFormat += ledgerApp.ADDRESS_FORMAT_URL_SAFE;
                    }
                    if (toAddress_.isBounceable) {
                        addressFormat += ledgerApp.ADDRESS_FORMAT_BOUNCEABLE;
                    }
                    if (toAddress_.isTestOnly) {
                        addressFormat += ledgerApp.ADDRESS_FORMAT_TEST_ONLY;
                    }
                }
            }
            const walletInfo = await tonWebService.ton.provider.getWalletInfo(address);
            if (!(walletInfo.account_state === "active" && walletInfo.seqno)) {
                address = (new TonWeb.utils.Address(address)).toString(true, true, false);
            }
            if (state.app.isLedger) {

                const wallet = await tonWebService.ton.provider.getWalletInfo(myAddress);
                let seqno = wallet.seqno;
                if (!seqno) seqno = 0;

                const query = await ledgerApp.transfer(ACCOUNT_NUMBER, tonWebService.walletContract, address, amount, seqno, addressFormat);
                sendingData = {address, amount, comment, query};

                const sendResponse = await query.send();
                if (sendResponse["@type"] !== "ok") {
                    thunkAPI.dispatch(setPopup({
                        popup: PopupEnum.void,
                    }));
                    alert('Send error');
                }
                return {
                    sendingData,
                    ledgerApp,
                    myAddress,
                }
            } else {
                const privateKey = await tonWebService.wordsToPrivateKey(words);
                const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
                const query = await tonWebService.sign(state.app.myAddress, address, amount, comment, keyPair);
                sendingData = {address, amount, comment, query};
                const sendResponse = await query.send();
                if (sendResponse["@type"] !== "ok") {
                    thunkAPI.dispatch(setPopup({
                        popup: PopupEnum.void,
                    }));
                    alert('Send error');
                }
                return {
                    sendingData,
                    ledgerApp,
                    myAddress,
                }
            }
        } catch (error) {
            thunkAPI.dispatch(setPopup({
                popup: PopupEnum.void,
            }));
            alert('Error sending');
            return;
        }
    }),
)

export const rawSign = createAsyncThunk(
    'app/wallet/rawSign',
    withError<{ words: string[], hexToSign: string }, any, any>(async ({words, hexToSign}) => {
        const privateKey = await tonWebService.wordsToPrivateKey(words);
        const signature = tonWebService.rawSign(hexToSign, privateKey);
        return {
            signature,
        };
    }),
)

