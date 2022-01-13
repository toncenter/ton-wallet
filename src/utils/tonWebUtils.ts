import TonWeb from "tonweb";
import * as tonMnemonic from "tonweb-mnemonic";

export async function wordsToPrivateKey(words: string[]) {
    const keyPair = await tonMnemonic.mnemonicToKeyPair(words);
    return TonWeb.utils.bytesToBase64(keyPair.secretKey.slice(0, 32));
}

export async function getTransactions(ton: any, myAddress: string, limit = 20) {

    function getComment(msg: any) {
        if (!msg.msg_data) return '';
        if (msg.msg_data['@type'] !== 'msg.dataText') return '';
        const base64 = msg.msg_data.text;
        return new TextDecoder().decode(TonWeb.utils.base64ToBytes(base64));
    }

    const arr = [];
    const transactions = await ton.getTransactions(myAddress, limit);
    for (let t of transactions) {
        let amount = new TonWeb.utils.BN(t.in_msg.value);
        for (let outMsg of t.out_msgs) {
            amount = amount.sub(new TonWeb.utils.BN(outMsg.value));
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
