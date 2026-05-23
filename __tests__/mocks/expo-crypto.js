// Jest mock for expo-crypto. The real module pulls in expo-modules-core
// which references React-Native's `ErrorUtils` global — undefined in Node.
// Tests that load any code calling Crypto.getRandomBytes / randomUUID
// hit "ReferenceError: ErrorUtils is not defined" without this mock.
//
// We use Node's built-in crypto for the actual random source so tests
// still exercise meaningful entropy.
const nodeCrypto = require('crypto');

function getRandomBytes(byteCount) {
  return new Uint8Array(nodeCrypto.randomBytes(byteCount));
}

function getRandomBytesAsync(byteCount) {
  return Promise.resolve(getRandomBytes(byteCount));
}

function randomUUID() {
  return nodeCrypto.randomUUID();
}

const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
  SHA1: 'SHA-1',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
  MD5: 'MD5',
};

const CryptoEncoding = { HEX: 'hex', BASE64: 'base64' };

async function digestStringAsync(algorithm, data) {
  const algoMap = { 'SHA-256': 'sha256', 'SHA-1': 'sha1', 'SHA-384': 'sha384', 'SHA-512': 'sha512', MD5: 'md5' };
  const h = nodeCrypto.createHash(algoMap[algorithm] ?? 'sha256');
  h.update(data);
  return h.digest('hex');
}

module.exports = {
  getRandomBytes,
  getRandomBytesAsync,
  randomUUID,
  digestStringAsync,
  CryptoDigestAlgorithm,
  CryptoEncoding,
};
