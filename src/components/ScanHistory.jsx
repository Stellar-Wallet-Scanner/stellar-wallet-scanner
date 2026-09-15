import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCode2,
  History,
  ShieldCheck,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";

function ScanHistory({ history, onDelete, onClear }) {
  const getStatusColor = (status) => {
    if (status === "Healthy") {
      return "var(--accent)";
    }

    if (status === "At Risk") {
      return "#eab308";
    }

    if (status === "Critical Risk") {
      return "#ef4444";
    }

    return "var(--text-muted)";
  };

  const getStatusIcon = (status) => {
    if (status === "Healthy") {
      return <CheckCircle2 size={16} />;
    }

    if (status === "At Risk") {
      return <AlertTriangle size={16} />;
    }

    if (status === "Critical Risk") {
      return <XCircle size={16} />;
    }

    return <ShieldCheck size={16} />;
  };

  const formatDate = (date) => {
    if (!date) {
      return "Unknown date";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }

    return parsedDate.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shortenAddress = (address) => {
    if (!address) {
      return "Unknown address";
    }

    if (address.length <= 20) {
      return address;
    }

    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  return (
    <main
      className="min-h-screen w-full min-w-0 px-3 py-5 sm:px-4 sm:py-6 lg:px-3 lg:py-7"
      style={{
        background: "var(--background)",
      }}
    >
      <div className="w-full min-w-0">
        {/* PAGE HEADER */}

        <section className="mb-6 sm:mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 10px rgba(var(--accent-rgb), 0.35)",
              }}
            />

            <span
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{
                color: "var(--accent-dark)",
              }}
            >
              Stellar Scan
            </span>
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
                style={{
                  color: "var(--text)",
                }}
              >
                Scan History
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm font-medium leading-6 sm:mt-3 md:text-base"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                Review previous Stellar Testnet security analyses performed with
                Stellar Scan.
              </p>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "var(--surface)",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                }}
              >
                <Trash2 size={15} />
                Clear History
              </button>
            )}
          </div>
        </section>

        {/* HISTORY CONTENT */}

        <section
          className="rounded-3xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 12px 40px var(--shadow)",
          }}
        >
          {/* HISTORY HEADER */}

          <div
            className="flex flex-col gap-3 border-b p-4 sm:gap-4 sm:p-5 md:flex-row md:items-center md:justify-between md:p-6"
            style={{
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                <History size={19} />
              </div>

              <div>
                <h2
                  className="text-sm font-black"
                  style={{
                    color: "var(--text)",
                  }}
                >
                  Previous Scans
                </h2>

                <p
                  className="mt-0.5 text-[11px]"
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  {history.length} {history.length === 1 ? "scan" : "scans"}{" "}
                  recorded
                </p>
              </div>
            </div>

            <div
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2"
              style={{
                background: "var(--accent-soft)",
                borderColor: "rgba(var(--accent-rgb), 0.2)",
                color: "var(--accent)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 0 8px rgba(var(--accent-rgb), 0.55)",
                }}
              />

              <span className="text-[10px] font-bold">Stellar Testnet</span>
            </div>
          </div>

          {/* EMPTY STATE */}

          {history.length === 0 && (
            <div className="flex min-h-[430px] items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  <History size={30} />
                </div>

                <h3
                  className="text-xl font-extrabold"
                  style={{
                    color: "var(--text)",
                  }}
                >
                  No scans yet
                </h3>

                <p
                  className="mt-3 text-sm leading-6"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  Your completed wallet and smart contract analyses will appear
                  here automatically.
                </p>
              </div>
            </div>
          )}

          {/* HISTORY LIST */}

          {history.length > 0 && (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {history.map((scan) => {
                const statusColor = getStatusColor(scan.securityStatus);

                const isAccount = scan.addressType === "account";

                const findingsCount = Array.isArray(scan.findings)
                  ? scan.findings.filter(
                      (finding) => finding?.severity?.toLowerCase() !== "info",
                    ).length
                  : 0;

                return (
                  <div
                    key={scan.id}
                    className="group min-w-0 p-4 transition-colors duration-200 hover:bg-[var(--surface-hover)] sm:p-5 md:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                      {/* ADDRESS */}

                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                          }}
                        >
                          {isAccount ? (
                            <WalletCards size={18} />
                          ) : (
                            <FileCode2 size={18} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className="text-sm font-bold"
                              style={{
                                color: "var(--text)",
                              }}
                            >
                              {isAccount
                                ? "Stellar Account"
                                : "Soroban Smart Contract"}
                            </h3>

                            <span
                              className="rounded-md border px-2 py-1 text-[9px] font-bold uppercase"
                              style={{
                                background: "var(--accent-soft)",
                                borderColor: "rgba(var(--accent-rgb), 0.2)",
                                color: "var(--accent)",
                              }}
                            >
                              Testnet
                            </span>
                          </div>

                          <p
                            className="mt-2 truncate font-mono text-xs"
                            style={{
                              color: "var(--text-secondary)",
                            }}
                            title={scan.address}
                          >
                            {shortenAddress(scan.address)}
                          </p>

                          <div
                            className="mt-2 flex items-center gap-1.5 text-[10px]"
                            style={{
                              color: "var(--text-muted)",
                            }}
                          >
                            <Clock3 size={12} />

                            <span>{formatDate(scan.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      {/* SCORE */}

                      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:flex xl:items-center">
                        <div
                          className="min-w-0 rounded-xl border p-3"
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                          }}
                        >
                          <p
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{
                              color: "var(--text-muted)",
                            }}
                          >
                            Score
                          </p>

                          <p
                            className="mt-1 text-base font-black"
                            style={{
                              color:
                                scan.securityScore != null
                                  ? statusColor
                                  : "var(--text-muted)",
                            }}
                          >
                            {scan.securityScore != null
                              ? `${scan.securityScore}/100`
                              : "N/A"}
                          </p>
                        </div>

                        {/* FINDINGS */}

                        <div
                          className="min-w-0 rounded-xl border p-3"
                          style={{
                            background: "var(--input)",
                            borderColor: "var(--border)",
                          }}
                        >
                          <p
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{
                              color: "var(--text-muted)",
                            }}
                          >
                            Findings
                          </p>

                          <p
                            className="mt-1 text-base font-black"
                            style={{
                              color:
                                findingsCount > 0 ? "#eab308" : "var(--text)",
                            }}
                          >
                            {findingsCount}
                          </p>
                        </div>

                        {/* STATUS */}

                        <div
                          className="col-span-2 flex min-w-0 items-center gap-2 rounded-xl border p-3 sm:col-span-1 sm:min-w-[125px]"
                          style={{
                            background: `${statusColor}08`,
                            borderColor: `${statusColor}25`,
                            color: statusColor,
                          }}
                        >
                          {getStatusIcon(scan.securityStatus)}

                          <span className="text-xs font-bold">
                            {scan.securityStatus || "Analysis unavailable"}
                          </span>
                        </div>

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={() => onDelete(scan.id)}
                          aria-label="Delete scan"
                          className="flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500/10"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--input)",
                            color: "var(--text-muted)",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ScanHistory;
