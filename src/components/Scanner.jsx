import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileSearch,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import {
  detectAddressType,
  fundTestnetXlm,
  getUsdcSetup,
  scanAddress,
} from "../services/stellar";

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(value, maximumFractionDigits = 7) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

function formatCooldown(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }

  return `${secs}s`;
}

function shortenAddress(address, start = 8, end = 6) {
  if (!address) {
    return "";
  }

  if (address.length <= start + end + 3) {
    return address;
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

function getRiskTone(score) {
  const numericScore = Number(score) || 0;

  if (numericScore >= 85) {
    return "healthy";
  }

  if (numericScore >= 60) {
    return "warning";
  }

  return "critical";
}

function getSeverityTone(severity) {
  const normalized = String(severity || "").toLowerCase();

  if (normalized.includes("critical")) {
    return "critical";
  }

  if (normalized.includes("high")) {
    return "critical";
  }

  if (normalized.includes("medium")) {
    return "warning";
  }

  return "info";
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Scanner({ onScanComplete }) {
  const [address, setAddress] = useState("");

  const [result, setResult] = useState(null);

  const [isScanning, setIsScanning] = useState(false);

  const [isFundingXlm, setIsFundingXlm] = useState(false);

  const [fundingError, setFundingError] = useState("");

  const [fundingCooldownSeconds, setFundingCooldownSeconds] = useState(0);

  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const [showAdvanced, setShowAdvanced] = useState(false);

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const removeNotification = useCallback((id) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const notify = useCallback(
    ({
      type = "info",
      title,
      message,
      actionLabel = "",
      onAction = null,
      duration = 5000,
    }) => {
      const id = `${Date.now()}-${Math.random()}`;

      setNotifications((current) => [
        ...current,
        {
          id,
          type,
          title,
          message,
          actionLabel,
          onAction,
        },
      ]);

      window.setTimeout(() => {
        removeNotification(id);
      }, duration);
    },
    [removeNotification],
  );

  /* =======================================================
     COPY ADDRESS
  ======================================================= */

  const copyAddress = async () => {
    if (!address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(address);

      setCopied(true);

      notify({
        type: "success",
        title: "Address copied",
        message:
          "The Stellar wallet address has been copied to your clipboard.",
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (copyError) {
      console.error("Copy failed:", copyError);

      notify({
        type: "error",
        title: "Copy failed",
        message: "The address could not be copied automatically.",
      });
    }
  };

  /* =======================================================
     SCAN
  ======================================================= */

  const scrollToFunding = useCallback(() => {
    window.requestAnimationFrame(() => {
      document
        .getElementById("testnet-funds")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const handleScan = async (event) => {
    event?.preventDefault();

    const value = address.trim();

    setError("");
    setFundingError("");
    setResult(null);

    if (!value) {
      setError("Enter a Stellar wallet or smart contract address.");

      notify({
        type: "error",
        title: "Address required",
        message: "Enter a valid Stellar Testnet address to begin the scan.",
      });

      return;
    }

    const detected = detectAddressType(value);

    if (detected.type === "invalid") {
      setError("That does not look like a valid Stellar address.");

      notify({
        type: "error",
        title: "Invalid address",
        message:
          "Enter a valid Stellar G... account or C... smart contract address.",
      });

      return;
    }

    setIsScanning(true);

    try {
      const scanResult = await scanAddress(value);

      setResult(scanResult);

      setFundingCooldownSeconds(
        Number(
          scanResult?.fundingCooldownSeconds ??
            scanResult?.funding_cooldown_seconds ??
            0,
        ) || 0,
      );

      if (scanResult.autoFunded) {
        notify({
          type: "success",
          title: "NEW WALLET DETECTED",
          message:
            scanResult.fundedAmountXlm > 0
              ? `Congratulations! Your wallet received ${formatNumber(scanResult.fundedAmountXlm)} XLM automatically.`
              : "Congratulations! Your new wallet was funded automatically.",
          actionLabel: "View Testnet Funds",
          onAction: scrollToFunding,
          duration: 8000,
        });
      } else if (scanResult.addressType === "account") {
        notify({
          type: "success",
          title: "EXISTING WALLET IDENTIFIED",
          message:
            "This Stellar Testnet wallet already exists. No automatic funding was performed.",
          actionLabel: "Get Testnet Funds ↓",
          onAction: scrollToFunding,
          duration: 8000,
        });
      } else if (scanResult.addressType === "contract") {
        notify({
          type: "info",
          title: "Smart contract detected",
          message:
            "The address is a Soroban smart contract deployed on Stellar Testnet.",
        });
      }

      if (typeof onScanComplete === "function") {
        onScanComplete(scanResult);
      }
    } catch (scanError) {
      console.error("Wallet scan failed:", scanError);

      const message =
        scanError?.message || "Unable to scan this Stellar address.";

      setError(message);

      notify({
        type: "error",
        title: "Scan failed",
        message,
        duration: 7000,
      });
    } finally {
      setIsScanning(false);
    }
  };

  /* =======================================================
     XLM FUNDING
  ======================================================= */

  const handleXlmFunding = async () => {
    const value = address.trim();

    if (!value) {
      notify({
        type: "error",
        title: "Address required",
        message: "Enter a Stellar Testnet wallet address first.",
      });

      return;
    }

    const detected = detectAddressType(value);

    if (detected.type !== "account") {
      notify({
        type: "error",
        title: "Wallet address required",
        message:
          "Testnet XLM funding is available for G... Stellar accounts only.",
      });

      return;
    }

    setIsFundingXlm(true);
    setFundingError("");

    try {
      const funding = await fundTestnetXlm(value);

      const fundedAmount = Number(
        funding?.fundedAmountXlm ?? funding?.funded_amount_xlm ?? 0,
      );

      if (funding?.funded) {
        notify({
          type: "success",
          title: "Testnet XLM received",
          message:
            fundedAmount > 0
              ? `Your wallet received ${formatNumber(
                  fundedAmount,
                )} XLM from Stellar Friendbot.`
              : "Your Testnet XLM funding request was completed.",
          duration: 7000,
        });
      } else {
        notify({
          type: "info",
          title: "No new XLM needed",
          message: funding?.message || "The wallet already has Testnet XLM.",
        });
      }

      const updatedResult = await scanAddress(value);

      setResult(updatedResult);
      setFundingCooldownSeconds(
        Number(
          updatedResult?.fundingCooldownSeconds ??
            updatedResult?.funding_cooldown_seconds ??
            0,
        ) || 0,
      );

      if (typeof onScanComplete === "function") {
        onScanComplete(updatedResult);
      }
    } catch (fundError) {
      console.error("Testnet funding failed:", fundError);

      const message =
        fundError?.message || "Unable to fund the wallet with Testnet XLM.";

      setFundingError(message);

      setFundingCooldownSeconds(
        Number(
          fundError?.cooldownSecondsRemaining ??
            fundError?.cooldown_seconds_remaining ??
            0,
        ) || 0,
      );

      notify({
        type: "error",
        title: "XLM funding failed",
        message,
        duration: 7000,
      });
    } finally {
      setIsFundingXlm(false);
    }
  };

  /* =======================================================
     USDC LINKS
  ======================================================= */

  const openUsdcFaucet = () => {
    const setup = getUsdcSetup();

    window.open(setup.faucetUrl, "_blank", "noopener,noreferrer");
  };

  const openUsdcTrustline = () => {
    const setup = getUsdcSetup();

    window.open(setup.trustlineUrl, "_blank", "noopener,noreferrer");
  };

  /* =======================================================
     FUNDING COOLDOWN TIMER
  ======================================================= */

  useEffect(() => {
    if (fundingCooldownSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFundingCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [fundingCooldownSeconds]);

  /* =======================================================
     KEYBOARD SHORTCUT
  ======================================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && event.ctrlKey) {
        handleScan();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const score = Number(result?.securityScore ?? result?.security_score ?? 0);

  const riskTone = getRiskTone(score);

  const assets = Array.isArray(result?.assets) ? result.assets : [];

  const findings = Array.isArray(result?.findings) ? result.findings : [];

  const accountScan = result?.addressType === "account";

  const contractScan = result?.addressType === "contract";

  const usdc = result?.usdc || {
    supported: true,
    trustlinePresent: false,
    balance: 0,
  };

  const usdt = result?.usdt || {
    supported: false,
    balance: 0,
  };

  const displayRisk =
    result?.securityStatus || result?.riskLevel || "Not scanned";

  const severityCounts = useMemo(() => {
    return findings.reduce(
      (counts, finding) => {
        const severity = String(finding?.severity || "info").toLowerCase();

        if (severity.includes("critical")) {
          counts.critical += 1;
        } else if (severity.includes("high")) {
          counts.high += 1;
        } else if (severity.includes("medium")) {
          counts.medium += 1;
        } else {
          counts.info += 1;
        }

        return counts;
      },
      {
        critical: 0,
        high: 0,
        medium: 0,
        info: 0,
      },
    );
  }, [findings]);

  return (
    <div className="scanner-page">
      <style>
        {`
          .scanner-page {
            width: 100%;
            max-width: none;
            margin: 0 auto;
            padding: 24px 8px 56px;
            color: var(--text);
          }

          .scanner-hero {
            margin-bottom: 24px;
          }

          .scanner-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 7px 11px;
            border-radius: 999px;
            background: rgba(47, 158, 104, 0.1);
            color: #23824f;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .scanner-title {
            margin: 14px 0 8px;
            font-size: clamp(28px, 4vw, 44px);
            line-height: 1.08;
            letter-spacing: -0.04em;
            font-weight: 900;
          }

          .scanner-subtitle {
            max-width: 760px;
            margin: 0;
            color: var(--text-secondary);
            font-size: 15px;
            line-height: 1.7;
          }

          .scanner-testnet-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-top: 16px;
            padding: 8px 12px;
            border: 1px solid rgba(47, 158, 104, 0.2);
            border-radius: 10px;
            background: var(--surface);
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 700;
          }

          .scanner-testnet-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #39a86c;
            box-shadow: 0 0 0 4px rgba(57, 168, 108, 0.12);
          }

          .scanner-card {
            border: 1px solid var(--border);
            border-radius: 18px;
            background: var(--surface);
            box-shadow: 0 14px 40px var(--shadow);
          }

          .scanner-search-card {
            padding: 20px;
          }

          .scanner-form-label {
            display: block;
            margin-bottom: 9px;
            font-size: 13px;
            font-weight: 800;
          }

          .scanner-input-row {
            display: flex;
            gap: 10px;
          }

          .scanner-input-wrap {
            position: relative;
            flex: 1;
          }

          .scanner-input-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #87938c;
            pointer-events: none;
          }

          .scanner-input {
            width: 100%;
            height: 52px;
            padding: 0 48px 0 44px;
            border: 1px solid var(--border);
            border-radius: 13px;
            outline: none;
            background: var(--input);
            color: var(--text);
            font-size: 14px;
            font-family: inherit;
            transition: border-color .2s ease, box-shadow .2s ease;
          }

          .scanner-input:focus {
            border-color: #39a86c;
            box-shadow: 0 0 0 4px rgba(57, 168, 108, 0.1);
          }

          .scanner-input-clear {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 30px;
            display: grid;
            place-items: center;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: #7b877f;
            cursor: pointer;
          }

          .scanner-input-clear:hover {
            background: rgba(0, 0, 0, 0.05);
          }

          .scanner-button {
            height: 52px;
            padding: 0 22px;
            border: 0;
            border-radius: 13px;
            background: #247b4c;
            color: white;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            white-space: nowrap;
            transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
          }

          .scanner-button:hover {
            background: #1c693f;
            transform: translateY(-1px);
            box-shadow: 0 10px 22px rgba(36, 123, 76, 0.18);
          }

          .scanner-button:disabled {
            cursor: not-allowed;
            opacity: .65;
            transform: none;
            box-shadow: none;
          }

          .scanner-hint {
            margin-top: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            color: var(--text-secondary, #738078);
            font-size: 11px;
          }

          .scanner-error {
            margin-top: 12px;
            padding: 12px 14px;
            border: 1px solid rgba(190, 65, 65, 0.18);
            border-radius: 12px;
            background: rgba(190, 65, 65, 0.06);
            color: #a43c3c;
            font-size: 13px;
            line-height: 1.5;
          }

          .scanner-result {
            margin-top: 22px;
            display: grid;
            gap: 18px;
          }

          .scanner-result-header {
            padding: 20px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
          }

          .scanner-address-block {
            min-width: 0;
          }

          .scanner-result-kicker {
            margin-bottom: 8px;
            color: #728077;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .scanner-address {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            font-weight: 700;
            word-break: break-all;
          }

          .scanner-copy {
            flex: 0 0 auto;
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border: 1px solid var(--border);
            border-radius: 9px;
            background: transparent;
            color: #647169;
            cursor: pointer;
          }

          .scanner-copy:hover {
            background: var(--surface-hover);
          }

          .scanner-type-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 11px;
            padding: 6px 9px;
            border-radius: 8px;
            background: rgba(47, 158, 104, 0.09);
            color: #247b4c;
            font-size: 11px;
            font-weight: 800;
          }

          .scanner-score {
            min-width: 150px;
            color: var(--text);
            padding: 16px;
            border-radius: 14px;
            text-align: right;
            background: var(--surface-elevated);
          }

          .scanner-score-number {
            font-size: 32px;
            line-height: 1;
            font-weight: 900;
            letter-spacing: -0.04em;
          }

          .scanner-score-label {
            margin-top: 6px;
            font-size: 11px;
            font-weight: 800;
            color: var(--text-muted);
          }

          .score-healthy {
            color: #278453;
          }

          .score-warning {
            color: #a47722;
          }

          .score-critical {
            color: #ad4545;
          }

          .scanner-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .scanner-stat {
            padding: 17px;
          }

          .scanner-stat-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .scanner-stat-icon {
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border-radius: 10px;
            background: rgba(47, 158, 104, 0.09);
            color: #277f50;
          }

          .scanner-stat-label {
            margin-top: 14px;
            color: var(--text-muted);
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .04em;
          }

          .scanner-stat-value {
            margin-top: 4px;
            font-size: 20px;
            font-weight: 900;
          }

          .scanner-section {
            padding: 20px;
          }

          .scanner-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
          }

          .scanner-section-title {
            display: flex;
            align-items: center;
            gap: 9px;
            margin: 0;
            font-size: 15px;
            font-weight: 900;
          }

          .scanner-section-subtitle {
            margin: 4px 0 0;
            color: var(--text-muted);
            font-size: 12px;
          }

          .scanner-assets {
            display: grid;
            gap: 10px;
          }

          .scanner-asset {
            display: grid;
            color: var(--text);
            grid-template-columns: 42px minmax(0, 1fr) auto;
            align-items: center;
            gap: 12px;
            padding: 13px;
            border: 1px solid var(--border-color, #e7ece9);
            border-radius: 13px;
            background: var(--surface-elevated);
          }

          .scanner-asset-icon {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border-radius: 11px;
            background: rgba(47, 158, 104, 0.1);
            color: #247b4c;
            font-weight: 900;
            font-size: 12px;
          }

          .scanner-asset-name {
            font-size: 13px;
            font-weight: 900;
          }

          .scanner-asset-issuer {
            margin-top: 3px;
            color: var(--text-muted);
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            word-break: break-all;
          }

          .scanner-asset-balance {
            text-align: right;
            font-size: 14px;
            font-weight: 900;
          }

          .scanner-empty {
            padding: 28px 16px;
            text-align: center;
            border: 1px dashed var(--border);
            border-radius: 13px;
            color: var(--text-muted);
            font-size: 12px;
          }

          .scanner-findings {
            display: grid;
            gap: 10px;
          }

          .scanner-finding {
            display: grid;
            grid-template-columns: 38px minmax(0, 1fr);
            gap: 12px;
            padding: 14px;
            border: 1px solid var(--border);
            border-radius: 13px;
          }

          .scanner-finding-icon {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border-radius: 10px;
          }

          .finding-critical {
            background: rgba(183, 67, 67, .09);
            color: #aa4141;
          }

          .finding-warning {
            background: rgba(184, 139, 40, .1);
            color: #9b7625;
          }

          .finding-info {
            background: rgba(47, 128, 91, .09);
            color: #287e51;
          }

          .scanner-finding-title {
            font-size: 13px;
            font-weight: 900;
          }

          .scanner-finding-description {
            margin-top: 5px;
            color: var(--text-secondary);
            font-size: 12px;
            line-height: 1.6;
          }

          .scanner-finding-recommendation {
            margin-top: 8px;
            color: var(--text-secondary);
            font-size: 11px;
            line-height: 1.5;
          }

          .scanner-finding-recommendation strong {
            font-weight: 900;
          }

          .scanner-finding-badge {
            display: inline-flex;
            margin-top: 9px;
            padding: 4px 7px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .05em;
            text-transform: uppercase;
          }

          .scanner-funding {
            padding: 20px;
          }

          .scanner-funding-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .scanner-wallet-funding-panel {
            overflow: hidden;
          }

          .scanner-wallet-status {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 18px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--surface-elevated);
          }

          .scanner-wallet-status-icon {
            display: grid;
            place-items: center;
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            border-radius: 12px;
            background: var(--accent-soft);
            color: var(--accent);
          }

          .scanner-wallet-status-label,
          .scanner-funding-inline-eyebrow {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.1em;
            color: var(--accent);
          }

          .scanner-wallet-status-title {
            margin: 5px 0 5px;
            font-size: 17px;
            line-height: 1.35;
            color: var(--text);
          }

          .scanner-wallet-status-message {
            margin: 0;
            color: var(--text-secondary);
            font-size: 13px;
            line-height: 1.6;
          }

          .scanner-wallet-funds-button {
            margin-top: 11px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            min-height: 32px;
            padding: 0 11px;
            border: 1px solid var(--border);
            border-radius: 9px;
            background: var(--surface);
            color: var(--accent);
            cursor: pointer;
            font: inherit;
            font-size: 11px;
            font-weight: 900;
            transition: background .18s ease, border-color .18s ease, transform .18s ease;
          }

          .scanner-wallet-funds-button:hover {
            background: var(--surface-hover);
            border-color: var(--accent);
            transform: translateY(-1px);
          }

          .scanner-funding-inline {
            margin-top: 14px;
            padding: 18px;
            border-radius: 16px;
            background: var(--surface);
            border: 1px solid var(--border);
          }

          .scanner-funding-inline-heading h3 {
            margin: 4px 0 4px;
            font-size: 16px;
            color: var(--text);
          }

          .scanner-funding-inline-heading p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 13px;
          }

          .scanner-funding-inline-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 15px;
          }

          .scanner-funding-inline-note {
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 10px;
            background: var(--surface-elevated);
            color: var(--text-muted);
            font-size: 12px;
            line-height: 1.55;
          }

          @media (max-width: 700px) {
            .scanner-wallet-status {
              padding: 15px;
            }

            .scanner-funding-inline {
              padding: 15px;
            }

            .scanner-funding-inline-grid {
              grid-template-columns: 1fr;
            }
          }

          .scanner-funding-card {
            padding: 16px;
            color: var(--text);
            border: 1px solid var(--border-color, #e4ebe7);
            border-radius: 14px;
            background: var(--surface-elevated);
          }

          .scanner-funding-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .scanner-funding-icon {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border-radius: 11px;
            background: rgba(47, 158, 104, .1);
            color: #247b4c;
            font-size: 12px;
            font-weight: 900;
          }

          .scanner-funding-status {
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--text-muted);
          }

          .scanner-funding-name {
            margin-top: 13px;
            font-size: 14px;
            font-weight: 900;
          }

          .scanner-funding-description {
            min-height: 55px;
            margin-top: 6px;
            color: var(--text-muted);
            font-size: 11px;
            line-height: 1.55;
          }

          .scanner-funding-button {
            width: 100%;
            height: 40px;
            margin-top: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--surface);
            color: var(--text);
            cursor: pointer;
            font-size: 11px;
            font-weight: 900;
          }

          .scanner-funding-button:hover {
            border-color: #75ae8e;
            background: var(--surface-hover);
          }

          .scanner-funding-button.primary {
            border-color: #247b4c;
            background: #247b4c;
            color: var(--button-text, #ffffff);
          }

          .scanner-funding-button.primary:hover {
            background: #1c693f;
          }

          .scanner-funding-button:disabled {
            cursor: not-allowed;
            opacity: .6;
          }

          .scanner-funding-note {
            margin-top: 13px;
            padding: 10px 12px;
            border-radius: 9px;
            background: rgba(47, 158, 104, .06);
            color: var(--text-muted);
            font-size: 10px;
            line-height: 1.55;
          }

          .scanner-warning-note {
            margin-top: 12px;
            padding: 10px 12px;
            border: 1px solid rgba(181, 133, 31, .18);
            border-radius: 9px;
            background: rgba(181, 133, 31, .06);
            color: #796329;
            font-size: 10px;
            line-height: 1.55;
          }

          .scanner-error-note {
            margin-top: 12px;
            padding: 10px 12px;
            border: 1px solid rgba(190, 65, 65, .18);
            border-radius: 9px;
            background: rgba(190, 65, 65, .06);
            color: #9c4040;
            font-size: 10px;
            line-height: 1.55;
          }

          .scanner-contract {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .scanner-contract-item {
            padding: 15px;
            border-radius: 12px;
            background: var(--surface-elevated);
            border: 1px solid var(--border-color, #e4ebe7);
          }

          .scanner-contract-label {
            color: var(--text-muted);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .05em;
          }

          .scanner-contract-value {
            margin-top: 6px;
            font-size: 14px;
            font-weight: 900;
            word-break: break-word;
          }

          .scanner-functions {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
            margin-top: 12px;
          }

          .scanner-function {
            padding: 6px 8px;
            border-radius: 7px;
            background: rgba(47, 158, 104, .08);
            color: #287d50;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          .scanner-advanced-button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 14px 0 0;
            border: 0;
            border-top: 1px solid var(--border);
            background: transparent;
            color: var(--text);
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
          }

          .scanner-advanced-content {
            padding-top: 15px;
          }

          .scanner-counts {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .scanner-count {
            padding: 10px;
            border-radius: 9px;
            background: var(--surface-elevated);
            text-align: center;
          }

          .scanner-count-number {
            font-size: 16px;
            font-weight: 900;
          }

          .scanner-count-label {
            margin-top: 3px;
            color: var(--text-muted);
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .scanner-notifications {
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 9999;
            width: min(360px, calc(100vw - 32px));
            display: grid;
            gap: 10px;
            pointer-events: none;
          }

          .scanner-notification {
            pointer-events: auto;
            display: grid;
            grid-template-columns: 38px minmax(0, 1fr) 26px;
            gap: 10px;
            align-items: start;
            padding: 13px;
            border: 1px solid rgba(0, 0, 0, .07);
            border-radius: 14px;
            background: var(--surface);
            box-shadow: 0 18px 45px var(--shadow);
            animation: scannerNotificationIn .28s ease both;
          }

          .scanner-notification-icon {
            width: 38px;
            height: 38px;
            display: grid;
            place-items: center;
            border-radius: 11px;
          }

          .notification-success .scanner-notification-icon {
            background: rgba(47, 158, 104, .1);
            color: #267f50;
          }

          .notification-error .scanner-notification-icon {
            background: rgba(190, 65, 65, .1);
            color: #a63e3e;
          }

          .notification-info .scanner-notification-icon {
            background: rgba(74, 118, 151, .1);
            color: #426f91;
          }

          .scanner-notification-title {
            font-size: 12px;
            font-weight: 900;
          }

          .scanner-notification-message {
            margin-top: 3px;
            color: var(--text-secondary);
            font-size: 11px;
            line-height: 1.5;
          }

          .scanner-notification-action {
            margin-top: 9px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 0;
            border: 0;
            background: transparent;
            color: var(--accent);
            cursor: pointer;
            font: inherit;
            font-size: 11px;
            font-weight: 900;
          }

          .scanner-notification-action:hover {
            text-decoration: underline;
          }

          .scanner-notification-action-icon {
            transform: rotate(0deg);
          }

          .scanner-notification-close {
            width: 26px;
            height: 26px;
            display: grid;
            place-items: center;
            border: 0;
            border-radius: 7px;
            background: transparent;
            color: #7d8881;
            cursor: pointer;
          }

          .scanner-notification-close:hover {
            background: rgba(0, 0, 0, .05);
          }

          @keyframes scannerNotificationIn {
            from {
              opacity: 0;
              transform: translateX(25px) translateY(10px);
            }

            to {
              opacity: 1;
              transform: translateX(0) translateY(0);
            }
          }

          .scanner-spinner {
            animation: scannerSpin 1s linear infinite;
          }

          @keyframes scannerSpin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 900px) {
            .scanner-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .scanner-funding-grid {
              grid-template-columns: 1fr;
            }

            .scanner-contract {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 700px) {
            .scanner-page {
              padding: 22px 14px 44px;
            }

            .scanner-input-row {
              flex-direction: column;
            }

            .scanner-button {
              width: 100%;
            }

            .scanner-result-header {
              flex-direction: column;
            }

            .scanner-score {
              width: 100%;
              text-align: left;
            }

            .scanner-grid {
              grid-template-columns: 1fr 1fr;
            }

            .scanner-counts {
              grid-template-columns: 1fr 1fr;
            }

            .scanner-hint {
              flex-direction: column;
              align-items: flex-start;
            }
          }

          @media (max-width: 430px) {
            .scanner-grid {
              grid-template-columns: 1fr;
            }

            .scanner-section,
            .scanner-search-card,
            .scanner-funding,
            .scanner-result-header {
              padding: 16px;
            }

            .scanner-asset {
              grid-template-columns: 38px minmax(0, 1fr);
            }

            .scanner-asset-balance {
              grid-column: 2;
              text-align: left;
            }
          }

          /* =====================================================
             MOBILE POLISH
             Designed specifically for narrow phone screens.
          ===================================================== */
          @media (max-width: 600px) {
            .scanner-page {
              width: 100%;
              box-sizing: border-box;
              padding: 18px 12px 36px;
              overflow-x: hidden;
            }

            .scanner-hero {
              margin-bottom: 18px;
            }

            .scanner-eyebrow {
              max-width: 100%;
              padding: 6px 9px;
              gap: 6px;
              font-size: 10px;
              letter-spacing: 0.065em;
            }

            .scanner-title {
              margin: 12px 0 8px;
              max-width: 100%;
              font-size: clamp(28px, 8.5vw, 36px);
              line-height: 1.05;
              letter-spacing: -0.035em;
            }

            .scanner-subtitle {
              max-width: 100%;
              font-size: 13px;
              line-height: 1.6;
            }

            .scanner-testnet-pill {
              max-width: 100%;
              box-sizing: border-box;
              margin-top: 13px;
              padding: 7px 10px;
              gap: 6px;
              flex-wrap: wrap;
              font-size: 10px;
              line-height: 1.35;
              border-radius: 9px;
            }

            .scanner-testnet-pill > span:last-child {
              flex-basis: 100%;
              padding-left: 13px;
              color: var(--text-muted);
              font-weight: 600;
            }

            .scanner-card {
              border-radius: 15px;
              box-shadow: 0 10px 28px var(--shadow);
            }

            .scanner-search-card {
              padding: 15px;
            }

            .scanner-form-label {
              margin-bottom: 8px;
              font-size: 12px;
            }

            .scanner-input-row {
              display: flex;
              flex-direction: column;
              gap: 9px;
            }

            .scanner-input {
              height: 50px;
              box-sizing: border-box;
              padding: 0 42px 0 41px;
              border-radius: 11px;
              font-size: 13px;
            }

            .scanner-input-icon {
              left: 13px;
            }

            .scanner-input-clear {
              right: 8px;
            }

            .scanner-button {
              width: 100%;
              min-height: 50px;
              height: 50px;
              padding: 0 16px;
              border-radius: 11px;
              font-size: 13px;
            }

            .scanner-hint {
              margin-top: 9px;
              gap: 5px;
              font-size: 10px;
              line-height: 1.45;
            }

            .scanner-hint span:last-child {
              display: none;
            }

            .scanner-result {
              margin-top: 16px;
              gap: 12px;
            }

            .scanner-result-header {
              padding: 15px;
              gap: 13px;
              border-radius: 15px;
            }

            .scanner-result-kicker {
              margin-bottom: 7px;
              font-size: 9px;
            }

            .scanner-address {
              gap: 7px;
              font-size: 11px;
              line-height: 1.45;
            }

            .scanner-copy {
              width: 32px;
              height: 32px;
              border-radius: 8px;
            }

            .scanner-type-badge {
              max-width: 100%;
              box-sizing: border-box;
              margin-top: 9px;
              padding: 5px 7px;
              font-size: 9px;
              line-height: 1.35;
              white-space: normal;
            }

            .scanner-score {
              min-width: 0;
              width: 100%;
              box-sizing: border-box;
              padding: 12px 14px;
              border-radius: 11px;
              text-align: left;
            }

            .scanner-score-number {
              font-size: 27px;
            }

            .scanner-score-label {
              margin-top: 4px;
              font-size: 10px;
            }

            .scanner-grid,
            .scanner-counts {
              grid-template-columns: 1fr 1fr;
              gap: 9px;
            }

            .scanner-stat {
              padding: 13px;
            }

            .scanner-stat-icon {
              width: 31px;
              height: 31px;
              border-radius: 9px;
            }

            .scanner-stat-label {
              margin-top: 11px;
              font-size: 9px;
              line-height: 1.35;
            }

            .scanner-stat-value {
              font-size: 17px;
            }

            .scanner-section,
            .scanner-funding {
              padding: 15px;
            }

            .scanner-section-header {
              align-items: flex-start;
              margin-bottom: 13px;
            }

            .scanner-section-title {
              gap: 7px;
              font-size: 13px;
              line-height: 1.35;
            }

            .scanner-section-subtitle {
              font-size: 10px;
              line-height: 1.45;
            }

            .scanner-asset {
              grid-template-columns: 36px minmax(0, 1fr);
              gap: 9px;
              padding: 11px;
              border-radius: 11px;
            }

            .scanner-asset-icon {
              width: 34px;
              height: 34px;
              border-radius: 9px;
            }

            .scanner-asset-name {
              font-size: 12px;
            }

            .scanner-asset-issuer {
              font-size: 9px;
            }

            .scanner-asset-balance {
              grid-column: 2;
              text-align: left;
              font-size: 12px;
              margin-top: -2px;
            }

            .scanner-finding {
              grid-template-columns: 34px minmax(0, 1fr);
              gap: 9px;
              padding: 11px;
              border-radius: 11px;
            }

            .scanner-finding-icon {
              width: 34px;
              height: 34px;
              border-radius: 9px;
            }

            .scanner-finding-title {
              font-size: 12px;
              line-height: 1.4;
            }

            .scanner-finding-description {
              margin-top: 4px;
              font-size: 11px;
              line-height: 1.55;
            }

            .scanner-finding-recommendation {
              margin-top: 7px;
              font-size: 10px;
            }

            .scanner-contract {
              grid-template-columns: 1fr;
              gap: 9px;
            }

            .scanner-contract-item {
              padding: 12px;
              border-radius: 11px;
            }

            .scanner-contract-label {
              font-size: 9px;
            }

            .scanner-contract-value {
              font-size: 12px;
            }

            .scanner-functions {
              gap: 5px;
            }

            .scanner-function {
              padding: 5px 7px;
              font-size: 9px;
            }

            .scanner-funding-grid,
            .scanner-funding-inline-grid {
              grid-template-columns: 1fr;
              gap: 9px;
            }

            .scanner-funding-card {
              padding: 13px;
              border-radius: 11px;
            }

            .scanner-funding-description {
              min-height: auto;
              font-size: 10px;
            }

            .scanner-wallet-status {
              padding: 13px;
              gap: 10px;
              border-radius: 12px;
            }

            .scanner-wallet-status-icon {
              width: 34px;
              height: 34px;
              flex-basis: 34px;
              border-radius: 10px;
            }

            .scanner-wallet-status-label {
              font-size: 9px;
            }

            .scanner-wallet-status-title {
              font-size: 14px;
              line-height: 1.35;
            }

            .scanner-wallet-status-message {
              font-size: 11px;
              line-height: 1.5;
            }

            .scanner-funding-inline {
              padding: 13px;
              border-radius: 12px;
            }

            .scanner-funding-inline-heading h3 {
              font-size: 14px;
            }

            .scanner-funding-inline-heading p {
              font-size: 11px;
              line-height: 1.5;
            }

            .scanner-notifications {
              right: 12px;
              bottom: 12px;
              width: calc(100vw - 24px);
            }

            .scanner-notification {
              grid-template-columns: 34px minmax(0, 1fr) 24px;
              gap: 8px;
              padding: 11px;
              border-radius: 12px;
            }

            .scanner-notification-icon {
              width: 34px;
              height: 34px;
              border-radius: 9px;
            }
          }

          @media (max-width: 380px) {
            .scanner-page {
              padding-left: 10px;
              padding-right: 10px;
            }

            .scanner-search-card,
            .scanner-section,
            .scanner-funding,
            .scanner-result-header {
              padding: 13px;
            }

            .scanner-title {
              font-size: 27px;
            }

            .scanner-subtitle {
              font-size: 12px;
            }

            .scanner-grid,
            .scanner-counts {
              gap: 7px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .scanner-notification {
              animation: none;
            }

            .scanner-spinner {
              animation: none;
            }

            .scanner-button {
              transition: none;
            }
          }
        `}
      </style>

      {/* =====================================================
          NOTIFICATIONS
      ===================================================== */}

      <NotificationStack
        notifications={notifications}
        onClose={removeNotification}
      />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="scanner-hero">
        <div className="scanner-eyebrow">
          <ShieldCheck size={14} />
          Stellar Security Intelligence
        </div>

        <h1 className="scanner-title">Scan a Stellar wallet</h1>

        <p className="scanner-subtitle">
          Analyze a Stellar Testnet wallet or Soroban contract for security
          signals, account configuration, assets and potential risks.
        </p>

        <div className="scanner-testnet-pill">
          <span className="scanner-testnet-dot" />
          Stellar Testnet
          <span>Read-only security analysis</span>
        </div>
      </section>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <section className="scanner-card scanner-search-card">
        <form onSubmit={handleScan}>
          <label className="scanner-form-label" htmlFor="stellar-address">
            Stellar address
          </label>

          <div className="scanner-input-row">
            <div className="scanner-input-wrap">
              <Search size={18} className="scanner-input-icon" />

              <input
                id="stellar-address"
                className="scanner-input"
                type="text"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Enter G... wallet or C... contract address"
                autoComplete="off"
                spellCheck="false"
              />

              {address && (
                <button
                  type="button"
                  className="scanner-input-clear"
                  onClick={() => {
                    setAddress("");
                    setResult(null);
                    setError("");
                    setFundingError("");
                  }}
                  aria-label="Clear address"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="scanner-button"
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 size={17} className="scanner-spinner" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap size={17} />
                  Scan Wallet
                </>
              )}
            </button>
          </div>

          <div className="scanner-hint">
            <span>
              G... addresses are Stellar accounts. C... addresses are Soroban
              contracts.
            </span>

            <span>Ctrl + Enter to scan</span>
          </div>
        </form>

        {error && <div className="scanner-error">{error}</div>}
      </section>

      {/* =====================================================
          RESULTS
      ===================================================== */}

      {result && (
        <div className="scanner-result">
          {/* =================================================
              RESULT HEADER
          ================================================= */}

          <section className="scanner-card scanner-result-header">
            <div className="scanner-address-block">
              <div className="scanner-result-kicker">Scan result</div>

              <div className="scanner-address">
                <span>{result.address || address}</span>

                <button
                  type="button"
                  className="scanner-copy"
                  onClick={copyAddress}
                  title="Copy address"
                >
                  {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                </button>
              </div>

              <div className="scanner-type-badge">
                {accountScan ? <Wallet size={13} /> : <FileSearch size={13} />}

                {accountScan ? "Stellar Account" : "Soroban Smart Contract"}

                <span> · {result.network || "Stellar Testnet"}</span>
              </div>
            </div>

            <div className={`scanner-score score-${riskTone}`}>
              <div className="scanner-score-number">
                {score}
                <span
                  style={{
                    fontSize: "15px",
                  }}
                >
                  /100
                </span>
              </div>

              <div className="scanner-score-label">{displayRisk}</div>
            </div>
          </section>

          {/* =================================================
              WALLET STATUS + TESTNET FUNDS
          ================================================= */}

          {accountScan && (
            <section
              id="testnet-funds"
              className="scanner-card scanner-section scanner-wallet-funding-panel"
            >
              <div
                className={`scanner-wallet-status ${result.autoFunded ? "new" : "existing"}`}
              >
                <div className="scanner-wallet-status-icon">
                  {result.autoFunded ? (
                    <Sparkles size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                </div>

                <div className="scanner-wallet-status-copy">
                  <div className="scanner-wallet-status-label">
                    {result.autoFunded
                      ? "NEW WALLET DETECTED"
                      : "EXISTING WALLET IDENTIFIED"}
                  </div>

                  <h2 className="scanner-wallet-status-title">
                    {result.autoFunded
                      ? "Congratulations! This is a new Stellar Testnet wallet."
                      : "This Stellar Testnet wallet already exists."}
                  </h2>

                  <p className="scanner-wallet-status-message">
                    {result.autoFunded
                      ? `Your wallet was automatically funded with ${formatNumber(result.fundedAmountXlm || 0)} XLM so you can start testing on Stellar.`
                      : "No automatic funding was performed. You can request supported Testnet assets for this wallet."}
                  </p>

                  <button
                    type="button"
                    className="scanner-wallet-funds-button"
                    onClick={scrollToFunding}
                  >
                    Get Testnet Funds <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="scanner-funding-inline">
                <div className="scanner-funding-inline-heading">
                  <div>
                    <span className="scanner-funding-inline-eyebrow">
                      TESTNET FUNDS
                    </span>
                    <h3>Need Testnet funds?</h3>
                    <p>
                      Get supported Testnet funds directly for this scanned
                      wallet.
                    </p>
                  </div>
                </div>

                <div className="scanner-funding-inline-grid">
                  <FundingAssetCard
                    icon="XLM"
                    name="Testnet XLM"
                    status={
                      fundingCooldownSeconds > 0
                        ? `Available in ${formatCooldown(fundingCooldownSeconds)}`
                        : `${formatNumber(result.rawXlmBalance ?? 0)} XLM`
                    }
                    description={
                      fundingCooldownSeconds > 0
                        ? "This wallet has already received Testnet XLM. The next funding request becomes available after the 24-hour cooldown."
                        : "Request Testnet XLM from Stellar Friendbot."
                    }
                    buttonLabel={
                      fundingCooldownSeconds > 0
                        ? `Available in ${formatCooldown(fundingCooldownSeconds)}`
                        : "Get Testnet XLM"
                    }
                    onClick={handleXlmFunding}
                    loading={isFundingXlm}
                    disabled={fundingCooldownSeconds > 0}
                    primary
                  />

                  <FundingAssetCard
                    icon="USD"
                    name="Testnet USDC"
                    status={
                      usdc?.trustlinePresent
                        ? `${formatNumber(usdc?.balance ?? 0)} USDC`
                        : "Trustline required"
                    }
                    description={
                      usdc?.trustlinePresent
                        ? "USDC is enabled for this wallet. Open Circle's official Testnet faucet to request USDC."
                        : "USDC requires a trustline before the wallet can receive Testnet USDC."
                    }
                    buttonLabel={
                      usdc?.trustlinePresent
                        ? "Get Testnet USDC"
                        : "Set Up USDC"
                    }
                    onClick={
                      usdc?.trustlinePresent
                        ? openUsdcFaucet
                        : openUsdcTrustline
                    }
                    external
                  />
                </div>

                <div className="scanner-funding-inline-note">
                  {fundingCooldownSeconds > 0
                    ? `XLM funding is temporarily locked for this wallet. You can request it again in ${formatCooldown(fundingCooldownSeconds)}.`
                    : "XLM funding is limited to one request per wallet every 24 hours. USDC requires its trustline and uses Circle's faucet limits."}
                </div>

                {fundingError && (
                  <div className="scanner-error-note">{fundingError}</div>
                )}
              </div>
            </section>
          )}

          {/* =================================================
              STATS
          ================================================= */}

          <section className="scanner-grid">
            <StatCard
              icon={<Shield size={17} />}
              label="Security score"
              value={`${score}/100`}
            />

            <StatCard
              icon={<Wallet size={17} />}
              label={accountScan ? "XLM balance" : "Contract size"}
              value={
                accountScan
                  ? result.xlmBalance ||
                    `${formatNumber(result.rawXlmBalance)} XLM`
                  : `${formatNumber(result.wasmSize, 0)} bytes`
              }
            />

            <StatCard
              icon={<FileSearch size={17} />}
              label={accountScan ? "Assets" : "Functions"}
              value={
                accountScan
                  ? assets.length
                  : (result.functionCount ?? result.functions?.length ?? 0)
              }
            />

            <StatCard
              icon={<AlertTriangle size={17} />}
              label="Findings"
              value={findings.length}
            />
          </section>

          {/* =================================================
              ASSETS & TOKENS
          ================================================= */}

          {accountScan && (
            <section className="scanner-card scanner-section">
              <div className="scanner-section-header">
                <div>
                  <h2 className="scanner-section-title">
                    <Wallet size={17} />
                    Assets & Tokens
                  </h2>

                  <p className="scanner-section-subtitle">
                    Every asset currently returned by the Stellar Testnet
                    account.
                  </p>
                </div>

                <span className="scanner-type-badge">
                  {assets.length} asset
                  {assets.length === 1 ? "" : "s"}
                </span>
              </div>

              {assets.length > 0 ? (
                <div className="scanner-assets">
                  {assets.map((asset, index) => (
                    <AssetCard
                      key={`${asset.assetCode}-${asset.issuer || "native"}-${index}`}
                      asset={asset}
                    />
                  ))}
                </div>
              ) : (
                <div className="scanner-empty">
                  No assets were returned for this account.
                </div>
              )}
            </section>
          )}

          {/* =================================================
              SECURITY FINDINGS
          ================================================= */}

          <section className="scanner-card scanner-section">
            <div className="scanner-section-header">
              <div>
                <h2 className="scanner-section-title">
                  {score >= 85 ? (
                    <ShieldCheck size={17} />
                  ) : (
                    <ShieldAlert size={17} />
                  )}
                  Security findings
                </h2>

                <p className="scanner-section-subtitle">
                  Automated checks performed by Stellar Wallet Scanner.
                </p>
              </div>
            </div>

            {findings.length > 0 ? (
              <div className="scanner-findings">
                {findings.map((finding, index) => (
                  <FindingCard
                    key={finding.id || `${finding.title}-${index}`}
                    finding={finding}
                  />
                ))}
              </div>
            ) : (
              <div className="scanner-empty">
                No security findings were returned.
              </div>
            )}
          </section>

          {/* =================================================
              CONTRACT DETAILS
          ================================================= */}

          {contractScan && (
            <section className="scanner-card scanner-section">
              <div className="scanner-section-header">
                <div>
                  <h2 className="scanner-section-title">
                    <FileSearch size={17} />
                    Smart contract analysis
                  </h2>

                  <p className="scanner-section-subtitle">
                    Soroban contract metadata discovered on Stellar Testnet.
                  </p>
                </div>
              </div>

              <div className="scanner-contract">
                <ContractInfo
                  label="WASM validation"
                  value={
                    result.validWasm ? "Valid WebAssembly" : "Validation failed"
                  }
                />

                <ContractInfo
                  label="WASM size"
                  value={`${formatNumber(result.wasmSize, 0)} bytes`}
                />

                <ContractInfo
                  label="Exported functions"
                  value={result.functionCount ?? result.functions?.length ?? 0}
                />
              </div>

              {Array.isArray(result.functions) &&
                result.functions.length > 0 && (
                  <>
                    <div
                      className="scanner-result-kicker"
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      Exported functions
                    </div>

                    <div className="scanner-functions">
                      {result.functions.map((functionName, index) => (
                        <span
                          className="scanner-function"
                          key={`${functionName}-${index}`}
                        >
                          {functionName}
                        </span>
                      ))}
                    </div>
                  </>
                )}
            </section>
          )}

          {/* =================================================
              ADVANCED DETAILS
          ================================================= */}

          <section className="scanner-card scanner-section">
            <button
              type="button"
              className="scanner-advanced-button"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              <span>Scan details</span>

              {showAdvanced ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {showAdvanced && (
              <div className="scanner-advanced-content">
                <div className="scanner-counts">
                  <CountCard label="Critical" value={severityCounts.critical} />

                  <CountCard label="High" value={severityCounts.high} />

                  <CountCard label="Medium" value={severityCounts.medium} />

                  <CountCard label="Info" value={severityCounts.info} />
                </div>

                {result.message && (
                  <div className="scanner-funding-note">
                    <strong>Scanner message:</strong> {result.message}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {!result && !isScanning && (
        <section
          className="scanner-card scanner-section"
          style={{
            marginTop: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "13px",
            }}
          >
            <div className="scanner-stat-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2 className="scanner-section-title">Ready to scan</h2>

              <p className="scanner-section-subtitle">
                Enter a Stellar Testnet address above to inspect its security
                posture and assets.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, label, value }) {
  return (
    <div className="scanner-card scanner-stat">
      <div className="scanner-stat-top">
        <div className="scanner-stat-icon">{icon}</div>
      </div>

      <div className="scanner-stat-label">{label}</div>

      <div className="scanner-stat-value">{value}</div>
    </div>
  );
}

/* =========================================================
   ASSET CARD
========================================================= */

function AssetCard({ asset }) {
  const code = asset?.assetCode || "Unknown";

  const balance = Number(asset?.balance ?? 0);

  const isNative = asset?.assetType === "native" || code === "XLM";

  return (
    <div className="scanner-asset">
      <div className="scanner-asset-icon">
        {isNative ? "XLM" : code.slice(0, 4)}
      </div>

      <div>
        <div className="scanner-asset-name">{code}</div>

        {isNative ? (
          <div className="scanner-asset-issuer">Native Stellar asset</div>
        ) : (
          <div className="scanner-asset-issuer">
            Issuer:{" "}
            {asset?.issuer ? shortenAddress(asset.issuer, 8, 7) : "Unknown"}
          </div>
        )}
      </div>

      <div className="scanner-asset-balance">{formatNumber(balance)}</div>
    </div>
  );
}

/* =========================================================
   FINDING CARD
========================================================= */

function FindingCard({ finding }) {
  const tone = getSeverityTone(finding?.severity);

  const isCritical = tone === "critical";

  return (
    <div className="scanner-finding">
      <div className={`scanner-finding-icon finding-${tone}`}>
        {isCritical ? (
          <ShieldAlert size={17} />
        ) : tone === "warning" ? (
          <AlertTriangle size={17} />
        ) : (
          <ShieldCheck size={17} />
        )}
      </div>

      <div>
        <div className="scanner-finding-title">
          {finding?.title || "Security finding"}
        </div>

        <span className={`scanner-finding-badge finding-${tone}`}>
          {finding?.severity || "Info"}
        </span>

        <div className="scanner-finding-description">
          {finding?.description || "No description provided."}
        </div>

        {finding?.recommendation && (
          <div className="scanner-finding-recommendation">
            <strong>Recommendation:</strong> {finding.recommendation}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CONTRACT INFO
========================================================= */

function ContractInfo({ label, value }) {
  return (
    <div className="scanner-contract-item">
      <div className="scanner-contract-label">{label}</div>

      <div className="scanner-contract-value">{value}</div>
    </div>
  );
}

/* =========================================================
   FUNDING ASSET CARD
========================================================= */

function FundingAssetCard({
  icon,
  name,
  status,
  description,
  buttonLabel,
  onClick,
  loading = false,
  disabled = false,
  primary = false,
  external = false,
}) {
  return (
    <div className="scanner-funding-card">
      <div className="scanner-funding-card-top">
        <div className="scanner-funding-icon">{icon}</div>
        <span className="scanner-funding-status">{status}</span>
      </div>

      <div className="scanner-funding-name">{name}</div>

      <div className="scanner-funding-description">{description}</div>

      <button
        type="button"
        className={`scanner-funding-button ${primary ? "primary" : ""}`}
        onClick={onClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="scanner-spinner" />
            Processing...
          </>
        ) : (
          <>
            {buttonLabel}
            {external && <ExternalLink size={13} />}
          </>
        )}
      </button>
    </div>
  );
}

/* =========================================================
   COUNT CARD
========================================================= */

function CountCard({ label, value }) {
  return (
    <div className="scanner-count">
      <div className="scanner-count-number">{value}</div>

      <div className="scanner-count-label">{label}</div>
    </div>
  );
}

/* =========================================================
   NOTIFICATION STACK
========================================================= */

function NotificationStack({ notifications, onClose }) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return null;
  }

  return (
    <div className="scanner-notifications">
      {notifications.map((notification) => (
        <SecurityNotification
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

/* =========================================================
   SECURITY NOTIFICATION
========================================================= */

function SecurityNotification({ notification, onClose }) {
  const type = notification?.type || "info";

  return (
    <div className={`scanner-notification notification-${type}`}>
      <div className="scanner-notification-icon">
        {type === "success" ? (
          <CheckCircle2 size={18} />
        ) : type === "error" ? (
          <ShieldAlert size={18} />
        ) : (
          <Shield size={18} />
        )}
      </div>

      <div>
        <div className="scanner-notification-title">
          {notification?.title || "Scanner notification"}
        </div>

        <div className="scanner-notification-message">
          {notification?.message || ""}
        </div>

        {notification?.actionLabel && notification?.onAction && (
          <button
            type="button"
            className="scanner-notification-action"
            onClick={() => {
              notification.onAction();
              onClose(notification.id);
            }}
          >
            {notification.actionLabel}
            <ChevronDown
              size={13}
              className="scanner-notification-action-icon"
            />
          </button>
        )}
      </div>

      <button
        type="button"
        className="scanner-notification-close"
        onClick={() => onClose(notification.id)}
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
