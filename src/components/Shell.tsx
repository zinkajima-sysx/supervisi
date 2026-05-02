"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseMedical,
  Building2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ClipboardPenLine,
  FileText,
  HardHat,
  LayoutDashboard,
  List,
  LogOut,
  MapPinned,
  Menu,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

import LogoutButton from "@/components/LogoutButton";
import LogoChecklist from "@/components/LogoChecklist";

type Props = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    username?: string;
    role?: string;
    wilayahKerja?: string | null;
  };
};

export default function Shell({ children, user }: Props) {
  const pathname = usePathname();
  const roleLabel = user.role ?? "-";
  const wilayah = user.wilayahKerja ? ` • ${user.wilayahKerja}` : "";
  const name = user.name ?? user.username ?? "User";
  const initials = useMemo(() => name.trim().slice(0, 2).toUpperCase(), [name]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainOffsetClass = sidebarCollapsed ? "lg:pl-16" : "lg:pl-60";

  const isScoped = useMemo(() => {
    const r = (user.role ?? "").toUpperCase();
    return r === "KEPALA_KLINIK" || r === "DOKTER_FUNGSIONAL";
  }, [user.role]);

  useEffect(() => {
    const raw = window.localStorage.getItem("sidebarCollapsed");
    if (raw === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const navItemClass = (href: string) =>
    `group flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
      sidebarCollapsed ? "lg:justify-center lg:px-2 lg:gap-0" : ""
    } ${
      pathname === href
        ? "bg-primary text-primary-content shadow-md shadow-primary/15 font-semibold"
        : "text-foreground/80 hover:bg-default hover:text-foreground"
    }`;

  const iconBadgeClass = (
    active: boolean,
    scheme: "primary" | "secondary" | "success" | "info"
  ) => {
    const base =
      "h-7 w-7 rounded-xl flex items-center justify-center border transition-colors duration-200 shrink-0";
    if (scheme === "primary") {
      return `${base} ${
        active
          ? "bg-primary text-primary-content border-primary/20"
          : "bg-primary/10 text-primary border-primary/10 group-hover:bg-primary group-hover:text-primary-content"
      }`;
    }
    if (scheme === "secondary") {
      return `${base} ${
        active
          ? "bg-secondary text-secondary-content border-secondary/20"
          : "bg-secondary/10 text-secondary border-secondary/10 group-hover:bg-secondary group-hover:text-secondary-content"
      }`;
    }
    if (scheme === "success") {
      return `${base} ${
        active
          ? "bg-success text-success-content border-success/20"
          : "bg-success/10 text-success border-success/10 group-hover:bg-success group-hover:text-success-content"
      }`;
    }
    return `${base} ${
      active
        ? "bg-info text-info-content border-info/20"
        : "bg-info/10 text-info border-info/10 group-hover:bg-info group-hover:text-info-content"
    }`;
  };

  const linkIconBadgeClass = (
    href: string,
    scheme: "primary" | "secondary" | "success" | "info"
  ) => iconBadgeClass(pathname === href, scheme);

  return (
    <div className="font-sans">
      <div className="flex min-h-screen bg-background">
        <div
          className={`fixed inset-0 z-50 bg-black/40 transition-opacity lg:hidden ${
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside
          className={`fixed left-0 top-0 z-[60] h-full w-60 border-r border-border bg-surface shadow-xl transition-transform lg:translate-x-0 flex flex-col ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarCollapsed ? "lg:w-16" : "lg:w-60"}`}
        >
          <div className={`p-4 ${sidebarCollapsed ? "lg:p-3" : ""}`}>
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
              <div className="rounded-2xl bg-primary text-primary-foreground p-2 border border-border">
                <LogoChecklist className="w-6 h-6" />
              </div>
              <div className={sidebarCollapsed ? "lg:hidden" : ""}>
                <div className="font-black text-sm uppercase tracking-tight text-foreground">KAI Supervisi</div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-foreground/60 mt-0.5">
                  Internal Dashboard
                </div>
              </div>
              <button
                type="button"
                className={`hidden lg:inline-flex button button--ghost button--icon-only button--sm ${
                  sidebarCollapsed ? "" : "ml-auto"
                }`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setSidebarCollapsed((v) => !v)}
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-1 min-h-0">
            <div>
              <div
                className={`px-3 mb-1.5 text-[9px] uppercase tracking-[0.24em] text-foreground/60 font-black ${
                  sidebarCollapsed ? "lg:hidden" : ""
                }`}
              >
                Main Menu
              </div>
              <ul className="space-y-1">
                <li>
                  <Link
                    className={navItemClass("/dashboard")}
                    href="/dashboard"
                    onClick={() => setSidebarOpen(false)}
                    title="Dashboard"
                  >
                    <span className={linkIconBadgeClass("/dashboard", "primary")}>
                      <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className={`flex-1 text-sm ${sidebarCollapsed ? "lg:hidden" : ""}`}>Dashboard</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div
                className={`px-3 mb-1.5 text-[9px] uppercase tracking-[0.24em] text-foreground/60 font-black ${
                  sidebarCollapsed ? "lg:hidden" : ""
                }`}
              >
                Operations
              </div>
              <ul className="space-y-1">
                <li>
                  <details open className="group">
                    <summary
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-foreground/70 hover:bg-default cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        sidebarCollapsed ? "lg:justify-center lg:px-2 lg:gap-0" : ""
                      }`}
                      title="Input Supervisi"
                      onClick={() => {
                        if (sidebarCollapsed) setSidebarCollapsed(false);
                      }}
                    >
                      <span className={iconBadgeClass(false, "secondary")}>
                        <ClipboardPenLine aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className={`flex-1 text-sm font-semibold ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                        Input Supervisi
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 opacity-40 transition-transform duration-200 group-open:rotate-180 ${
                          sidebarCollapsed ? "lg:hidden" : ""
                        }`}
                      />
                    </summary>
                    <ul className={`mt-1 ml-6 space-y-1 border-l border-border ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                      <li>
                        <Link
                          className={`block rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/apd"
                              ? "text-primary font-semibold"
                              : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/input/apd"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground border border-border">
                            <HardHat className="h-3.5 w-3.5" />
                          </span>
                          Input APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/apd/list"
                              ? "text-primary font-semibold"
                              : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/input/apd/list"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary border border-border">
                            <List className="h-3.5 w-3.5" />
                          </span>
                          List Data APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/p3k"
                              ? "text-primary font-semibold"
                              : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/input/p3k"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-secondary text-secondary-foreground border border-border">
                            <BriefcaseMedical className="h-3.5 w-3.5" />
                          </span>
                          Input P3K
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/p3k/list"
                              ? "text-primary font-semibold"
                              : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/input/p3k/list"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/20 text-secondary border border-border">
                            <List className="h-3.5 w-3.5" />
                          </span>
                          List Data P3K
                        </Link>
                      </li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details open className="group">
                    <summary
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-foreground/70 hover:bg-default cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        sidebarCollapsed ? "lg:justify-center lg:px-2 lg:gap-0" : ""
                      }`}
                      title="Laporan"
                      onClick={() => {
                        if (sidebarCollapsed) setSidebarCollapsed(false);
                      }}
                    >
                      <span className={iconBadgeClass(false, "info")}>
                        <FileText aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className={`flex-1 text-sm font-semibold ${sidebarCollapsed ? "lg:hidden" : ""}`}>Laporan</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 opacity-40 transition-transform duration-200 group-open:rotate-180 ${
                          sidebarCollapsed ? "lg:hidden" : ""
                        }`}
                      />
                    </summary>
                    <ul className={`mt-1 ml-6 space-y-1 border-l border-border ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                      <li>
                        <Link
                          className={`block rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/laporan/apd"
                              ? "text-primary font-semibold"
                              : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/laporan/apd"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-accent-foreground border border-border"
                          >
                            <HardHat className="h-3.5 w-3.5" />
                          </span>
                          APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/laporan/p3k"
                              ? "text-primary font-semibold"
                              : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/laporan/p3k"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-accent-foreground border border-border"
                          >
                            <BriefcaseMedical className="h-3.5 w-3.5" />
                          </span>
                          P3K
                        </Link>
                      </li>
                    </ul>
                  </details>
                </li>
              </ul>
            </div>

            <div>
              <div
                className={`px-3 mb-1.5 text-[9px] uppercase tracking-[0.24em] text-foreground/60 font-black ${
                  sidebarCollapsed ? "lg:hidden" : ""
                }`}
              >
                Master
              </div>
              <ul className="space-y-1">
                {!isScoped && (
                  <li>
                    <Link
                      className={navItemClass("/master/users")}
                      href="/master/users"
                      onClick={() => setSidebarOpen(false)}
                      title="Data User"
                    >
                      <span className={linkIconBadgeClass("/master/users", "primary")}>
                        <Users aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className={`flex-1 text-sm ${sidebarCollapsed ? "lg:hidden" : ""}`}>Data User</span>
                    </Link>
                  </li>
                )}
                {!isScoped && (
                  <li>
                    <Link
                      className={navItemClass("/master/klinik")}
                      href="/master/klinik"
                      onClick={() => setSidebarOpen(false)}
                      title="Data Klinik"
                    >
                      <span className={linkIconBadgeClass("/master/klinik", "secondary")}>
                        <Building2 aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className={`flex-1 text-sm ${sidebarCollapsed ? "lg:hidden" : ""}`}>Data Klinik</span>
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    className={navItemClass("/master/upt")}
                    href="/master/upt"
                    onClick={() => setSidebarOpen(false)}
                    title="Data UPT"
                  >
                    <span className={linkIconBadgeClass("/master/upt", "success")}>
                      <MapPinned aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className={`flex-1 text-sm ${sidebarCollapsed ? "lg:hidden" : ""}`}>Data UPT</span>
                  </Link>
                </li>
                {!isScoped && (
                  <li>
                    <Link
                      className={navItemClass("/master/import")}
                      href="/master/import"
                      onClick={() => setSidebarOpen(false)}
                      title="Import CSV"
                    >
                      <span className={linkIconBadgeClass("/master/import", "info")}>
                        <Upload aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className={`flex-1 text-sm ${sidebarCollapsed ? "lg:hidden" : ""}`}>Import CSV</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </nav>

          <div className="p-3 border-t border-border shrink-0">
            <div className="rounded-2xl border border-border bg-surface p-3">
              <div className={`flex items-center gap-2 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
                <div className="h-7 w-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center border border-border shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest text-primary ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                  System Online
                </span>
              </div>
              <p className={`mt-1.5 text-[9px] text-foreground/70 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                Monitoring APD &amp; P3K secara real-time untuk kepatuhan K3.
              </p>
            </div>

            <div className="mt-2">
              <LogoutButton
                className={`button button--outline w-full justify-start gap-2 text-sm ${sidebarCollapsed ? "lg:justify-center" : ""}`}
              >
                <span className={iconBadgeClass(false, "primary")}>
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className={`font-semibold ${sidebarCollapsed ? "lg:hidden" : ""}`}>Logout</span>
              </LogoutButton>
            </div>
          </div>
        </aside>

        <div className={`flex min-h-screen flex-1 flex-col bg-background ${mainOffsetClass}`}>
          <header className="px-4 py-2 lg:px-5 border-b border-border bg-surface">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="button button--ghost button--icon-only lg:hidden"
                  aria-label="Buka menu"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="hidden lg:block">
                  <h1 className="text-base font-black tracking-tight">
                    <span className="text-primary">Supervisi</span>
                    <span className="ml-2 text-xs font-semibold text-foreground/60">APD &amp; P3K</span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col items-end text-right mr-1">
                  <span className="text-xs font-semibold leading-none text-foreground">{name}</span>
                  <span className="text-[9px] uppercase tracking-wider mt-0.5 font-bold text-foreground/60">
                    {roleLabel} {wilayah}
                  </span>
                </div>
                <details className="relative">
                  <summary
                    role="button"
                    aria-label="Buka menu akun"
                    className="list-none button button--ghost button--icon-only"
                  >
                    <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border border-border">
                      <span className="text-xs font-bold">{initials}</span>
                    </span>
                  </summary>
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-surface shadow-2xl z-50 p-2">
                    <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold text-foreground/60">
                      Account
                    </div>
                    <div className="px-3 py-1.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm text-foreground">{name}</span>
                        <span className="text-xs text-foreground/60">@{user.username}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 mt-0.5">{roleLabel}</span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 lg:p-5">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>

          <footer className="p-3 text-center text-[9px] uppercase tracking-[0.2em] text-foreground/50 font-bold">
            &copy; 2026 KAI Supervisi
          </footer>
        </div>
      </div>
    </div>
  );
}
