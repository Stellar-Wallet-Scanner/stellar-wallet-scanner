import { rpc, xdr, Address, StrKey } from "@stellar/stellar-sdk";
const server = new rpc.Server("https://soroban-testnet.stellar.org");
// grab the latest ledger, pull its txs, find any successful create-contract
const latest = await server.getLatestLedger();
console.log("latest ledger:", latest.sequence);
const txs = await rpcCall("getTransactions", latest.sequence);
async function rpcCall(m, p) {
  const r = await fetch("https://soroban-testnet.stellar.org", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: m, params: p }) });
  return (await r.json()).result;
}
const res = await rpcCall("getTransactions", { startLedger: latest.sequence - 3 });
let checked = 0, found = 0;
for (const t of (res.transactions ?? []).slice(0, 40)) {
  if (t.status !== "SUCCESS" || !t.envelopeXdr) continue;
  checked++;
  try {
    const env = xdr.TransactionEnvelope.fromXDR(t.envelopeXdr, "base64");
    const ops = env.v1().tx().operations();
    for (const op of ops) {
      if (op.body().switch().name !== "invokeHostFunction") continue;
      const hf = op.body().invokeHostFunction();
      const fn = hf.hostFunction().switch().name;
      if (!fn.includes("create")) continue;
      found++;
      const args = hf.hostFunction().createContract();
      let saltHex = "?"; try { saltHex = Buffer.from(args.salt().value ?? args.salt()).toString("hex").slice(0, 8); } catch {}
      // derive ID: sha256(networkId ‖ deployer ‖ salt)
      const { Keypair, Operation } = await import("@stellar/stellar-sdk");
      const crypto = await import("node:crypto");
      const src = op.sourceAccount ?? env.v1().tx().sourceAccount();
      const deployerG = StrKey.encodeEd25519PublicKey(Buffer.from(src.ed25519()));
      const deployerRaw = Keypair.fromPublicKey(deployerG).rawPublicKey();
      const netId = crypto.createHash("sha256").update("Test SDF Network ; September 2015").digest();
      const id = crypto.createHash("sha256").update(Buffer.concat([netId, Buffer.from(deployerRaw), Buffer.from(args.salt().value ?? args.salt())])).digest();
      const cid = StrKey.encodeContract(id);
      // probe instance visibility with the same key construction used before
      const key = xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
        contract: new Address(cid).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent,
      }));
      const r = await server.getLedgerEntries(key);
      console.log(`create ${cid.slice(0, 12)}… salt=${saltHex} → instance entries: ${r.entries?.length ?? 0}`);
      if (found >= 3) break;
    }
  } catch {}
  if (found >= 3) break;
}
console.log(`checked ${checked} txs, found ${found} create ops`);
