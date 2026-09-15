import { rpc, StrKey, xdr, Contract } from "@stellar/stellar-sdk";

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"
).replace(/\/$/, "");

export const stellarServer = new rpc.Server(TESTNET_RPC_URL);

/* =========================================================
   STELLAR TESTNET USDC
========================================================= */

export const TESTNET_USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const TESTNET_USDC_CODE = "USDC";

export const TESTNET_USDC_FAUCET_URL = "https://faucet.circle.com/";

export const TESTNET_USDC_TRUSTLINE_URL =
  "https://lab.stellar.org/account/fund";

/* =========================================================
   STELLAR USDT0
========================================================= */

export const TESTNET_USDT_CODE = "USDT0";

export const TESTNET_USDT_SUPPORTED = false;

/* =========================================================
   HELPERS
========================================================= */

function readField(object, field) {
  if (!object) {
    return undefined;
  }

  const value = object[field];

  if (typeof value === "function") {
    return value.call(object);
  }

  return value;
}

function normalizeThresholds(thresholds) {
  if (!thresholds) {
    return [];
  }

  try {
    const value = readField(thresholds, "value");

    if (value instanceof Uint8Array) {
      return Array.from(value);
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value[Symbol.iterator] === "function") {
      return Array.from(value);
    }

    if (typeof thresholds[Symbol.iterator] === "function") {
      return Array.from(thresholds);
    }
  } catch (error) {
    console.error("Threshold normalization failed:", error);
  }

  return [];
}

/* =========================================================
   TESTNET HEALTH
========================================================= */

export async function checkTestnetHealth() {
  try {
    const response = await stellarServer.getHealth();

    return {
      online: response?.status === "healthy",

      status: response?.status || "unknown",

      latestLedger: response?.latestLedger ?? null,
    };
  } catch (error) {
    console.error("Testnet health check failed:", error);

    return {
      online: false,
      status: "offline",
      latestLedger: null,
      error: error?.message || "Unable to reach Stellar Testnet.",
    };
  }
}

/* =========================================================
   BACKEND HEALTH
========================================================= */

async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          "Stellar Wallet Scanner backend is unavailable.",
      );
    }

    return payload;
  } catch (error) {
    console.error("Backend health check failed:", error);

    throw new Error(
      error?.message ||
        "Unable to connect to the Stellar Wallet Scanner backend.",
    );
  }
}

/* =========================================================
   ADDRESS DETECTION
========================================================= */

export function detectAddressType(address) {
  const value = String(address || "").trim();

  if (!value) {
    return {
      type: "empty",
      label: "",
    };
  }

  try {
    if (StrKey.isValidEd25519PublicKey(value)) {
      return {
        type: "account",
        label: "Classic Account",
      };
    }

    if (StrKey.isValidContract && StrKey.isValidContract(value)) {
      return {
        type: "contract",
        label: "Smart Contract",
      };
    }
  } catch (error) {
    console.error("Address detection failed:", error);
  }

  return {
    type: "invalid",
    label: "Invalid Address",
  };
}

/* =========================================================
   ASSET NORMALIZATION
========================================================= */

function normalizeAsset(asset) {
  if (!asset || typeof asset !== "object") {
    return null;
  }

  const rawType = asset.assetType ?? asset.asset_type ?? asset.type ?? "";

  const isNative =
    rawType === "native" ||
    asset.assetCode === "XLM" ||
    asset.asset_code === "XLM";

  const balance = Number(asset.balance ?? 0);

  return {
    ...asset,

    assetType: isNative ? "native" : rawType || "issued",

    assetCode: isNative
      ? "XLM"
      : String(asset.assetCode ?? asset.asset_code ?? asset.code ?? "Unknown"),

    issuer: asset.issuer ?? asset.assetIssuer ?? asset.asset_issuer ?? null,

    balance: Number.isFinite(balance) ? balance : 0,
  };
}

function normalizeAssets(assets) {
  return Array.isArray(assets)
    ? assets.map(normalizeAsset).filter(Boolean)
    : [];
}

/* =========================================================
   ASSET HELPERS
========================================================= */

export function getWalletAsset(assets, assetCode, issuer = null) {
  if (!Array.isArray(assets)) {
    return null;
  }

  return (
    assets.find((asset) => {
      const code = asset?.assetCode ?? asset?.asset_code ?? asset?.code ?? "";

      const assetIssuer =
        asset?.issuer ?? asset?.assetIssuer ?? asset?.asset_issuer ?? null;

      const codeMatches =
        String(code).toUpperCase() === String(assetCode).toUpperCase();

      if (!issuer) {
        return codeMatches;
      }

      return codeMatches && assetIssuer === issuer;
    }) || null
  );
}

export function getTestnetUsdcStatus(assets) {
  const usdc = getWalletAsset(assets, TESTNET_USDC_CODE, TESTNET_USDC_ISSUER);

  const balance = Number(usdc?.balance ?? 0);

  return {
    supported: true,

    code: TESTNET_USDC_CODE,

    issuer: TESTNET_USDC_ISSUER,

    trustlinePresent: Boolean(usdc),

    balance: Number.isFinite(balance) ? balance : 0,

    faucetUrl: TESTNET_USDC_FAUCET_URL,

    trustlineUrl: TESTNET_USDC_TRUSTLINE_URL,
  };
}

export function getTestnetUsdtStatus(assets) {
  const matches = Array.isArray(assets)
    ? assets.filter(
        (asset) => String(asset?.assetCode || "").toUpperCase() === "USDT0",
      )
    : [];

  return {
    supported: TESTNET_USDT_SUPPORTED,

    code: TESTNET_USDT_CODE,

    assetsFound: matches,

    balance: matches.reduce(
      (total, asset) => total + (Number(asset.balance) || 0),
      0,
    ),

    faucetUrl: null,

    trustlineUrl: null,

    message:
      "USDT0 is currently live on Stellar Mainnet, not Stellar Testnet. No official Testnet USDT0 faucet is configured.",
  };
}

/* =========================================================
   WALLET FUNDING
========================================================= */

export async function fundTestnetXlm(address) {
  const value = String(address || "").trim();

  if (!value) {
    throw new Error("Enter a Stellar Testnet wallet address.");
  }

  const response = await fetch(
    `${BACKEND_URL}/api/wallet/fund/${encodeURIComponent(value)}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || "Testnet XLM funding failed.",
    );

    error.cooldownSecondsRemaining = Number(
      payload?.cooldownSecondsRemaining ??
        payload?.cooldown_seconds_remaining ??
        0,
    );

    throw error;
  }

  return payload;
}

export function getUsdcSetup() {
  return {
    code: TESTNET_USDC_CODE,

    issuer: TESTNET_USDC_ISSUER,

    faucetUrl: TESTNET_USDC_FAUCET_URL,

    trustlineUrl: TESTNET_USDC_TRUSTLINE_URL,
  };
}

export function getTestUsdtSetup() {
  return {
    code: TESTNET_USDT_CODE,

    supported: TESTNET_USDT_SUPPORTED,

    message:
      "USDT0 is currently live on Stellar Mainnet. No verified Stellar Testnet USDT0 faucet is configured.",
  };
}

/* =========================================================
   USDC TRUSTLINE
========================================================= */

export async function checkUsdcTrustline(address) {
  const value = String(address || "").trim();

  if (!value) {
    return {
      status: "unknown",
      balance: 0,
      authorized: false,
      issuer: TESTNET_USDC_ISSUER,
      assetCode: TESTNET_USDC_CODE,
      message: "A wallet address is required.",
    };
  }

  return {
    status: "unknown",
    balance: 0,
    authorized: false,
    issuer: TESTNET_USDC_ISSUER,
    assetCode: TESTNET_USDC_CODE,
    message: "USDC status is read directly from the wallet scan.",
  };
}

/* =========================================================
   NORMALIZE BACKEND WALLET RESPONSE
========================================================= */

function normalizeBackendWalletResult(payload) {
  if (!payload) {
    throw new Error("The scanner backend returned an empty response.");
  }

  const findings = Array.isArray(payload.findings) ? payload.findings : [];

  const addressType = payload.addressType || payload.address_type || "account";

  const securityScore = payload.securityScore ?? payload.security_score ?? 0;

  const securityStatus =
    payload.riskLevel ||
    payload.securityStatus ||
    payload.risk_level ||
    "Analysis unavailable";

  const xlmBalanceValue = payload.xlmBalance ?? payload.xlm_balance ?? 0;

  const fundedAmount =
    payload.fundedAmountXlm ?? payload.funded_amount_xlm ?? 0;

  const autoFunded = payload.autoFunded ?? payload.auto_funded ?? false;

  const normalizedAddressType = String(addressType)
    .toLowerCase()
    .includes("account")
    ? "account"
    : addressType;

  const xlmBalance =
    typeof xlmBalanceValue === "number"
      ? `${xlmBalanceValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 7,
        })} XLM`
      : String(xlmBalanceValue);

  const signerCount =
    payload.signerCount ??
    payload.signer_count ??
    payload.totalSignerCount ??
    payload.total_signer_count ??
    0;

  const assets = normalizeAssets(
    Array.isArray(payload.assets) ? payload.assets : [],
  );

  return {
    ...payload,

    address: payload.address || payload.contractAddress || "",

    addressType: normalizedAddressType,

    network: payload.network || "Stellar Testnet",

    xlmBalance,

    rawXlmBalance:
      typeof xlmBalanceValue === "number"
        ? xlmBalanceValue
        : Number(xlmBalanceValue) || 0,

    fundedAmountXlm: Number(fundedAmount) || 0,

    autoFunded: Boolean(autoFunded),

    fundingCooldownSeconds:
      Number(
        payload.fundingCooldownSeconds ?? payload.funding_cooldown_seconds ?? 0,
      ) || 0,

    securityScore: Number(securityScore) || 0,

    securityStatus,

    riskLevel: securityStatus,

    signerCount: Number(signerCount) || 0,

    assets,

    usdc: getTestnetUsdcStatus(assets),

    usdt: getTestnetUsdtStatus(assets),

    findings,

    message: payload.message || "Wallet security scan completed.",
  };
}

/* =========================================================
   SCAN CLASSIC ACCOUNT THROUGH RUST
========================================================= */

async function scanAccount(address) {
  console.log("Sending Stellar account scan to Rust backend:", address);

  const response = await fetch(
    `${BACKEND_URL}/api/wallet/scan/${encodeURIComponent(address)}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        "The Stellar Wallet Scanner backend could not scan this account.",
    );
  }

  console.log("Rust backend wallet scan result:", payload);

  return normalizeBackendWalletResult(payload);
}

/* =========================================================
   CONTRACT LEDGER KEY
========================================================= */

function buildContractInstanceLedgerKey(contractAddress) {
  const contract = new Contract(contractAddress);

  return contract.getFootprint();
}

/* =========================================================
   GET CONTRACT INSTANCE
========================================================= */

async function getContractInstance(contractAddress) {
  const ledgerKey = buildContractInstanceLedgerKey(contractAddress);

  try {
    const response = await stellarServer.getLedgerEntries(ledgerKey);

    if (!response?.entries || response.entries.length === 0) {
      throw new Error("Contract not found.");
    }

    return response;
  } catch (error) {
    console.error("Contract instance retrieval failed:", error);

    throw new Error(
      "This smart contract could not be found on Stellar Testnet.",
    );
  }
}

/* =========================================================
   EXTRACT WASM HASH
========================================================= */

function extractWasmHash(contractData) {
  const value = readField(contractData, "val");

  const instance = readField(value, "instance");

  const executable = readField(instance, "executable");

  return readField(executable, "wasmHash");
}

/* =========================================================
   GET CONTRACT WASM
========================================================= */

async function getContractWasm(contractAddress) {
  const instanceResponse = await getContractInstance(contractAddress);

  const ledgerEntry = instanceResponse.entries[0];

  const ledgerData = ledgerEntry.val;

  const contractData = readField(ledgerData, "contractData");

  if (!contractData) {
    throw new Error("Unable to decode the smart contract instance.");
  }

  const wasmHash = extractWasmHash(contractData);

  if (!wasmHash) {
    throw new Error("The deployed contract does not contain a WASM hash.");
  }

  console.log("Contract WASM hash:", wasmHash);

  const wasmLedgerKey = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: wasmHash,
    }),
  );

  let wasmResponse;

  try {
    wasmResponse = await stellarServer.getLedgerEntries(wasmLedgerKey);
  } catch (error) {
    console.error("WASM retrieval failed:", error);

    throw new Error("Unable to retrieve the smart contract WASM from Testnet.");
  }

  if (!wasmResponse?.entries || wasmResponse.entries.length === 0) {
    throw new Error(
      "The contract WASM code could not be found on Stellar Testnet.",
    );
  }

  const wasmEntry = wasmResponse.entries[0];

  const wasmData = readField(wasmEntry.val, "contractCode");

  if (!wasmData) {
    throw new Error("Unable to decode the smart contract WASM ledger entry.");
  }

  const code = readField(wasmData, "code");

  if (!code) {
    throw new Error("The smart contract contains no readable WASM code.");
  }

  return {
    code: code instanceof Uint8Array ? code : new Uint8Array(code),

    wasmHash,

    latestLedger:
      wasmResponse.latestLedger ?? instanceResponse.latestLedger ?? null,
  };
}

/* =========================================================
   WASM ANALYSIS
========================================================= */

async function analyzeWasm(code) {
  const findings = [];

  let functions = [];

  let validWasm = false;

  const MAX_WASM_SIZE = 128 * 1024;

  const wasmSize = code.byteLength;

  try {
    const module = await WebAssembly.compile(code);

    validWasm = true;

    const exports = WebAssembly.Module.exports(module);

    functions = exports
      .filter((item) => item.kind === "function" && !item.name.startsWith("__"))
      .map((item) => item.name);

    console.log("Contract functions:", functions);
  } catch (error) {
    console.error("WASM validation failed:", error);

    findings.push({
      id: "invalid-wasm",

      title: "WASM validation failed",

      severity: "critical",

      description:
        "The deployed contract code could not be validated as WebAssembly.",

      recommendation:
        "Verify the deployed contract code and perform a deeper contract review.",
    });
  }

  if (wasmSize > MAX_WASM_SIZE) {
    findings.push({
      id: "wasm-too-large",

      title: "Large contract WASM",

      severity: "critical",

      description: `The contract WASM is ${wasmSize} bytes.`,

      recommendation:
        "Optimize the contract and reduce unnecessary dependencies or code.",
    });
  } else if (wasmSize >= MAX_WASM_SIZE * 0.85) {
    findings.push({
      id: "wasm-near-limit",

      title: "Contract WASM is near the size limit",

      severity: "medium",

      description: `The contract WASM is ${wasmSize} bytes and is approaching the configured size threshold.`,

      recommendation:
        "Consider optimizing the contract before adding significant functionality.",
    });
  }

  const adminPatterns = [
    "admin",
    "owner",
    "upgrade",
    "pause",
    "freeze",
    "set_admin",
    "set_owner",
    "change_admin",
    "change_owner",
  ];

  const adminFunctions = functions.filter((name) => {
    const normalized = name.toLowerCase();

    return adminPatterns.some((pattern) => normalized.includes(pattern));
  });

  const upgradeFunctions = functions.filter((name) =>
    name.toLowerCase().includes("upgrade"),
  );

  if (upgradeFunctions.length > 0) {
    findings.push({
      id: "upgrade-function",

      title: "Upgrade function detected",

      severity: "high",

      description: `The contract exposes upgrade-related function(s): ${upgradeFunctions.join(
        ", ",
      )}.`,

      recommendation: "Review the authorization protecting contract upgrades.",
    });
  }

  const pauseFunctions = functions.filter((name) => {
    const normalized = name.toLowerCase();

    return normalized.includes("pause") || normalized.includes("freeze");
  });

  if (pauseFunctions.length > 0) {
    findings.push({
      id: "pause-function",

      title: "Pause or freeze function detected",

      severity: "medium",

      description: `The contract exposes pause or freeze functionality: ${pauseFunctions.join(
        ", ",
      )}.`,

      recommendation: "Review who is authorized to execute these functions.",
    });
  }

  if (
    adminFunctions.length > 0 &&
    upgradeFunctions.length === 0 &&
    pauseFunctions.length === 0
  ) {
    findings.push({
      id: "admin-function",

      title: "Administrative function detected",

      severity: "medium",

      description: `The contract exposes administrative-looking function(s): ${adminFunctions.join(
        ", ",
      )}.`,

      recommendation:
        "Review authorization and access control around privileged functions.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "no-obvious-findings",

      title: "No obvious security findings",

      severity: "info",

      description:
        "The current automated analysis did not identify obvious issues in the available contract metadata and exported functions.",

      recommendation:
        "Perform a deeper manual security review before using the contract in production.",
    });
  }

  let score = 100;

  for (const finding of findings) {
    if (finding.severity === "critical") {
      score -= 45;
    } else if (finding.severity === "high") {
      score -= 30;
    } else if (finding.severity === "medium") {
      score -= 15;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let securityStatus = "Healthy";

  if (score < 60) {
    securityStatus = "Critical Risk";
  } else if (score < 85) {
    securityStatus = "At Risk";
  }

  return {
    wasmSize,
    validWasm,
    functions,
    findings,
    securityScore: score,
    securityStatus,
  };
}

/* =========================================================
   SCAN CONTRACT
========================================================= */

async function scanContract(address) {
  console.log("Scanning Soroban contract:", address);

  const contractData = await getContractWasm(address);

  const analysis = await analyzeWasm(contractData.code);

  return {
    address,

    contractAddress: address,

    addressType: "contract",

    network: "Stellar Testnet",

    wasmSize: analysis.wasmSize,

    wasmHash: contractData.wasmHash,

    validWasm: analysis.validWasm,

    functions: analysis.functions,

    functionCount: analysis.functions.length,

    latestLedger: contractData.latestLedger,

    securityScore: analysis.securityScore,

    securityStatus: analysis.securityStatus,

    findings: analysis.findings,
  };
}

/* =========================================================
   MAIN SCANNER
========================================================= */

export async function scanAddress(address) {
  const value = String(address || "").trim();

  const detection = detectAddressType(value);

  console.log("Address detection:", value, detection);

  if (detection.type === "empty") {
    throw new Error("Enter a Stellar Testnet address.");
  }

  if (detection.type === "invalid") {
    throw new Error("Enter a valid Stellar wallet or smart contract address.");
  }

  if (detection.type === "account") {
    return scanAccount(value);
  }

  if (detection.type === "contract") {
    return scanContract(value);
  }

  throw new Error("Unable to determine the Stellar address type.");
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  stellarServer,
  checkTestnetHealth,
  checkBackendHealth,
  checkUsdcTrustline,
  detectAddressType,
  fundTestnetXlm,
  getUsdcSetup,
  getTestUsdtSetup,
  getWalletAsset,
  getTestnetUsdcStatus,
  getTestnetUsdtStatus,
  scanAddress,
  TESTNET_USDC_CODE,
  TESTNET_USDC_ISSUER,
  TESTNET_USDC_FAUCET_URL,
  TESTNET_USDC_TRUSTLINE_URL,
  TESTNET_USDT_CODE,
  TESTNET_USDT_SUPPORTED,
};
