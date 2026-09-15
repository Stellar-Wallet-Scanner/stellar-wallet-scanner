import { Activity, BarChart3, Grid2X2, History, Menu, X } from "lucide-react";

const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Grid2X2,
  },
  {
    id: "history",
    label: "Scan History",
    icon: History,
  },
  {
    id: "analytics",
    label: "Security Analytics",
    icon: BarChart3,
  },
];

function Sidebar({ isOpen, setIsOpen, activePage, onNavigate }) {
  const handleNavigate = (page) => {
    onNavigate?.(page);
    setIsOpen?.(false);
  };

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsOpen?.(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* =====================================================
            BRAND
        ===================================================== */}

        <div
          className="flex h-[82px] shrink-0 items-center border-b px-5"
          style={{
            borderColor: "var(--border)",
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src="/stellar-scan-icon.png"
              alt="Stellar Scan"
              className="h-10 w-10 shrink-0 rounded-xl object-cover"
            />

            <div className="min-w-0">
              <div
                className="truncate text-sm font-black tracking-tight"
                style={{
                  color: "var(--text)",
                }}
              >
                Stellar Scan
              </div>

              <div
                className="text-[10px] font-medium"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                Security Intelligence
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen?.(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-2 lg:hidden"
            style={{
              color: "var(--text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* =====================================================
            NAVIGATION
        ===================================================== */}

        <div className="flex-1 overflow-y-auto px-3 py-7">
          <div
            className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              color: "var(--text-muted)",
            }}
          >
            Workspace
          </div>

          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition-all duration-200"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",

                    color: active
                      ? "var(--accent-dark)"
                      : "var(--text-secondary)",

                    borderLeft: active
                      ? "3px solid var(--accent)"
                      : "3px solid transparent",
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                    style={{
                      background: active
                        ? "rgba(var(--accent-rgb), 0.12)"
                        : "var(--surface-hover)",

                      color: active ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0 flex-1 truncate">{item.label}</span>

                  {active && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: "var(--accent)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* =====================================================
              NETWORK
          ===================================================== */}

          <div
            className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              color: "var(--text-muted)",
            }}
          >
            Network
          </div>

          <div
            className="rounded-2xl border p-3"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                <Activity size={18} />
              </div>

              <div className="min-w-0">
                <div
                  className="truncate text-xs font-extrabold"
                  style={{
                    color: "var(--text)",
                  }}
                >
                  Stellar Testnet
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "var(--accent)",
                    }}
                  />

                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: "var(--text-muted)",
                    }}
                  >
                    Development Network
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div
          className="shrink-0 border-t px-4 py-4"
          style={{
            borderColor: "var(--border)",
          }}
        >
          {/* PROFILE */}

          <div className="flex flex-col items-center text-center">
            <img
              src="/moses.jpeg"
              alt="Moses Ifunanya Nobei"
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />

            <div className="mt-2 min-w-0">
              <div
                className="text-xs font-extrabold"
                style={{
                  color: "var(--text)",
                }}
              >
                Moses Ifunanya Nobei
              </div>

              <div
                className="mt-0.5 text-[10px] font-medium"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                Blockchain Developer
              </div>
            </div>
          </div>

          {/* =====================================================
              SOCIAL MEDIA
          ===================================================== */}

          <div className="mt-4 flex items-center justify-center gap-2">
            {/* X */}
            <a
              href="https://x.com/Ifynob53"
              target="_blank"
              rel="noreferrer"
              aria-label="X"
              title="X"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--accent-soft)]"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-muted)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.85h1.73L8.27 4.03H6.41L17.8 19.85Z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/mosesifunanya/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--accent-soft)]"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-muted)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.01 2.01 0 1 0 5.25 7a2.01 2.01 0 0 0 0-4ZM20.44 13.41c0-3.47-1.85-5.09-4.32-5.09-1.99 0-2.88 1.09-3.38 1.86V8.5H9.36V20h3.38v-6.4c0-1.69.32-3.33 2.42-3.33 2.06 0 2.09 1.94 2.09 3.44V20h3.19v-6.59Z" />
              </svg>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/mosesifunanya"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              title="GitHub"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--accent-soft)]"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-muted)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.32-3.8-1.32-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.71 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.51-.29-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.16-3.05-.12-.29-.5-1.44.11-3 0 0 .94-.3 3.09 1.16a10.7 10.7 0 0 1 5.63 0c2.15-1.46 3.09-1.16 3.09-1.16.61 1.56.23 2.71.11 3 .72.8 1.16 1.81 1.16 3.05 0 4.35-2.65 5.3-5.17 5.59.4.35.75 1.04.75 2.1v3.11c0 .3.2.66.76.54A11.25 11.25 0 0 0 12 .75Z" />
              </svg>
            </a>

            {/* Gmail */}
            <a
              href="mailto:mosesifunanya@gmail.com"
              aria-label="Email"
              title="Email"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--accent-soft)]"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-muted)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 5.5h16v13H4z" />
                <path d="m4 6 8 6 8-6" />
              </svg>
            </a>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() => setIsOpen?.(true)}
        aria-label="Open navigation"
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl border lg:hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <Menu size={19} />
      </button>
    </>
  );
}

export default Sidebar;
