import { Asset, rpc, StrKey, xdr } from '@stellar/stellar-sdk';
const issuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const asset = new Asset('USDC', issuer);
const cid = asset.contractId('Test SDF Network ; September 2015');
console.log('SAC contract ID:', cid);
const server = new rpc.Server('https://soroban-testnet.stellar.org');
const contract = new (await import('@stellar/stellar-sdk')).Contract(cid);
const key = contract.getFootprint();
try {
  const res = await server.getLedgerEntries(key);
  console.log('entries found:', res.entries.length);
  if (res.entries.length > 0) console.log('CONTRACT EXISTS ON TESTNET');
} catch (e) { console.log('ERR', e.message); }
