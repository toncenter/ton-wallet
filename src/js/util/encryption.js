// This JS library implements TON message comment encryption and decryption for Web
// Reference C++ code - SimpleEncryptionV2 - https://github.com/ton-blockchain/ton/blob/cc0eb453cb3bf69f92693160103d33112856c056/tonlib/tonlib/keys/SimpleEncryption.cpp#L110
// Dependencies:
// - TonWeb 0.0.60
// - aes-js - 3.1.2 - https://github.com/ricmoo/aes-js/releases/tag/v3.1.2 - for aes-cbc without padding
// - noble-ed25519 - 1.7.3 - // https://github.com/paulmillr/noble-ed25519/releases/tag/1.7.3 - for getSharedKey

const ed25519 = self.nobleEd25519;

/**
 * @param key {Uint8Array}
 * @param data {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const hmac_sha512 = async (key, data) => {
    const hmacAlgo = {name: "HMAC", hash: "SHA-512"};
    /** @type {CryptoKey} */
    const hmacKey = await self.crypto.subtle.importKey("raw", key, hmacAlgo, false, ["sign"]);
    /** @type {ArrayBuffer} */
    const signature = await self.crypto.subtle.sign(hmacAlgo, hmacKey, data);
    const result = new Uint8Array(signature);
    if (result.length !== 512 / 8) throw new Error();
    return result;
}

/**
 * @param hash  {Uint8Array}
 * @return {Promise<any>} aesjs.ModeOfOperation.cbc
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
    /** @type {Uint8Array} */
    const prefix = self.crypto.getRandomValues(new Uint8Array(prefixLength));
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
    /** @type {Uint8Array} */
    const dataHash = await combineSecrets(salt, data);
    /** @type {Uint8Array} */
    const msgKey = dataHash.slice(0, 16);

    const res = new Uint8Array(data.length + 16);
    res.set(msgKey, 0);

    /** @type {Uint8Array} */
    const cbcStateSecret = await combineSecrets(sharedSecret, msgKey);
    /** @type {Uint8Array} */
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
    /** @type {Uint8Array} */
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
    /** @type {Uint8Array} */
    const sharedSecret = await ed25519.getSharedSecret(privateKey, theirPublicKey);

    /** @type {Uint8Array} */
    const encrypted = await encryptDataImpl(data, sharedSecret, salt);
    const prefixedEncrypted = new Uint8Array(myPublicKey.length + encrypted.length);
    for (let i = 0; i < myPublicKey.length; i++) {
        prefixedEncrypted[i] = theirPublicKey[i] ^ myPublicKey[i];
    }
    prefixedEncrypted.set(encrypted, myPublicKey.length);
    return prefixedEncrypted;
}

/**
 * @param bytes {Uint8Array}
 * @return {Cell}
 */
export const makeSnakeCells = (bytes) => {
    const ROOT_CELL_BYTE_LENGTH = 35 + 4;
    const CELL_BYTE_LENGTH = 127;
    /** @type {Cell} */
    const root = new TonWeb.boc.Cell();
    root.bits.writeBytes(bytes.slice(0, Math.min(bytes.length, ROOT_CELL_BYTE_LENGTH)));

    const cellCount = Math.ceil((bytes.length - ROOT_CELL_BYTE_LENGTH) / CELL_BYTE_LENGTH);
    if (cellCount > 16) {
        throw new Error('Text too long');
    }

    /** @type {Cell} */
    let cell = root;
    for (let i = 0; i < cellCount; i++) {
        /** @type {Cell} */
        const prevCell = cell;
        cell = new TonWeb.boc.Cell();
        const cursor = ROOT_CELL_BYTE_LENGTH + i * CELL_BYTE_LENGTH;
        cell.bits.writeBytes(bytes.slice(cursor, Math.min(bytes.length, cursor + CELL_BYTE_LENGTH)));
        prevCell.refs[0] = cell;
    }

    return root;
}

/**
 * @param cell  {Cell}
 * @return {Uint8Array}
 */
export const parseSnakeCells = (cell) => {
    /** @type {Cell} */
   let c = cell;
    /** @type {Uint8Array} */
   let result = new Uint8Array(0);
   while (c) {
       /** @type {Uint8Array} */
       const newResult = new Uint8Array(result.length + c.bits.array.length);
       newResult.set(result);
       newResult.set(c.bits.array, result.length);

       result = newResult;
       c = c.refs[0];
   }
   return result;
}

/**
 * @param comment   {string}
 * @param myPublicKey   {Uint8Array}
 * @param theirPublicKey    {Uint8Array}
 * @param myPrivateKey  {Uint8Array}
 * @param senderAddress   {string | Address}
 * @return {Promise<Cell>} full message binary payload with 0x2167da4b prefix
 */
export const encryptMessageComment = async (comment, myPublicKey, theirPublicKey, myPrivateKey, senderAddress) => {
    if (!comment || !comment.length) throw new Error('empty comment');

    if (myPrivateKey.length === 64) {
        myPrivateKey = myPrivateKey.slice(0, 32); // convert nacl private key
    }

    /** @type {Uint8Array} */
    const commentBytes = new TextEncoder().encode(comment);

    /** @type {Uint8Array} */
    const salt = new TextEncoder().encode(new TonWeb.utils.Address(senderAddress).toString(true, true, true, false));

    /** @type {Uint8Array} */
    const encryptedBytes = await encryptData(commentBytes, myPublicKey, theirPublicKey, myPrivateKey, salt);

    const payload = new Uint8Array(encryptedBytes.length + 4);
    payload[0] = 0x21; // encrypted text prefix
    payload[1] = 0x67;
    payload[2] = 0xda;
    payload[3] = 0x4b;
    payload.set(encryptedBytes, 4);

    return makeSnakeCells(payload);
}

/**
 * @param cbcStateSecret {Uint8Array}
 * @param msgKey {Uint8Array}
 * @param encryptedData {Uint8Array}
 * @param salt {Uint8Array}
 * @return {Promise<Uint8Array>}
 */
const doDecrypt = async (cbcStateSecret, msgKey, encryptedData, salt) => {
    /** @type {Uint8Array} */
    const decryptedData = (await getAesCbcState(cbcStateSecret)).decrypt(encryptedData);
    /** @type {Uint8Array} */
    const dataHash = await combineSecrets(salt, decryptedData);
    /** @type {Uint8Array} */
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
    /** @type {Uint8Array} */
    const msgKey = encryptedData.slice(0, 16);
    /** @type {Uint8Array} */
    const data = encryptedData.slice(16);
    /** @type {Uint8Array} */
    const cbcStateSecret = await combineSecrets(sharedSecret, msgKey);
    /** @type {Uint8Array} */
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
    /** @type {Uint8Array} */
    const sharedSecret = await ed25519.getSharedSecret(privateKey, theirPublicKey);

    /** @type {Uint8Array} */
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

    /** @type {Uint8Array} */
    const salt = new TextEncoder().encode(new TonWeb.utils.Address(senderAddress).toString(true, true, true, false));

    /** @type {Uint8Array} */
    const decryptedBytes = await decryptData(encryptedData, myPublicKey, myPrivateKey, salt);
    return new TextDecoder().decode(decryptedBytes);
}