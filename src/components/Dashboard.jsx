import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FileSearch,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

import Scanner from "./Scanner";
import { useState } from "react";

function Dashboard({ history = [], onScanComplete, onNavigate }) {
  const [selectedDays, setSelectedDays] = useState(7);

  const totalScans = history.length;
  const accountScans = history.filter(
    (scan) => scan.addressType === "account",
  ).length;
  const contractScans = history.filter(
    (scan) => scan.addressType === "contract",
  ).length;

  const safeScans = history.filter(
    (scan) => scan.securityStatus === "Healthy",
  ).length;

  const securityFindings = history.reduce(
    (total, scan) =>
      total +
      (scan.findings?.filter((finding) => finding.severity !== "info").length ||
        0),
    0,
  );

  const stats = [
    {
      title: "Addresses Scanned",
      value: totalScans,
      description:
        totalScans === 0
          ? "No addresses analyzed yet"
          : `${contractScans} contract${contractScans === 1 ? "" : "s"} · ${accountScans} wallet${accountScans === 1 ? "" : "s"}`,
      icon: FileSearch,
    },
    {
      title: "Healthy Scans",
      value: safeScans,
      description:
        safeScans === 0
          ? "No healthy scans yet"
          : `${safeScans} healthy ${safeScans === 1 ? "scan" : "scans"}`,
      icon: ShieldCheck,
    },
    {
      title: "Security Findings",
      value: securityFindings,
      description:
        securityFindings === 0
          ? "No security findings yet"
          : `${securityFindings} finding${
              securityFindings === 1 ? "" : "s"
            } detected`,
      icon: ShieldAlert,
    },
  ];

  const getLastDays = (daysCount = 7) => {
    const days = [];

    for (let index = daysCount - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);

      days.push({
        date,
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
      });
    }

    return days;
  };

  const selectedRange = getLastDays(selectedDays);

  const getScansForDay = (date) => {
    return history.filter((scan) => {
      if (!scan.timestamp) return false;

      const scanDate = new Date(scan.timestamp);

      return (
        scanDate.getFullYear() === date.getFullYear() &&
        scanDate.getMonth() === date.getMonth() &&
        scanDate.getDate() === date.getDate()
      );
    });
  };

  const activityData = selectedRange.map((day) => ({
    ...day,
    scans: getScansForDay(day.date).length,
  }));

  const scoreData = selectedRange.map((day) => {
    const scans = getScansForDay(day.date);

    if (scans.length === 0) {
      return {
        ...day,
        score: null,
      };
    }

    const totalScore = scans.reduce(
      (total, scan) => total + Number(scan.securityScore || 0),
      0,
    );

    return {
      ...day,
      score: Math.round(totalScore / scans.length),
    };
  });

  const maxActivity = Math.max(1, ...activityData.map((item) => item.scans));

  const recentActivity = history.slice(0, 5);

  const recentFindings = history
    .flatMap((scan) => {
      const findings = Array.isArray(scan.findings)
        ? scan.findings.filter((finding) => finding?.severity !== "info")
        : [];

      return findings.map((finding, index) => ({
        ...finding,
        scanId: scan.id,
        address: scan.address || scan.contractAddress,
        timestamp: scan.timestamp,
        uniqueId: `${scan.id}-finding-${finding.id || index}`,
      }));
    })
    .slice(0, 5);

  const formatAddress = (address) => {
    if (!address) return "Unknown address";

    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Unknown time";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    if (status === "Healthy") {
      return "var(--accent)";
    }

    if (status === "At Risk") {
      return "#d99b18";
    }

    if (status === "Critical Risk") {
      return "#ef4444";
    }

    return "var(--text-muted)";
  };

  const buildScorePoints = () => {
    const chartWidth = 760;
    const chartHeight = 220;
    const paddingX = 32;
    const paddingY = 24;

    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingY * 2;

    return scoreData
      .map((item, index) => {
        if (item.score === null) return null;

        const x =
          paddingX + (index / Math.max(scoreData.length - 1, 1)) * usableWidth;

        const y = paddingY + ((100 - item.score) / 100) * usableHeight;

        return {
          x,
          y,
          score: item.score,
        };
      })
      .filter(Boolean);
  };

  const scorePoints = buildScorePoints();

  const scorePath =
    scorePoints.length > 0
      ? scorePoints
          .map((point, index) =>
            index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

  const handleStartScan = () => {
    document
      .getElementById("dashboard-scanner")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main
      className="min-h-screen w-full min-w-0 px-2 py-4 sm:px-3 sm:py-5 lg:px-4 lg:py-6"
      style={{
        background: "var(--background)",
      }}
    >
      <div className="w-full min-w-0">
        {/* PAGE INTRO */}

        <section className="mb-6 sm:mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 10px rgba(var(--accent-rgb), 0.45)",
              }}
            />

            <span
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{
                color: "var(--accent-dark)",
              }}
            >
              Security Overview
            </span>
          </div>

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl"
                style={{
                  color: "var(--text)",
                }}
              >
                Wallet Security Dashboard
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm font-medium leading-6 sm:mt-3 md:text-base"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                Review Stellar Testnet wallet security, scan results, assets,
                and potential risks from one place.
              </p>
            </div>

            <div
              className="flex w-fit items-center gap-2 rounded-xl border px-4 py-2.5"
              style={{
                background: "var(--accent-soft)",
                borderColor: "var(--border)",
              }}
            >
              <Zap
                size={15}
                style={{
                  color: "var(--accent-dark)",
                }}
              />

              <span
                className="text-xs font-bold"
                style={{
                  color: "var(--accent-dark)",
                }}
              >
                Stellar Testnet · Read-only analysis
              </span>
            </div>
          </div>
        </section>

        {/* WALLET & CONTRACT SCANNER */}
        <section id="dashboard-scanner" className="scroll-mt-24 mb-5 sm:mb-6">
          <Scanner onScanComplete={onScanComplete} />
        </section>

        {/* STATS */}

        <section className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  boxShadow: "0 8px 30px var(--shadow)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className="text-xs font-bold"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      {stat.title}
                    </p>

                    <p
                      className="mt-2 text-3xl font-extrabold"
                      style={{
                        color: "var(--text)",
                      }}
                    >
                      {stat.value}
                    </p>

                    <p
                      className="mt-2 text-xs font-medium"
                      style={{
                        color: "var(--text-secondary)",
                      }}
                    >
                      {stat.description}
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-dark)",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ANALYTICS */}

        <section className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-5 xl:grid-cols-2">
          {/* SECURITY SCORE TREND */}

          <div
            className="rounded-2xl border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 30px var(--shadow)",
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  className="font-bold"
                  style={{
                    color: "var(--text)",
                  }}
                >
                  Security Score Trend
                </h2>

                <p
                  className="mt-1 text-xs font-medium"
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  Recent analysis scores
                </p>
              </div>

              <select
                value={selectedDays}
                onChange={(event) =>
                  setSelectedDays(Number(event.target.value))
                }
                className="rounded-lg border px-3 py-2 text-xs font-bold outline-none"
                style={{
                  background: "var(--input)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>

            <div className="relative h-[250px] w-full">
              <svg
                viewBox="0 0 760 220"
                className="h-full w-full overflow-visible"
                preserveAspectRatio="none"
              >
                <line
                  x1="32"
                  y1="24"
                  x2="728"
                  y2="24"
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                <line
                  x1="32"
                  y1="110"
                  x2="728"
                  y2="110"
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                <line
                  x1="32"
                  y1="196"
                  x2="728"
                  y2="196"
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                <text x="4" y="28" fill="var(--text-muted)" fontSize="10">
                  100
                </text>

                <text x="10" y="114" fill="var(--text-muted)" fontSize="10">
                  50
                </text>

                <text x="16" y="200" fill="var(--text-muted)" fontSize="10">
                  0
                </text>

                {scorePath && (
                  <path
                    d={scorePath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {scorePoints.map((point, index) => (
                  <g key={`${point.x}-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="6"
                      fill="var(--surface)"
                      stroke="var(--accent)"
                      strokeWidth="3"
                    />

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="2.5"
                      fill="var(--accent)"
                    />
                  </g>
                ))}

                {scoreData.map((item, index) => {
                  const x =
                    32 + (index / Math.max(scoreData.length - 1, 1)) * 696;

                  return (
                    <text
                      key={item.label}
                      x={x}
                      y="218"
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="10"
                    >
                      {item.label}
                    </text>
                  );
                })}
              </svg>

              {scorePoints.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pb-8">
                  <div className="text-center">
                    <ShieldCheck
                      size={26}
                      className="mx-auto mb-2"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    />

                    <p
                      className="text-xs font-semibold"
                      style={{
                        color: "var(--text-secondary)",
                      }}
                    >
                      No score data yet
                    </p>

                    <button
                      type="button"
                      onClick={handleStartScan}
                      className="mt-2 text-xs font-bold transition-transform duration-200 hover:translate-x-1"
                      style={{
                        color: "var(--accent-dark)",
                      }}
                    >
                      Run your first scan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SCAN ACTIVITY */}

          <div
            className="rounded-2xl border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 30px var(--shadow)",
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  className="font-bold"
                  style={{
                    color: "var(--text)",
                  }}
                >
                  Scan Activity
                </h2>

                <p
                  className="mt-1 text-xs font-medium"
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  Number of scans performed
                </p>
              </div>

              <select
                value={selectedDays}
                onChange={(event) =>
                  setSelectedDays(Number(event.target.value))
                }
                className="rounded-lg border px-3 py-2 text-xs font-bold outline-none"
                style={{
                  background: "var(--input)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>

            <div className="flex h-[250px] items-end gap-3">
              {activityData.map((item) => {
                const height =
                  item.scans === 0
                    ? 6
                    : Math.max(12, (item.scans / maxActivity) * 175);

                return (
                  <div
                    key={item.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div className="flex h-[190px] w-full items-end justify-center">
                      <div
                        className="w-full max-w-[42px] rounded-t-lg transition-all duration-300 hover:opacity-80"
                        style={{
                          height: `${height}px`,
                          background:
                            item.scans > 0 ? "var(--accent)" : "var(--border)",
                        }}
                        title={`${item.scans} scan${
                          item.scans === 1 ? "" : "s"
                        }`}
                      />
                    </div>

                    <span
                      className="text-[10px] font-semibold"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section
          className="mt-5 rounded-2xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 30px var(--shadow)",
          }}
        >
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2
                className="font-bold"
                style={{
                  color: "var(--text)",
                }}
              >
                Recent Activity
              </h2>

              <p
                className="mt-1 text-xs font-medium"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                Latest security analysis activity
              </p>
            </div>

            <Clock3
              size={18}
              style={{
                color: "var(--text-muted)",
              }}
            />
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-dark)",
                }}
              >
                <Activity size={22} />
              </div>

              <p
                className="mt-4 text-sm font-bold"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                No recent activity
              </p>

              <p
                className="mt-1 max-w-md text-xs font-medium"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                Run a Stellar Testnet scan and your completed analysis will
                appear here.
              </p>

              <button
                type="button"
                onClick={handleStartScan}
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold transition-transform duration-200 hover:translate-x-1"
                style={{
                  color: "var(--accent-dark)",
                }}
              >
                Start a scan
                <ArrowUpRight size={13} />
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentActivity.map((scan) => {
                const statusColor = getStatusColor(scan.securityStatus);

                return (
                  <div
                    key={scan.id}
                    className="flex flex-col gap-4 px-6 py-4 transition-colors duration-200 hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-dark)",
                        }}
                      >
                        <FileSearch size={18} />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-bold"
                          style={{
                            color: "var(--text)",
                          }}
                        >
                          {formatAddress(scan.address)}
                        </p>

                        <p
                          className="mt-1 text-[11px] font-medium"
                          style={{
                            color: "var(--text-muted)",
                          }}
                        >
                          {scan.addressType === "contract"
                            ? "Smart contract"
                            : "Classic account"}{" "}
                          · {formatTime(scan.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className="text-sm font-extrabold"
                          style={{
                            color: "var(--text)",
                          }}
                        >
                          {scan.securityScore ?? "—"}
                        </p>

                        <p
                          className="text-[10px] font-semibold"
                          style={{
                            color: "var(--text-muted)",
                          }}
                        >
                          Security score
                        </p>
                      </div>

                      <span
                        className="rounded-full border px-3 py-1.5 text-[10px] font-bold"
                        style={{
                          color: statusColor,
                          borderColor: "var(--border)",
                          background:
                            scan.securityStatus === "Healthy"
                              ? "var(--accent-soft)"
                              : "var(--input)",
                        }}
                      >
                        {scan.securityStatus || "Analysis unavailable"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recentActivity.length > 0 && (
            <div
              className="border-t px-6 py-4"
              style={{
                borderColor: "var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => onNavigate?.("history")}
                className="inline-flex items-center gap-1 text-xs font-bold transition-all duration-200 hover:translate-x-1"
                style={{
                  color: "var(--accent-dark)",
                }}
              >
                View scan history
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>

        {/* SECURITY FINDINGS */}

        <section
          className="mt-5 rounded-2xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 30px var(--shadow)",
          }}
        >
          <div
            className="flex flex-col gap-3 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <h2 className="font-bold" style={{ color: "var(--text)" }}>
                Security Findings
              </h2>
              <p
                className="mt-1 text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Actual issues identified during your recent scans
              </p>
            </div>

            <span
              className="w-fit rounded-full border px-3 py-1.5 text-[10px] font-bold"
              style={{
                background:
                  recentFindings.length > 0
                    ? "rgba(234, 179, 8, 0.08)"
                    : "var(--accent-soft)",
                borderColor: "var(--border)",
                color: recentFindings.length > 0 ? "#eab308" : "var(--accent)",
              }}
            >
              {securityFindings}{" "}
              {securityFindings === 1 ? "finding" : "findings"}
            </span>
          </div>

          {recentFindings.length === 0 ? (
            <div className="flex items-center gap-3 px-6 py-7">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <p
                  className="text-xs font-bold"
                  style={{ color: "var(--text)" }}
                >
                  No security findings detected
                </p>
                <p
                  className="mt-1 text-[11px] leading-5"
                  style={{ color: "var(--text-muted)" }}
                >
                  No non-informational issues have been recorded across your
                  scans.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentFindings.map((finding) => {
                const severity = String(
                  finding.severity || "medium",
                ).toLowerCase();
                const severityColor =
                  severity === "critical"
                    ? "#ef4444"
                    : severity === "high"
                      ? "#f97316"
                      : severity === "medium"
                        ? "#eab308"
                        : "var(--accent)";

                return (
                  <div key={finding.uniqueId} className="px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider"
                            style={{
                              color: severityColor,
                              background: `${severityColor}10`,
                              borderColor: `${severityColor}30`,
                            }}
                          >
                            {severity}
                          </span>
                          <h3
                            className="text-sm font-extrabold"
                            style={{ color: "var(--text)" }}
                          >
                            {finding.title || "Security finding detected"}
                          </h3>
                        </div>

                        <p
                          className="mt-2 text-xs leading-5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {finding.description ||
                            "A potential security issue was identified during analysis."}
                        </p>

                        {finding.recommendation && (
                          <div
                            className="mt-3 rounded-xl border p-3"
                            style={{
                              background: "var(--input)",
                              borderColor: "var(--border)",
                            }}
                          >
                            <p
                              className="text-[10px] font-black uppercase tracking-wider"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Recommendation
                            </p>
                            <p
                              className="mt-1 text-[11px] leading-5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {finding.recommendation}
                            </p>
                          </div>
                        )}

                        <p
                          className="mt-3 truncate font-mono text-[9px]"
                          style={{ color: "var(--text-muted)" }}
                          title={finding.address}
                        >
                          {formatAddress(finding.address)} ·{" "}
                          {formatTime(finding.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {securityFindings > recentFindings.length && (
            <div
              className="border-t px-6 py-4"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={() => onNavigate?.("history")}
                className="inline-flex items-center gap-1 text-xs font-bold transition-transform duration-200 hover:translate-x-1"
                style={{ color: "var(--accent-dark)" }}
              >
                View all findings in scan history
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
