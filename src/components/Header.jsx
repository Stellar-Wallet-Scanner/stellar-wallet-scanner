import { useEffect, useRef, useState } from "react";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Menu,
  Moon,
  Sun,
  X,
  XCircle,
} from "lucide-react";

import { checkTestnetHealth } from "../services/stellar";

function Header({
  setIsOpen,
  darkMode,
  setDarkMode,
  notifications = [],
  onNotificationRead,
  onNavigate,
}) {
  const [networkStatus, setNetworkStatus] = useState("checking");
  const [latestLedger, setLatestLedger] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const notificationRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadNetworkStatus() {
      const result = await checkTestnetHealth();

      if (!mounted) {
        return;
      }

      if (result.online) {
        setNetworkStatus("online");
        setLatestLedger(result.latestLedger);
      } else {
        setNetworkStatus("offline");
        setLatestLedger(null);
      }
    }

    loadNetworkStatus();

    const interval = setInterval(loadNetworkStatus, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications]);

  const getSeverityColor = (severity) => {
    if (severity === "critical") return "#ef4444";
    if (severity === "high") return "#f97316";
    if (severity === "medium") return "#eab308";
    return "var(--accent)";
  };

  const getNotificationIcon = (notification) => {
    if (notification.type === "success") {
      return <CheckCircle2 size={17} />;
    }

    if (notification.severity === "critical") {
      return <XCircle size={17} />;
    }

    if (
      notification.severity === "high" ||
      notification.severity === "medium"
    ) {
      return <AlertTriangle size={17} />;
    }

    return <AlertCircle size={17} />;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const handleNotificationClick = (notification) => {
    if (!notification) return;

    onNotificationRead?.(notification.id);
    setShowNotifications(false);

    if (notification.type === "finding") {
      onNavigate?.("history");
    }
  };

  const handleDashboardClick = () => {
    setShowNotifications(false);
    onNavigate?.("dashboard");
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 flex h-[68px] min-w-0 items-center justify-between border-b px-3 backdrop-blur-xl sm:h-20 sm:px-4 md:px-5"
        style={{
          background: "color-mix(in srgb, var(--surface) 94%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-xl border p-2.5 transition-all duration-200 hover:-translate-y-0.5 lg:hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            onClick={handleDashboardClick}
            className="group hidden items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-200 hover:bg-white/5 md:flex"
            aria-label="Go to Dashboard"
            title="Go to Dashboard"
          >
            <Activity
              size={17}
              style={{ color: "var(--accent)" }}
              className="transition-transform duration-200 group-hover:scale-110"
            />

            <span
              className="text-sm font-semibold transition-colors duration-200 group-hover:text-[var(--text)]"
              style={{ color: "var(--text-secondary)" }}
            >
              Stellar Security Scanner
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-4">
          <div
            className="flex max-w-[145px] items-center gap-1.5 rounded-full border px-2.5 py-1.5 sm:max-w-none sm:gap-2 sm:px-3"
            style={{
              background:
                networkStatus === "online"
                  ? "rgba(22, 163, 74, 0.07)"
                  : networkStatus === "offline"
                    ? "rgba(220, 38, 38, 0.07)"
                    : "rgba(245, 158, 11, 0.07)",
              borderColor:
                networkStatus === "online"
                  ? "rgba(22, 163, 74, 0.14)"
                  : networkStatus === "offline"
                    ? "rgba(220, 38, 38, 0.14)"
                    : "rgba(245, 158, 11, 0.14)",
            }}
          >
            <span
              className={
                networkStatus === "checking"
                  ? "h-1.5 w-1.5 animate-pulse rounded-full"
                  : "h-1.5 w-1.5 rounded-full"
              }
              style={{
                background:
                  networkStatus === "online"
                    ? "#16a34a"
                    : networkStatus === "offline"
                      ? "#dc2626"
                      : "#f59e0b",
              }}
            />

            <span
              className="truncate text-[11px] font-bold sm:text-xs"
              style={{ color: "var(--text)" }}
            >
              Stellar Testnet
            </span>

            <span
              className="hidden text-xs font-semibold sm:block"
              style={{
                color:
                  networkStatus === "online"
                    ? "#16a34a"
                    : networkStatus === "offline"
                      ? "#dc2626"
                      : "#f59e0b",
              }}
            >
              {networkStatus === "online"
                ? "Online"
                : networkStatus === "offline"
                  ? "Offline"
                  : "Checking..."}
            </span>
          </div>

          {latestLedger && (
            <div
              className="hidden text-xs font-semibold xl:block"
              style={{ color: "var(--text-muted)" }}
            >
              Ledger #{latestLedger.toLocaleString()}
            </div>
          )}

          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative rounded-xl border p-2.5 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "var(--surface)",
                borderColor: showNotifications
                  ? "var(--accent)"
                  : "var(--border)",
                color: showNotifications
                  ? "var(--accent-dark)"
                  : "var(--text-muted)",
              }}
              title="Notifications"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell size={18} />

              {notifications.length > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black"
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                  }}
                >
                  {notifications.length > 99 ? "99+" : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 top-14 z-50 w-[350px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  boxShadow: "0 20px 50px var(--shadow)",
                }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <h3
                      className="text-sm font-extrabold"
                      style={{ color: "var(--text)" }}
                    >
                      Notifications
                    </h3>

                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Scan findings and system activity
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-black/5"
                    style={{ color: "var(--text-muted)" }}
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>

                {notifications.length > 0 ? (
                  <div className="max-h-[430px] overflow-y-auto">
                    {notifications.map((notification) => {
                      const severityColor = getSeverityColor(
                        notification.severity,
                      );

                      return (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className="w-full border-b p-4 text-left transition-colors hover:bg-black/[0.03]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                background: `${severityColor}12`,
                                color: severityColor,
                              }}
                            >
                              {getNotificationIcon(notification)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className="text-xs font-extrabold"
                                  style={{ color: "var(--text)" }}
                                >
                                  {notification.title}
                                </p>

                                {notification.type === "finding" && (
                                  <span
                                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase"
                                    style={{
                                      background: `${severityColor}12`,
                                      color: severityColor,
                                    }}
                                  >
                                    {notification.severity}
                                  </span>
                                )}
                              </div>

                              <p
                                className="mt-1 text-[11px] leading-5"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {notification.description}
                              </p>

                              {notification.recommendation && (
                                <p
                                  className="mt-2 text-[10px] leading-4"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  Recommendation: {notification.recommendation}
                                </p>
                              )}

                              {notification.address && (
                                <p
                                  className="mt-1 truncate font-mono text-[9px]"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {notification.address}
                                </p>
                              )}

                              <p
                                className="mt-2 text-[9px] font-semibold"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {formatTime(notification.timestamp)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <div
                      className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      <CheckCircle2 size={21} />
                    </div>

                    <p
                      className="mt-3 text-xs font-extrabold"
                      style={{ color: "var(--text)" }}
                    >
                      No notifications
                    </p>

                    <p
                      className="mt-1 text-[11px] leading-5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Scan a Stellar Testnet address and any new findings will
                      appear here.
                    </p>
                  </div>
                )}

                {notifications.length > 0 && (
                  <div
                    className="border-t p-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate?.("history");
                      }}
                      className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-bold transition-colors hover:bg-black/5"
                      style={{ color: "var(--accent-dark)" }}
                    >
                      View scan history
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl border p-2.5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div aria-hidden="true" className="h-[68px] sm:h-20" />
    </>
  );
}

export default Header;
