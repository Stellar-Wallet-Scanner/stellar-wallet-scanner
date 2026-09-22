import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCode2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { getScannerRegistryInfo } from "../services/stellar";

const CONTRACT_ADDRESS =
  "CAK5BORDDC4G3XDU4RBXDJU2PUSHOY4DQMX53ILJKGI2ORP2P5B332VL";

function shortenAddress(value, start = 10, end = 8) {
  if (!value) return "—";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </p>
          <p
            className="mt-1 truncate text-sm font-extrabold"
            style={{ color: "var(--text)" }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScannerRegistry() {
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getScannerRegistryInfo();
        if (active) setRegistry(data);
      } catch (err) {
        if (active)
          setError(err?.message || "Unable to read the Scanner Registry.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const contract = registry?.contractAddress || CONTRACT_ADDRESS;

  const copyContract = async () => {
    try {
      await navigator.clipboard.writeText(contract);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen w-full px-3 py-5 sm:px-4 sm:py-7 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1180px]">
        <section className="mb-7 sm:mb-9">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 12px rgba(var(--accent-rgb), .45)",
              }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--accent-dark)" }}
            >
              Blockchain Infrastructure
            </span>
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1
                className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
                style={{ color: "var(--text)" }}
              >
                Scanner Registry
              </h1>
              <p
                className="mt-2 max-w-2xl text-sm font-medium leading-6 sm:text-base"
                style={{ color: "var(--text-secondary)" }}
              >
                The on-chain Soroban registry that identifies this scanner
                deployment and stores its scanner activity count.
              </p>
            </div>

            <div
              className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"
              style={{
                background: "var(--accent-soft)",
                borderColor: "rgba(var(--accent-rgb), .2)",
                color: "var(--accent-dark)",
              }}
            >
              <CheckCircle2 size={15} />
              Stellar Testnet
            </div>
          </div>
        </section>

        <section
          className="rounded-3xl border p-4 shadow-[0_16px_50px_var(--shadow)] sm:p-6 lg:p-7"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <Loader2
                className="animate-spin"
                size={28}
                style={{ color: "var(--accent)" }}
              />
              <p
                className="mt-4 text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                Reading registry
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Fetching contract state from Stellar Testnet...
              </p>
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "rgba(239,68,68,.06)",
                borderColor: "rgba(239,68,68,.18)",
              }}
            >
              <p className="text-sm font-bold text-red-500">
                Registry unavailable
              </p>
              <p
                className="mt-1 text-xs leading-5"
                style={{ color: "var(--text-secondary)" }}
              >
                {error}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Status" value="Deployed" icon={CheckCircle2} />
                <InfoCard
                  label="Version"
                  value={registry?.version || "1.0.0"}
                  icon={FileCode2}
                />
                <InfoCard
                  label="Scan Count"
                  value={Number(registry?.scanCount ?? 0).toLocaleString()}
                  icon={ShieldCheck}
                />
                <InfoCard
                  label="Network"
                  value="Stellar Testnet"
                  icon={CheckCircle2}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div
                  className="rounded-2xl border p-4 sm:p-5"
                  style={{
                    background: "var(--surface-elevated)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Contract Address
                  </p>
                  <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
                    <code
                      className="min-w-0 truncate text-xs font-bold sm:text-sm"
                      style={{ color: "var(--text)" }}
                    >
                      {contract}
                    </code>
                    <button
                      type="button"
                      onClick={copyContract}
                      className="flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Copy size={14} />
                      <span className="hidden sm:inline">
                        {copied ? "Copied" : "Copy"}
                      </span>
                    </button>
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4 sm:p-5"
                  style={{
                    background: "var(--surface-elevated)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Admin
                  </p>
                  <p
                    className="mt-3 truncate font-mono text-xs font-bold sm:text-sm"
                    style={{ color: "var(--text)" }}
                    title={registry?.admin}
                  >
                    {shortenAddress(registry?.admin)}
                  </p>
                </div>
              </div>

              <div
                className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:flex-wrap"
                style={{ borderColor: "var(--border)" }}
              >
                <a
                  href={`https://lab.stellar.org/r/testnet/contract/${contract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold"
                  style={{
                    background: "var(--accent)",
                    color: "var(--button-text)",
                  }}
                >
                  View on Stellar Lab <ExternalLink size={15} />
                </a>
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${contract}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold"
                  style={{
                    background: "var(--surface-elevated)",
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  View on Stellar Expert <ExternalLink size={15} />
                </a>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
