import { createAsyncThunk } from '@reduxjs/toolkit';
import TonWeb from "tonweb";
import * as tonMnemonic from "tonweb-mnemonic";
import nacl from "tweetnacl";

import { getTransactions, wordsToPrivateKey } from 'utils/tonWebUtils';
import { encrypt } from 'utils/cryptUtils';
import { RootState } from 'store/store';
import { DEFAULT_WALLET_VERSION, MAINNET_RPC, TESTNET_RPC } from 'constants/app';
import { withToastForError } from 'utils/storeUtils';


const IS_TESTNET = window.location.href.indexOf('testnet') > -1;

const ton = new TonWeb(new TonWeb.HttpProvider(IS_TESTNET ? TESTNET_RPC : MAINNET_RPC));

export const createWallet = createAsyncThunk(
    'app/wallet/create',
    withToastForError<void, any, any>(async () => {
        const myMnemonicWords = await tonMnemonic.generateMnemonic();
        const privateKey = await wordsToPrivateKey(myMnemonicWords);
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        const walletVersion = DEFAULT_WALLET_VERSION;
        const WalletClass = ton.wallet.all[DEFAULT_WALLET_VERSION];
        const walletContract = new WalletClass(ton.provider, {
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
    withToastForError<void, any, any>(async (empty, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        const walletVersion = localStorage.getItem('walletVersion');
        const walletClass = walletVersion ? ton.wallet.all[walletVersion] : ton.wallet.default;
        const walletContract = new walletClass(ton.provider, {
            address: state.app.myAddress,
            wc: 0
        });
        return {
            walletContract
        };
    }),
)

export const savePrivateKey = createAsyncThunk(
    'app/wallet/privateKey',
    withToastForError<string, any, any>(async (password: string, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        const encryptedWords = await encrypt(state.app.myMnemonicWords.join(','), password);
        return {
            encryptedWords
        };
    }),
)

export const updateWallet = createAsyncThunk(
    'app/wallet/update',
    withToastForError<void, any, any>(async (empty, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        const walletInfo = await ton.provider.getWalletInfo(state.app.myAddress);
        const balance = new TonWeb.utils.BN(walletInfo.balance);
        const isBalanceChanged = (state.app.balance === null) || (state.app.balance.cmp(balance) !== 0);
        const isContractInitialized = walletInfo.account_state === "active" && walletInfo.seqno;

        if (isBalanceChanged) {
            thunkAPI.dispatch(getWalletTransactions());
        }

        return {
            balance,
            isContractInitialized,
        };
    }),
)

export const getWalletTransactions = createAsyncThunk(
    'app/wallet/transactions',
    withToastForError<void, any, any>(async (empty, thunkAPI) => {
        const state = thunkAPI.getState() as RootState;
        let transactions = state.app.transactions;
        let lastTransactionTime = state.app.lastTransactionTime;

        const txs = await getTransactions(ton, state.app.myAddress);
        if (txs.length > 0) {
            transactions = txs;
            lastTransactionTime = Number(txs[0].date);
            transactions.forEach((tx) => {
                tx.amount = new TonWeb.utils.BN(tx.amount);
                tx.fee = new TonWeb.utils.BN(tx.fee);
                tx.otherFee = new TonWeb.utils.BN(tx.otherFee);
                tx.storageFee = new TonWeb.utils.BN(tx.storageFee);
                tx.date = new Date(tx.date);
            })
        }

        return {
            transactions,
            lastTransactionTime,
        };
    }),
)

export const importWallet = createAsyncThunk(
    'app/wallet/import',
    withToastForError<string[], any, any>(async (myMnemonicWords: string[]) => {
        const privateKey = await wordsToPrivateKey(myMnemonicWords);
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        let hasBalance = [];

        for (let WalletClass of ton.wallet.list) {
            const wallet = new WalletClass(ton.provider, {
                publicKey: keyPair.publicKey,
                wc: 0
            });
            const walletAddress = (await wallet.getAddress()).toString(true, true, true);
            const walletInfo = await ton.provider.getWalletInfo(walletAddress);
            const walletBalance = new TonWeb.utils.BN(walletInfo.balance);
            if (walletBalance.gt(new TonWeb.utils.BN(0))) {
                hasBalance.push({balance: walletBalance, clazz: WalletClass});
            }
        }

        let WalletClass = ton.wallet.all[DEFAULT_WALLET_VERSION];

        if (hasBalance.length > 0) {
            hasBalance.sort((a, b) => {
                return a.balance.cmp(b.balance);
            });
            WalletClass = hasBalance[hasBalance.length - 1].clazz;
        }

        const walletContract = new WalletClass(ton.provider, {
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

