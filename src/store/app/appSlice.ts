import { createSlice } from '@reduxjs/toolkit'
import TonWeb from 'tonweb';

import type { RootState } from 'store/store'
import {
    createWallet,
    createWalletContract,
    getWalletTransactions,
    importWallet,
    savePrivateKey,
    updateWallet
} from './appThunks';

interface AppState {
    myMnemonicWords: string[];
    myMnemonicEncryptedWords: string;
    myAddress: string;
    isLedger: boolean;
    walletContract: any;
    balance: any;
    isContractInitialized: boolean;
    transactions: any[];
    lastTransactionTime: number;
}

const initialState: AppState = {
    myMnemonicWords: [],
    myMnemonicEncryptedWords: localStorage.getItem('words') || '',
    myAddress: localStorage.getItem('address') || '',
    isLedger: localStorage.getItem('isLedger') === 'true',
    walletContract: null,
    balance: new TonWeb.utils.BN(0),
    isContractInitialized: false,
    transactions: [],
    lastTransactionTime: 0,
}

export const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder.addCase(createWallet.fulfilled, (state, action) => {
            state.myMnemonicWords = action.payload.myMnemonicWords;
            state.myAddress = action.payload.myAddress;
            localStorage.setItem('walletVersion', action.payload.walletVersion);
        });
        builder.addCase(savePrivateKey.fulfilled, (state, action) => {
            state.isLedger = false;
            localStorage.setItem('isLedger', `${state.isLedger}`);
            localStorage.setItem('address', state.myAddress);
            localStorage.setItem('words', action.payload.encryptedWords);
            state.myMnemonicWords = [];
        });
        builder.addCase(createWalletContract.fulfilled, (state, action) => {
            state.walletContract = action.payload.walletContract;
        });
        builder.addCase(updateWallet.fulfilled, (state, action) => {
            state.balance = action.payload.balance;
            state.isContractInitialized = action.payload.isContractInitialized;
        });
        builder.addCase(getWalletTransactions.fulfilled, (state, action) => {
            state.transactions = action.payload.transactions;
            state.lastTransactionTime = action.payload.lastTransactionTime;
        });
        builder.addCase(importWallet.fulfilled, (state, action) => {
            state.myMnemonicWords = action.payload.myMnemonicWords;
            state.myAddress = action.payload.myAddress;
            localStorage.setItem('walletVersion', action.payload.walletVersion);
        });
    },
})

export const { } = appSlice.actions

export const selectMyAddress = (state: RootState) => state.app.myAddress;
export const selectMyMnemonicWords = (state: RootState) => state.app.myMnemonicWords;
export const selectMyMnemonicEncryptedWords = (state: RootState) => state.app.myMnemonicEncryptedWords;
export const selectWalletContract = (state: RootState) => state.app.walletContract;
export const selectBalance = (state: RootState) => state.app.balance;
export const selectTransactions = (state: RootState) => state.app.transactions;

export default appSlice.reducer;
