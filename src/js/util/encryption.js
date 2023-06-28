// This JS library implements TON message comment encryption and decryption for Web
// Reference C++ code - SimpleEncryptionV2 - https://github.com/ton-blockchain/ton/blob/cc0eb453cb3bf69f92693160103d33112856c056/tonlib/tonlib/keys/SimpleEncryption.cpp#L110
// Dependencies:
// - TonWeb 0.0.60
// - aes-js - 3.1.2 - https://github.com/ricmoo/aes-js/releases/tag/v3.1.2 - for aes-cbc without padding
// - noble-ed25519 - 1.7.3 - // https://github.com/paulmillr/noble-ed25519/releases/tag/1.7.3 - for getSharedKey

const ed25519 = window.nobleEd25519;

/**
 * @param key {Uint8Array}
 * @param data {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const hmac_sha512 = async (key, data) => {
    const hmacAlgo = {name: "HMAC", hash: "SHA-512"};
    const hmacKey = await window.crypto.subtle.importKey("raw", key, hmacAlgo, false, ["sign"]);
    const signature = await window.crypto.subtle.sign(hmacAlgo, hmacKey, data);
    const result = new Uint8Array(signature);
    if (result.length !== 512 / 8) throw new Error();
    return result;
}

/**
 * @param hash  {Uint8Array}
 * @return {Promise<any>}
 */
const getAesCbcState = async (hash) => {
    if (hash.length < 48) throw new Error();
    const key = hash.slice(0, 32);
    const iv = hash.slice(32, 32 + 16);

    // Note that native crypto.subtle AES-CBC not suitable here because
    // even if the data IS a multiple of 16 bytes, padding will still be added
    // So we use aes-js

    return new aesjs.ModeOfOperation.cbc(key, iv);
}

/**
 * @param dataLength    {number}
 * @param minPadding    {number}
 * @return {Uint8Array}
 */
const getRandomPrefix = (dataLength, minPadding) => {
    const prefixLength = ((minPadding + 15 + dataLength) & -16) - dataLength;
    const prefix = window.crypto.getRandomValues(new Uint8Array(prefixLength));
    prefix[0] = prefixLength;
    if ((prefixLength + dataLength) % 16 !== 0) throw new Error();
    return prefix;
}

/**
 * @param a {Uint8Array}
 * @param b {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const combineSecrets = async (a, b) => {
    return hmac_sha512(a, b);
}

/**
 * @param data  {Uint8Array}
 * @param sharedSecret {Uint8Array}
 * @param salt  {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const encryptDataWithPrefix = async (data, sharedSecret, salt) => {
    if (data.length % 16 !== 0) throw new Error();
    const dataHash = await combineSecrets(salt, data);
    const msgKey = dataHash.slice(0, 16);

    const res = new Uint8Array(data.length + 16);
    res.set(msgKey, 0);

    const cbcStateSecret = await combineSecrets(sharedSecret, msgKey);
    const encrypted = (await getAesCbcState(cbcStateSecret)).encrypt(data);
    res.set(encrypted, 16);

    return res;
}

/**
 * @param data  {Uint8Array}
 * @param sharedSecret {Uint8Array}
 * @param salt  {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const encryptDataImpl = async (data, sharedSecret, salt) => {
    const prefix = await getRandomPrefix(data.length, 16);
    const combined = new Uint8Array(prefix.length + data.length);
    combined.set(prefix, 0);
    combined.set(data, prefix.length);
    return encryptDataWithPrefix(combined, sharedSecret, salt);
}

/**
 * @param data  {Uint8Array}
 * @param myPublicKey {Uint8Array}
 * @param theirPublicKey {Uint8Array}
 * @param privateKey    {Uint8Array}
 * @param salt  {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
export const encryptData = async (data, myPublicKey, theirPublicKey, privateKey, salt) => {
    const sharedSecret = await ed25519.getSharedSecret(privateKey, theirPublicKey);

    const encrypted = await encryptDataImpl(data, sharedSecret, salt);
    const prefixedEncrypted = new Uint8Array(myPublicKey.length + encrypted.length);
    for (let i = 0; i < myPublicKey.length; i++) {
        prefixedEncrypted[i] = theirPublicKey[i] ^ myPublicKey[i];
    }
    prefixedEncrypted.set(encrypted, myPublicKey.length);
    return prefixedEncrypted;
}

/**
 * @param comment   {string}
 * @param myPublicKey   {Uint8Array}
 * @param theirPublicKey    {Uint8Array}
 * @param myPrivateKey  {Uint8Array}
 * @param senderAddress   {string | Address}
 * @return {Promise<Uint8Array>} full message binary payload with 0x2167da4b prefix
 */
export const encryptMessageComment = async (comment, myPublicKey, theirPublicKey, myPrivateKey, senderAddress) => {
    if (!comment || !comment.length) throw new Error('empty comment');

    if (myPrivateKey.length === 64) {
        myPrivateKey = myPrivateKey.slice(0, 32); // convert nacl private key
    }

    const commentBytes = new TextEncoder().encode(comment);

    const salt = new TextEncoder().encode(new TonWeb.utils.Address(senderAddress).toString(true, true, true, false));

    const encryptedBytes = await encryptData(commentBytes, myPublicKey, theirPublicKey, myPrivateKey, salt);

    const payload = new Uint8Array(encryptedBytes.length + 4);
    payload[0] = 0x21; // encrypted text prefix
    payload[1] = 0x67;
    payload[2] = 0xda;
    payload[3] = 0x4b;
    payload.set(encryptedBytes, 4);

    return payload;
}

/**
 * @param cbcStateSecret {Uint8Array}
 * @param msgKey {Uint8Array}
 * @param encryptedData {Uint8Array}
 * @param salt {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const doDecrypt = async (cbcStateSecret, msgKey, encryptedData, salt) => {
    const decryptedData = (await getAesCbcState(cbcStateSecret)).decrypt(encryptedData);
    const dataHash = await combineSecrets(salt, decryptedData);
    const gotMsgKey = dataHash.slice(0, 16);
    if (msgKey.join(',') !== gotMsgKey.join(',')) {
        throw new Error('Failed to decrypt: hash mismatch')
    }
    const prefixLength = decryptedData[0];
    if (prefixLength > decryptedData.length || prefixLength < 16) {
        throw new Error('Failed to decrypt: invalid prefix size');
    }
    return decryptedData.slice(prefixLength);
}

/**
 * @param encryptedData {Uint8Array}
 * @param sharedSecret {Uint8Array}
 * @param salt {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const decryptDataImpl = async (encryptedData, sharedSecret, salt) => {
    if (encryptedData.length < 16) throw new Error('Failed to decrypt: data is too small');
    if (encryptedData.length % 16 !== 0) throw new Error('Failed to decrypt: data size is not divisible by 16');
    const msgKey = encryptedData.slice(0, 16);
    const data = encryptedData.slice(16);
    const cbcStateSecret = await combineSecrets(sharedSecret, msgKey);
    const res = await doDecrypt(cbcStateSecret, msgKey, data, salt);
    return res;
}

/**
 * @param data  {Uint8Array}
 * @param publicKey  {Uint8Array}
 * @param privateKey  {Uint8Array}
 * @param salt  {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
export const decryptData = async (data, publicKey, privateKey, salt) => {
    if (data.length < publicKey.length) {
        throw new Error('Failed to decrypt: data is too small');
    }
    const theirPublicKey = new Uint8Array(publicKey.length);
    for (let i = 0; i < publicKey.length; i++) {
        theirPublicKey[i] = data[i] ^ publicKey[i];
    }
    const sharedSecret = await ed25519.getSharedSecret(privateKey, theirPublicKey);

    const decrypted = await decryptDataImpl(data.slice(publicKey.length), sharedSecret, salt);
    return decrypted;
}

/**
 * @param encryptedData {Uint8Array}    encrypted data without 0x2167da4b prefix
 * @param myPublicKey   {Uint8Array}
 * @param myPrivateKey  {Uint8Array}
 * @param senderAddress   {string | Address}
 * @return {Promise<string>}    decrypted text comment
 */
export const decryptMessageComment = async (encryptedData, myPublicKey, myPrivateKey, senderAddress) => {
    if (myPrivateKey.length === 64) {
        myPrivateKey = myPrivateKey.slice(0, 32); // convert nacl private key
    }

    const salt = new TextEncoder().encode(new TonWeb.utils.Address(senderAddress).toString(true, true, true, false));

    const decryptedBytes = await decryptData(encryptedData, myPublicKey, myPrivateKey, salt);
    return new TextDecoder().decode(decryptedBytes);
}