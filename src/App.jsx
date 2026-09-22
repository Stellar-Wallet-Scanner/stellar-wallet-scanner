import { useEffect, useMemo, useState } from "react";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ScanHistory from "./components/ScanHistory";
import SecurityAnalytics from "./components/SecurityAnalytics";
import Scanner from "./components/Scanner";
import ScannerRegistry from "./components/ScannerRegistry";

const HISTORY_STORAGE_KEY = "stellar-scan-history";
const READ_NOTIFICATIONS_STORAGE_KEY = "stellar-scan-read-notifications";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");

  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);

  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);

      if (!savedHistory) {
        return [];
      }

      const parsedHistory = JSON.parse(savedHistory);

      return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch (error) {
      console.error("Could not load scan history:", error);
      return [];
    }
  });

  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const savedIds = localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);

      if (!savedIds) {
        return [];
      }

      const parsedIds = JSON.parse(savedIds);

      return Array.isArray(parsedIds) ? parsedIds : [];
    } catch (error) {
      console.error("Could not load read notifications:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(scanHistory));
    } catch (error) {
      console.error("Could not save scan history:", error);
    }
  }, [scanHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(
        READ_NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(readNotificationIds),
      );
    } catch (error) {
      console.error("Could not save read notifications:", error);
    }
  }, [readNotificationIds]);

  const handleNavigate = (page) => {
    setActivePage(page);
    setIsOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleScanComplete = (result) => {
    const historyItem = {
      ...result,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    setScanHistory((currentHistory) =>
      [historyItem, ...currentHistory].slice(0, 100),
    );
  };

  const handleDeleteScan = (id) => {
    setScanHistory((currentHistory) =>
      currentHistory.filter((scan) => scan.id !== id),
    );

    setReadNotificationIds((currentIds) =>
      currentIds.filter(
        (notificationId) => !notificationId.startsWith(`${id}-`),
      ),
    );
  };

  const handleClearHistoryRequest = () => {
    if (scanHistory.length === 0) {
      return;
    }

    setShowClearHistoryModal(true);
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    setReadNotificationIds([]);
    setShowClearHistoryModal(false);
  };

  const handleCancelClearHistory = () => {
    setShowClearHistoryModal(false);
  };

  const handleNotificationRead = (notificationId) => {
    if (!notificationId) {
      return;
    }

    setReadNotificationIds((currentIds) => {
      if (currentIds.includes(notificationId)) {
        return currentIds;
      }

      return [...currentIds, notificationId];
    });
  };

  const notifications = useMemo(() => {
    const items = [];

    scanHistory.forEach((scan) => {
      const address = scan.address || scan.contractAddress;

      const findings = Array.isArray(scan.findings)
        ? scan.findings.filter(
            (finding) => finding?.severity?.toLowerCase() !== "info",
          )
        : [];

      findings.forEach((finding, index) => {
        const notificationId = `${scan.id}-finding-${finding.id || index}`;

        if (readNotificationIds.includes(notificationId)) {
          return;
        }

        items.push({
          id: notificationId,
          type: "finding",
          severity: finding.severity || "medium",
          title: finding.title || "Security finding detected",
          description:
            finding.description ||
            "A potential security issue was identified during analysis.",
          recommendation: finding.recommendation || "",
          address,
          timestamp: scan.timestamp,
        });
      });

      if (findings.length === 0) {
        const notificationId = `${scan.id}-completed`;

        if (!readNotificationIds.includes(notificationId)) {
          items.push({
            id: notificationId,
            type: "success",
            severity: "info",
            title: "Scan completed",
            description: "No security findings were detected.",
            recommendation: "",
            address,
            timestamp: scan.timestamp,
          });
        }
      }
    });

    return items.slice(0, 30);
  }, [scanHistory, readNotificationIds]);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <Dashboard
            history={scanHistory}
            onScanComplete={handleScanComplete}
            onNavigate={handleNavigate}
          />
        );

      case "scanner":
        return (
          <main className="min-h-screen w-full px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
            <Scanner onScanComplete={handleScanComplete} />
          </main>
        );

      case "registry":
        return <ScannerRegistry />;

      case "history":
        return (
          <ScanHistory
            history={scanHistory}
            onDelete={handleDeleteScan}
            onClear={handleClearHistoryRequest}
          />
        );

      case "analytics":
        return <SecurityAnalytics history={scanHistory} />;

      default:
        return (
          <Dashboard
            history={scanHistory}
            onScanComplete={handleScanComplete}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div
      className={darkMode ? "app dark-mode" : "app light-mode"}
      style={{
        "--sidebar-width": "280px",
      }}
    >
      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      <div className="min-h-screen w-full min-w-0 overflow-x-hidden lg:ml-[var(--sidebar-width)] lg:w-[calc(100%-var(--sidebar-width))]">
        <Header
          setIsOpen={setIsOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          notifications={notifications}
          onNotificationRead={handleNotificationRead}
          onNavigate={handleNavigate}
        />

        {renderPage()}
      </div>

      {/* CLEAR HISTORY CONFIRMATION MODAL */}
      {showClearHistoryModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-history-title"
        >
          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close confirmation"
            onClick={handleCancelClearHistory}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* MODAL */}
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 30px 80px rgba(0, 0, 0, 0.35)",
            }}
          >
            {/* TOP ACCENT */}
            <div
              className="h-1 w-full"
              style={{
                background: "linear-gradient(90deg, var(--accent), #ef4444)",
              }}
            />

            <div className="p-6 sm:p-7">
              {/* ICON */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v5" />
                  <path d="M14 11v5" />
                </svg>
              </div>

              {/* CONTENT */}
              <div className="mt-5">
                <h2
                  id="clear-history-title"
                  className="text-lg font-extrabold"
                  style={{
                    color: "var(--text)",
                  }}
                >
                  Clear scan history?
                </h2>

                <p
                  className="mt-2 text-sm leading-6"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  This will permanently remove all{" "}
                  <span
                    className="font-bold"
                    style={{
                      color: "var(--text)",
                    }}
                  >
                    {scanHistory.length}
                  </span>{" "}
                  recorded scan
                  {scanHistory.length === 1 ? "" : "s"} from this browser.
                </p>

                <div
                  className="mt-4 rounded-xl border p-3"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p
                    className="text-xs font-semibold leading-5"
                    style={{
                      color: "var(--text-muted)",
                    }}
                  >
                    Your Stellar Testnet wallets and contracts will not be
                    affected. Only the local scan history stored by this
                    application will be removed.
                  </p>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelClearHistory}
                  className="rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.25)",
                    color: "#ef4444",
                  }}
                >
                  Clear History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
