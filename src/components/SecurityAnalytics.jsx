import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCode2,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

function SecurityAnalytics({ history }) {
  const scans = Array.isArray(history) ? history : [];

  const totalScans = scans.length;
  const healthyCount = scans.filter(
    (scan) => scan.securityStatus === "Healthy",
  ).length;
  const atRiskCount = scans.filter(
    (scan) => scan.securityStatus === "At Risk",
  ).length;
  const criticalCount = scans.filter(
    (scan) => scan.securityStatus === "Critical Risk",
  ).length;
  const accountScans = scans.filter(
    (scan) => scan.addressType === "account",
  ).length;
  const contractScans = scans.filter(
    (scan) => scan.addressType === "contract",
  ).length;

  const findingsCount = scans.reduce((total, scan) => {
    if (!Array.isArray(scan.findings)) return total;
    return (
      total +
      scan.findings.filter(
        (finding) => finding?.severity?.toLowerCase() !== "info",
      ).length
    );
  }, 0);

  const averageScore =
    scans.length > 0
      ? Math.round(
          scans.reduce(
            (total, scan) =>
              total +
              (typeof scan.securityScore === "number" ? scan.securityScore : 0),
            0,
          ) / scans.length,
        )
      : 0;

  const getLastSevenDays = () => {
    const days = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      days.push(date);
    }
    return days;
  };

  const days = getLastSevenDays();

  const activityData = days.map((date) => {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const dayScans = scans.filter((scan) => {
      if (!scan.timestamp) return false;
      const scanDate = new Date(scan.timestamp);
      return scanDate >= start && scanDate < end;
    });

    return {
      date,
      count: dayScans.length,
      label: date.toLocaleDateString([], { weekday: "short" }),
    };
  });

  const scoreData = days.map((date) => {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const dayScans = scans.filter((scan) => {
      if (!scan.timestamp || typeof scan.securityScore !== "number") {
        return false;
      }
      const scanDate = new Date(scan.timestamp);
      return scanDate >= start && scanDate < end;
    });

    const score =
      dayScans.length > 0
        ? Math.round(
            dayScans.reduce((sum, scan) => sum + scan.securityScore, 0) /
              dayScans.length,
          )
        : null;

    return {
      date,
      score,
      label: date.toLocaleDateString([], { weekday: "short" }),
    };
  });

  const latestScan = scans[0];
  const latestScore =
    typeof latestScan?.securityScore === "number"
      ? latestScan.securityScore
      : averageScore;

  const previousScoredScan = scans.find(
    (scan, index) => index > 0 && typeof scan.securityScore === "number",
  );

  const scoreDelta =
    latestScan && previousScoredScan
      ? latestScore - previousScoredScan.securityScore
      : null;

  const maximumActivity = Math.max(
    ...activityData.map((item) => item.count),
    1,
  );

  const severityCounts = ["critical", "high", "medium", "low"].map(
    (severity) => ({
      severity,
      count: scans.reduce((total, scan) => {
        if (!Array.isArray(scan.findings)) return total;
        return (
          total +
          scan.findings.filter(
            (finding) => finding?.severity?.toLowerCase() === severity,
          ).length
        );
      }, 0),
    }),
  );

  const maxSeverity = Math.max(...severityCounts.map((item) => item.count), 1);

  const totalPosture = healthyCount + atRiskCount + criticalCount;
  const healthyPercent = totalPosture
    ? Math.round((healthyCount / totalPosture) * 100)
    : 0;
  const atRiskPercent = totalPosture
    ? Math.round((atRiskCount / totalPosture) * 100)
    : 0;
  const criticalPercent = totalPosture
    ? Math.round((criticalCount / totalPosture) * 100)
    : 0;

  const getStatusColor = (status) => {
    if (status === "Healthy") return "var(--accent)";
    if (status === "At Risk") return "#eab308";
    if (status === "Critical Risk") return "#ef4444";
    return "var(--text-muted)";
  };

  const getStatusIcon = (status) => {
    if (status === "Healthy") return <CheckCircle2 size={15} />;
    if (status === "At Risk") return <AlertTriangle size={15} />;
    if (status === "Critical Risk") return <XCircle size={15} />;
    return <ShieldCheck size={15} />;
  };

  const shortenAddress = (address) => {
    if (!address) return "Unknown address";
    if (address.length <= 22) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const chartWidth = 900;
  const chartHeight = 320;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 42;
  const usableWidth = chartWidth - padLeft - padRight;
  const usableHeight = chartHeight - padTop - padBottom;

  const scorePoints = scoreData
    .map((item, index) => {
      if (item.score === null) return null;
      const x =
        padLeft + (index / Math.max(scoreData.length - 1, 1)) * usableWidth;
      const y = padTop + ((100 - item.score) / 100) * usableHeight;
      return { x, y, score: item.score, label: item.label };
    })
    .filter(Boolean);

  const scoreLinePath =
    scorePoints.length > 1
      ? scorePoints
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

  const scoreAreaPath =
    scorePoints.length > 1
      ? `${scoreLinePath} L ${scorePoints[scorePoints.length - 1].x} ${
          padTop + usableHeight
        } L ${scorePoints[0].x} ${padTop + usableHeight} Z`
      : "";

  const postureRadius = 74;
  const postureCircumference = 2 * Math.PI * postureRadius;
  const healthyLength = (healthyPercent / 100) * postureCircumference;
  const atRiskLength = (atRiskPercent / 100) * postureCircumference;
  const criticalLength = (criticalPercent / 100) * postureCircumference;

  return (
    <main
      className="min-h-screen px-4 py-5 md:px-7 md:py-7 xl:px-9"
      style={{ background: "var(--background)" }}
    >
      <style>{`
        .dashboard-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow: 0 12px 40px var(--shadow);
        }

        .panel-icon {
          display: flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--accent-soft);
          color: var(--accent);
        }
      `}</style>
      <div className="mx-auto max-w-[1600px]">
        <section className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 12px rgba(var(--accent-rgb), .55)",
                  }}
                />
                <span
                  className="text-[10px] font-black uppercase tracking-[.24em]"
                  style={{ color: "var(--accent-dark)" }}
                >
                  Security Intelligence
                </span>
              </div>

              <h1
                className="text-3xl font-black tracking-[-0.04em] md:text-4xl"
                style={{ color: "var(--text)" }}
              >
                Security Analytics
              </h1>
              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                A live view of wallet and Soroban contract security analysis
                across your Stellar Testnet scans.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label="Stellar Testnet" />
              <StatusPill label="Read-only analysis" muted />
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total scans"
            value={totalScans}
            description="Completed security analyses"
            icon={BarChart3}
            accent
          />
          <MetricCard
            label="Average score"
            value={scans.length ? `${averageScore}/100` : "N/A"}
            description="Across recorded scans"
            icon={Gauge}
          />
          <MetricCard
            label="Healthy"
            value={healthyCount}
            description="No major risk detected"
            icon={ShieldCheck}
          />
          <MetricCard
            label="Findings"
            value={findingsCount}
            description="Non-info security findings"
            icon={ShieldAlert}
            danger={findingsCount > 0}
          />
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-2">
          <div className="dashboard-panel overflow-hidden">
            <div
              className="flex flex-col gap-4 border-b p-5 md:p-6 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="panel-icon">
                    <Activity size={17} />
                  </div>
                  <h2
                    className="text-base font-black md:text-lg"
                    style={{ color: "var(--text)" }}
                  >
                    Security Score Trend
                  </h2>
                </div>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Average security score by day · Last 7 days
                </p>
              </div>

              <div className="flex items-center gap-4">
                {scoreDelta !== null && (
                  <div className="text-right">
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Change
                    </p>
                    <p
                      className="text-sm font-black"
                      style={{
                        color: scoreDelta >= 0 ? "var(--accent)" : "#ef4444",
                      }}
                    >
                      {scoreDelta >= 0 ? "+" : ""}
                      {scoreDelta} pts
                    </p>
                  </div>
                )}
                <div
                  className="rounded-xl border px-3 py-2"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Latest
                  </p>
                  <p
                    className="text-base font-black"
                    style={{
                      color: getStatusColor(latestScan?.securityStatus),
                    }}
                  >
                    {scans.length ? `${latestScore}/100` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-3 pb-4 pt-5 sm:px-5 md:px-6">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-[290px] w-full md:h-[330px]"
                preserveAspectRatio="none"
                role="img"
                aria-label="Security score trend for the last 7 days"
              >
                <defs>
                  <linearGradient id="securityArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity=".24"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {[0, 25, 50, 75, 100].map((value) => {
                  const y = padTop + ((100 - value) / 100) * usableHeight;
                  return (
                    <g key={value}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="var(--border)"
                        strokeWidth="1"
                        strokeDasharray="3 6"
                      />
                      <text
                        x="7"
                        y={y + 4}
                        fontSize="10"
                        fontWeight="600"
                        fill="var(--text-muted)"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {scoreAreaPath && (
                  <path d={scoreAreaPath} fill="url(#securityArea)" />
                )}

                {scoreLinePath && (
                  <path
                    d={scoreLinePath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {scorePoints.map((point) => (
                  <g key={`${point.x}-${point.y}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="9"
                      fill="var(--accent)"
                      opacity=".10"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="var(--surface)"
                      stroke="var(--accent)"
                      strokeWidth="3"
                    />
                    <title>
                      {point.label}: {point.score}/100
                    </title>
                  </g>
                ))}

                {scoreData.map((item, index) => {
                  const x =
                    padLeft +
                    (index / Math.max(scoreData.length - 1, 1)) * usableWidth;
                  return (
                    <text
                      key={item.date.toISOString()}
                      x={x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="var(--text-muted)"
                    >
                      {item.label}
                    </text>
                  );
                })}
              </svg>

              {scorePoints.length === 0 && (
                <EmptyChart message="Complete a scan to start building your security trend." />
              )}
            </div>
          </div>

          <div className="dashboard-panel">
            <div
              className="border-b p-5 md:p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="panel-icon">
                  <ShieldCheck size={17} />
                </div>
                <h2
                  className="text-base font-black md:text-lg"
                  style={{ color: "var(--text)" }}
                >
                  Security Posture
                </h2>
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Overall distribution of scan results
              </p>
            </div>

            <div className="flex flex-col items-center px-5 pb-6 pt-6">
              <div className="relative h-[220px] w-[220px]">
                <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
                  <circle
                    cx="110"
                    cy="110"
                    r={postureRadius}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="18"
                  />
                  {totalPosture > 0 && (
                    <>
                      <circle
                        cx="110"
                        cy="110"
                        r={postureRadius}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="18"
                        strokeDasharray={`${healthyLength} ${postureCircumference}`}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="110"
                        cy="110"
                        r={postureRadius}
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="18"
                        strokeDasharray={`${atRiskLength} ${postureCircumference}`}
                        strokeDashoffset={-healthyLength}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="110"
                        cy="110"
                        r={postureRadius}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="18"
                        strokeDasharray={`${criticalLength} ${postureCircumference}`}
                        strokeDashoffset={-(healthyLength + atRiskLength)}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-3xl font-black"
                    style={{ color: "var(--text)" }}
                  >
                    {totalPosture}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Scans
                  </span>
                </div>
              </div>

              <div className="mt-3 w-full space-y-3">
                <PostureRow
                  label="Healthy"
                  value={healthyCount}
                  percent={healthyPercent}
                  color="var(--accent)"
                  icon={<CheckCircle2 size={15} />}
                />
                <PostureRow
                  label="At Risk"
                  value={atRiskCount}
                  percent={atRiskPercent}
                  color="#eab308"
                  icon={<AlertTriangle size={15} />}
                />
                <PostureRow
                  label="Critical"
                  value={criticalCount}
                  percent={criticalPercent}
                  color="#ef4444"
                  icon={<XCircle size={15} />}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-5 lg:grid-cols-2">
          <div className="dashboard-panel">
            <div
              className="border-b p-5 md:p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="panel-icon">
                      <BarChart3 size={17} />
                    </div>
                    <h2
                      className="text-base font-black md:text-lg"
                      style={{ color: "var(--text)" }}
                    >
                      Scan Activity
                    </h2>
                  </div>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Daily analysis volume
                  </p>
                </div>
                <span
                  className="rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  7 days
                </span>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="flex h-[260px] gap-3">
                <div
                  className="flex w-7 flex-col justify-between py-1 text-[9px] font-bold"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>{maximumActivity}</span>
                  <span>{Math.round(maximumActivity * 0.75)}</span>
                  <span>{Math.round(maximumActivity * 0.5)}</span>
                  <span>{Math.round(maximumActivity * 0.25)}</span>
                  <span>0</span>
                </div>

                <div
                  className="relative flex min-w-0 flex-1 items-end justify-between gap-2 border-b border-l px-2 sm:gap-4 sm:px-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map((line) => (
                      <div
                        key={line}
                        className="border-t border-dashed"
                        style={{ borderColor: "var(--border)" }}
                      />
                    ))}
                  </div>

                  {activityData.map((item, index) => {
                    const height = item.count
                      ? Math.max((item.count / maximumActivity) * 100, 7)
                      : 2;
                    const isToday = index === activityData.length - 1;
                    return (
                      <div
                        key={item.date.toISOString()}
                        className="relative z-10 flex h-full flex-1 flex-col items-center justify-end"
                      >
                        <span
                          className="mb-2 text-[10px] font-black"
                          style={{
                            color: item.count
                              ? "var(--accent)"
                              : "var(--text-muted)",
                          }}
                        >
                          {item.count}
                        </span>
                        <div
                          className="w-full max-w-[48px] rounded-t-xl transition-all duration-300 hover:-translate-y-1"
                          style={{
                            height: `${height}%`,
                            minHeight: "3px",
                            background: item.count
                              ? "var(--accent)"
                              : "var(--border)",
                            opacity: item.count ? (isToday ? 1 : 0.72) : 1,
                            boxShadow:
                              item.count && isToday
                                ? "0 0 24px rgba(var(--accent-rgb), .22)"
                                : "none",
                          }}
                          title={`${item.count} scan${item.count === 1 ? "" : "s"}`}
                        />
                        <span
                          className="mt-3 text-[9px] font-bold"
                          style={{
                            color: isToday
                              ? "var(--accent)"
                              : "var(--text-muted)",
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div
              className="border-b p-5 md:p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="panel-icon">
                  <ShieldAlert size={17} />
                </div>
                <h2
                  className="text-base font-black md:text-lg"
                  style={{ color: "var(--text)" }}
                >
                  Finding Severity
                </h2>
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Security signals requiring review
              </p>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              {severityCounts.map((item) => {
                const label =
                  item.severity.charAt(0).toUpperCase() +
                  item.severity.slice(1);
                const percentage = item.count
                  ? Math.max((item.count / maxSeverity) * 100, 5)
                  : 2;
                const color = severityColor(item.severity);
                return (
                  <div key={item.severity}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: color }}
                        />
                        <span
                          className="text-xs font-bold"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {label}
                        </span>
                      </div>
                      <span
                        className="text-xs font-black"
                        style={{ color: "var(--text)" }}
                      >
                        {item.count}
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{ background: "var(--input)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}

              <div
                className="mt-2 grid grid-cols-2 gap-3 border-t pt-5"
                style={{ borderColor: "var(--border)" }}
              >
                <MiniStat
                  label="Wallet scans"
                  value={accountScans}
                  icon={WalletCards}
                />
                <MiniStat
                  label="Contract scans"
                  value={contractScans}
                  icon={FileCode2}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-panel overflow-hidden">
          <div
            className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="panel-icon">
                  <Clock3 size={17} />
                </div>
                <h2
                  className="text-base font-black md:text-lg"
                  style={{ color: "var(--text)" }}
                >
                  Recent Activity
                </h2>
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Latest security analyses from this browser.
              </p>
            </div>
            <span
              className="text-[10px] font-bold"
              style={{ color: "var(--text-muted)" }}
            >
              {Math.min(scans.length, 10)} of {scans.length} shown
            </span>
          </div>

          {scans.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center p-8">
              <EmptyActivity />
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {scans.slice(0, 10).map((scan) => {
                const statusColor = getStatusColor(scan.securityStatus);
                const isAccount = scan.addressType === "account";
                return (
                  <div
                    key={scan.id || `${scan.address}-${scan.timestamp}`}
                    className="flex flex-col gap-4 p-5 transition-colors duration-200 hover:bg-[var(--surface-hover)] md:flex-row md:items-center md:justify-between md:p-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
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
                            className="text-sm font-black"
                            style={{ color: "var(--text)" }}
                          >
                            {isAccount
                              ? "Stellar Account"
                              : "Soroban Smart Contract"}
                          </h3>
                          <span
                            className="rounded-md border px-2 py-1 text-[9px] font-black"
                            style={{
                              background: "var(--accent-soft)",
                              borderColor: "rgba(var(--accent-rgb), .18)",
                              color: "var(--accent)",
                            }}
                          >
                            Testnet
                          </span>
                        </div>
                        <p
                          className="mt-1 truncate font-mono text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                          title={scan.address}
                        >
                          {shortenAddress(scan.address)}
                        </p>
                        <p
                          className="mt-1 flex items-center gap-1 text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Clock3 size={11} />
                          {formatDate(scan.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="rounded-xl border px-4 py-3"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Score
                        </p>
                        <p
                          className="mt-1 text-sm font-black"
                          style={{ color: statusColor }}
                        >
                          {scan.securityScore != null
                            ? `${scan.securityScore}/100`
                            : "N/A"}
                        </p>
                      </div>
                      <div
                        className="flex min-w-[125px] items-center gap-2 rounded-xl border px-4 py-3"
                        style={{
                          background: `${statusColor}08`,
                          borderColor: `${statusColor}25`,
                          color: statusColor,
                        }}
                      >
                        {getStatusIcon(scan.securityStatus)}
                        <span className="text-xs font-bold">
                          {scan.securityStatus || "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="mt-5 rounded-2xl border p-4 md:p-5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  background: findingsCount
                    ? "rgba(234,179,8,.10)"
                    : "var(--accent-soft)",
                  color: findingsCount ? "#eab308" : "var(--accent)",
                }}
              >
                {findingsCount ? (
                  <AlertTriangle size={17} />
                ) : (
                  <CheckCircle2 size={17} />
                )}
              </div>
              <div>
                <p
                  className="text-xs font-black"
                  style={{ color: "var(--text)" }}
                >
                  Security Findings
                </p>
                <p
                  className="mt-1 text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {findingsCount === 0
                    ? "No recorded non-info security findings."
                    : `${findingsCount} security finding${findingsCount === 1 ? "" : "s"} recorded across your scans.`}
                </p>
              </div>
            </div>
            <p
              className="text-[10px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Scores are preliminary security indicators.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusPill({ label, muted = false }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: muted ? "var(--text-muted)" : "var(--text-secondary)",
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: muted ? "var(--text-muted)" : "var(--accent)",
          boxShadow: muted ? "none" : "0 0 10px rgba(var(--accent-rgb), .45)",
        }}
      />
      <span className="text-[10px] font-black">{label}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent = false,
  danger = false,
}) {
  const color = danger ? "#ef4444" : accent ? "var(--accent)" : "var(--text)";
  return (
    <div className="dashboard-panel group p-5 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[9px] font-black uppercase tracking-[.17em]"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </p>
          <p
            className="mt-3 text-3xl font-black tracking-[-.04em]"
            style={{ color }}
          >
            {value}
          </p>
          <p
            className="mt-1 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: danger
              ? "rgba(239,68,68,.09)"
              : accent
                ? "var(--accent-soft)"
                : "var(--input)",
            color: danger
              ? "#ef4444"
              : accent
                ? "var(--accent)"
                : "var(--text-muted)",
          }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function PostureRow({ label, value, percent, color, icon }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color }}>
          {icon}
          <span
            className="text-xs font-bold"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black" style={{ color: "var(--text)" }}>
            {value}
          </span>
          <span
            className="text-[9px] font-bold"
            style={{ color: "var(--text-muted)" }}
          >
            {percent}%
          </span>
        </div>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--input)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      style={{ background: "var(--input)", borderColor: "var(--border)" }}
    >
      <Icon size={15} style={{ color: "var(--accent)" }} />
      <div>
        <p
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 text-sm font-black"
          style={{ color: "var(--text)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="mt-[-145px] flex h-28 items-center justify-center text-center">
      <p className="max-w-xs text-xs" style={{ color: "var(--text-muted)" }}>
        {message}
      </p>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        <Activity size={25} />
      </div>
      <h3 className="text-sm font-black" style={{ color: "var(--text)" }}>
        No activity yet
      </h3>
      <p
        className="mt-2 max-w-sm text-xs leading-5"
        style={{ color: "var(--text-muted)" }}
      >
        Complete a Stellar Testnet scan and your analytics will appear here.
      </p>
    </div>
  );
}

function severityColor(severity) {
  if (severity === "critical") return "#ef4444";
  if (severity === "high") return "#f97316";
  if (severity === "medium") return "#eab308";
  return "#60a5fa";
}

export default SecurityAnalytics;
