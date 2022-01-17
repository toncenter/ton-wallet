import TonWeb from 'tonweb';
import * as tonMnemonic from 'tonweb-mnemonic';
import nacl, { SignKeyPair } from 'tweetnacl';

import { DEFAULT_LEDGER_WALLET_VERSION, MAINNET_RPC, TESTNET_RPC } from 'constants/app';

const ACCOUNT_NUMBER = 0;

class TonWebService {
    public ton;
    public walletContract: any;
    constructor(isTestnet: boolean) {
        this.ton = new TonWeb(new TonWeb.HttpProvider(isTestnet ? TESTNET_RPC : MAINNET_RPC));
    }

    public setWalletContract(walletContract: any) {
        this.walletContract = walletContract;
    }

    public async generateMnemonicWords(): Promise<string[]> {
        return await tonMnemonic.generateMnemonic();
    }

    public async wordsToPrivateKey(words: string[]) {
        const keyPair = await tonMnemonic.mnemonicToKeyPair(words);
        return TonWeb.utils.bytesToBase64(keyPair.secretKey.slice(0, 32));
    }

    public async getTransactions(myAddress: string, limit = 20) {
        function getComment(msg: any) {
            if (!msg.msg_data) return '';
            if (msg.msg_data['@type'] !== 'msg.dataText') return '';
            const base64 = msg.msg_data.text;
            return new TextDecoder().decode(TonWeb.utils.base64ToBytes(base64));
        }

        const arr = [];
        const transactions = await this.ton.getTransactions(myAddress, limit);
        for (const t of transactions) {
            let amount = new TonWeb.utils.BN(t.in_msg.value);
            for (const outMsg of t.out_msgs) {
                amount = amount.sub(new TonWeb.utils.BN(outMsg.value));
            }
            //amount = amount.sub(new BN(t.fee));

            let from_addr = '';
            let to_addr = '';
            let comment = '';
            if (t.in_msg.source) {
                // internal message with grams, set source
                from_addr = t.in_msg.source;
                to_addr = t.in_msg.destination;
                comment = getComment(t.in_msg);
            } else if (t.out_msgs.length) {
                // external message, we sending grams
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
                    date: new Date(t.utime * 1000),
                });
            }
        }
        return arr;
    }

    public async sign(
        myAddress: string,
        toAddress: string,
        amount: string,
        comment: string,
        keyPair: SignKeyPair | null,
    ) {
        const wallet = await this.ton.provider.getWalletInfo(myAddress);
        let seqno = wallet.seqno;
        if (!seqno) seqno = 0;

        const secretKey = keyPair ? keyPair.secretKey : null;
        return this.walletContract.methods.transfer({
            secretKey: secretKey,
            toAddress: toAddress,
            amount: amount,
            seqno: seqno,
            payload: comment,
            sendMode: 3,
        });
    }

    public async createLedger(transportType: string) {
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
        const ledgerApp = new TonWeb.ledger.AppTon(transport, this.ton);
        const ledgerVersion = (await ledgerApp.getAppConfiguration()).version;
        console.log('ledgerAppConfig=', ledgerVersion);
        if (!ledgerVersion.startsWith('2')) {
            alert(
                'Please update your Ledger TON-app to v2.0.1 or upper or use old wallet version https://tonwallet.me/prev/',
            );
            throw new Error('outdated ledger ton-app version');
        }
        const { publicKey } = await ledgerApp.getPublicKey(ACCOUNT_NUMBER, false); // todo: можно сохранять publicKey и не запрашивать это

        const WalletClass = this.ton.wallet.all[DEFAULT_LEDGER_WALLET_VERSION];
        const wallet = new WalletClass(this.ton.provider, {
            publicKey: publicKey,
            wc: 0,
        });
        const walletContract = wallet;

        const address = await wallet.getAddress();
        const myAddress = address.toString(true, true, true);
        const publicKeyHex = TonWeb.utils.bytesToHex(publicKey);
        return {
            ledgerApp,
            walletContract,
            myAddress,
            publicKeyHex,
        };
    }

    public rawSign(hex: string, privateKey: string): string {
        const keyPair = nacl.sign.keyPair.fromSeed(TonWeb.utils.base64ToBytes(privateKey));
        const signature = nacl.sign.detached(TonWeb.utils.hexToBytes(hex), keyPair.secretKey);
        return TonWeb.utils.bytesToHex(signature);
    }
}

export default TonWebService;
