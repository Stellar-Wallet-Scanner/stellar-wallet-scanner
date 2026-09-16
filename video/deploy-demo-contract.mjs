// One-shot: fund fresh keypair, upload WASM, verify the code entry exists,
// deploy the contract, verify the instance — with full diagnostics.
import { rpc, Address, Keypair, TransactionBuilder, Operation, Contract, xdr, StrKey } from "@stellar/stellar-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = new rpc.Server("https://soroban-testnet.stellar.org");
const RPC = "https://soroban-testnet.stellar.org";
const NETWORK = "Test SDF Network ; September 2015";
const field = (o, n) => { if (!o) return undefined; const v = o[n]; return typeof v === "function" ? v.call(o) : v; };

async function rpcCall(m, p) {
  const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: m, params: p }) });
  return (await r.json()).result;
}

async function pollTx(hash) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await rpcCall("getTransaction", { hash });
    if (res?.status !== "PENDING" && res?.status !== "NOT_FOUND") return res;
  }
  throw new Error("tx poll timeout");
}

async function submit(builder, signer) {
  const tx = builder.build();
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(signer);
  const sent = await server.sendTransaction(prepared);
  const final = await pollTx(sent.hash);
  final.txHash = sent.hash;
  console.log("  tx", sent.hash.slice(0, 12), "→", final.status);
  if (final.status !== "SUCCESS") {
    console.log("  resultXdr:", String(final.resultXdr).slice(0, 120));
    throw new Error("tx failed: " + final.status);
  }
  return final;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasm = await fs.readFile(path.join(__dirname, "demo-contract/target/wasm32v1-none/release/guard_token.wasm"));
console.log("wasm bytes:", wasm.length);

const kp = Keypair.random();
console.log("fresh deployer:", kp.publicKey());
const fb = await fetch(`https://friendbot-testnet.stellar.org/?addr=${kp.publicKey()}`);
console.log("friendbot:", fb.status);
if (!fb.ok) process.exit(1);
await new Promise((r) => setTimeout(r, 3000));

// ---- UPLOAD (tx 1: Soroban txs allow only ONE operation) ----
console.log("[1] upload");
const crypto = await import("node:crypto");
const wasmHashHex = crypto.createHash("sha256").update(wasm).digest("hex");
console.log("  wasmHash (sha256):", wasmHashHex);
let account = await server.getAccount(kp.publicKey());
const up = await submit(
  new TransactionBuilder(account, { fee: "200000", networkPassphrase: NETWORK })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(120),
  kp,
);

// ---- POLL FOR CODE ENTRY (replica lag can exceed a minute) ----
console.log("[2] waiting for code entry (up to 90s)");
const codeKey = xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash: new xdr.Hash(Buffer.from(wasmHashHex, "hex")) }));
let codeEntry = null;
for (let i = 0; i < 30; i++) {
  const res = await server.getLedgerEntries(codeKey);
  if (res.entries?.length) { codeEntry = res.entries[0]; break; }
  if (i % 6 === 5) console.log(`  not visible after ${(i + 1) * 3}s…`);
  await new Promise((r) => setTimeout(r, 3000));
}
if (!codeEntry) {
  console.log("  code entry NEVER appeared — aborting");
  process.exit(1);
}
console.log("  code entry FOUND");

// ---- DEPLOY (tx 2) ----
console.log("[3] deploy");
const contractSalt = crypto.createHash("sha256").update(`salt2-${Date.now()}`).digest();
account = await server.getAccount(kp.publicKey());
const dep = await submit(
  new TransactionBuilder(account, { fee: "200000", networkPassphrase: NETWORK })
    .addOperation(
      Operation.createCustomContract({
        address: new Address(kp.publicKey()),
        wasmHash: Buffer.from(wasmHashHex, "hex"),
        salt: contractSalt,
        constructorArgs: [new Address(kp.publicKey()).toScVal()],
      }),
    )
    .setTimeout(120),
  kp,
);
// Ground truth: the TRUE contract ID comes from the deploy tx's ledger-entry
// changes (derived sha256 formulas have repeatedly produced wrong IDs here).
function extractCreatedContractIds(resultMetaXdrB64) {
  const meta = xdr.TransactionMeta.fromXDR(resultMetaXdrB64, "base64");
  const v = meta.v4 ?? meta.v3;
  const ops = Array.isArray(v.operations) ? v.operations : v.operations();
  const ids = [];
  for (const op of ops) {
    const ch = typeof op.changes === "function" ? op.changes() : op.changes;
    for (const c of ch) {
      const le = c.created ?? c.updated;
      if (!le) continue;
      const d = typeof le.data === "function" ? le.data() : le.data;
      const cd = d?.contractData ?? null;
      if (!cd) continue;
      const key = typeof cd.key === "function" ? cd.key() : cd.key;
      const kTypeName = key?.type?._switch?.name ?? String(key?.type);
      if (!/ContractInstance/i.test(String(kTypeName))) continue;
      const contract = typeof cd.contract === "function" ? cd.contract() : cd.contract;
      const cidRaw = typeof contract.contractId === "function" ? contract.contractId() : contract.contractId;
      const bytes = cidRaw?.value ?? cidRaw;
      if (bytes) ids.push(StrKey.encodeContract(Buffer.from(bytes)));
    }
  }
  return ids;
}
const createdIds = extractCreatedContractIds(dep.resultMetaXdr);
console.log("  created contract IDs:", createdIds);
if (!createdIds.length) throw new Error("deploy tx created no contract instance");
const contractId = createdIds[0];
console.log("  CONTRACT_ID (from ledger changes):", contractId);

const secretOut = { contractId, wasmHash: wasmHashHex, deployer: kp.publicKey(), secret: kp.secret(), uploadTxHash: up.txHash, deployTxHash: dep.txHash, deployedAt: new Date().toISOString() };
await fs.writeFile(path.join(__dirname, "raw/demo-contract.json"), JSON.stringify(secretOut, null, 2));
console.log("OK — saved raw/demo-contract.json");
process.exit(0);
