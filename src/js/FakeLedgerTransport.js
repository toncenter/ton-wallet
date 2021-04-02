const nacl = TonWeb.utils.nacl; // use nacl library for key pairs

/**
 * @param arr {Uint8Array}
 */
function createResult(arr) {
    const result = new Uint8Array(1 + arr.length);
    result[0] = arr.length;
    for (let i = 0; i < arr.length; i++) {
        result[i + 1] = arr[i];
    }
    return result;
}

export class FakeTransport {
    constructor(ton) {
        this.keyPair = nacl.sign.keyPair(); // create new random key pair
        console.log('LEDGER keyPair is', this.keyPair);

        const WalletClass = ton.wallet.all['v3R1'];
        this.wallet = new WalletClass(ton.provider, {
            publicKey: this.keyPair.publicKey,
            wc: 0
        });

        this.wallet.getAddress().then(address => {
            console.log('LEDGER: address is ', address.toString(true, true, true));
        })
    }

    setDebugMode() {

    }

    async send(...rest) {
        const arr = [...rest];
        console.log('LEDGER: receive', arr);

        if (arr[1] === 0x01) { // get app config

            return new Uint8Array([1, 2, 3]);

        } else if (arr[1] === 0x02 && !arr[5]) { // get public key

            return createResult(this.keyPair.publicKey);

        } else if (arr[1] === 0x03 ) { // sign bytes

            const signature = TonWeb.utils.nacl.sign.detached(new Uint8Array(8), this.keyPair.secretKey);
            return createResult(signature);

        } else if (arr[1] === 0x04) { // sign transfer

            console.log('LEDGER: print transfer info')
            const hash = new Uint8Array(await TonWeb.utils.sha256(new Uint8Array(8)));
            const signature = TonWeb.utils.nacl.sign.detached(hash, this.keyPair.secretKey);
            return createResult(signature);

        } else {
            throw new Error('unsupported transport message')
        }
    }

    async debugTransfer(toAddress, amount, seqno) {
        return this.wallet.methods.transfer({
            secretKey: this.keyPair.secretKey,
            toAddress: toAddress,
            amount: amount,
            seqno: seqno,
            sendMode: 3,
        });
    }

    async debugDeploy() {
        return this.wallet.deploy(this.keyPair.secretKey);
    }
}