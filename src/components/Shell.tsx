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
  const mainOffsetClass = sidebarCollapsed ? "lg:pl-20" : "lg:pl-72";

  const navItemClass = (href: string) =>
    `group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
      sidebarCollapsed ? "lg:justify-center lg:px-3 lg:gap-0" : ""
    } ${
      pathname === href
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15 font-semibold"
        : "text-foreground/80 hover:bg-default hover:text-foreground"
    }`;

  const iconBadgeClass = (
    active: boolean,
    scheme: "primary" | "secondary" | "success" | "info"
  ) => {
    const base =
      "h-9 w-9 rounded-2xl flex items-center justify-center border transition-colors duration-200";
    if (scheme === "primary") {
      return `${base} ${
        active
          ? "bg-primary text-primary-foreground border-primary/20"
          : "bg-primary/10 text-primary border-primary/10 group-hover:bg-primary group-hover:text-primary-foreground"
      }`;
    }
    if (scheme === "secondary") {
      return `${base} ${
        active
          ? "bg-secondary text-secondary-foreground border-secondary/20"
          : "bg-secondary/10 text-secondary border-secondary/10 group-hover:bg-secondary group-hover:text-secondary-foreground"
      }`;
    }
    if (scheme === "success") {
      return `${base} ${
        active
          ? "bg-success text-success-foreground border-success/20"
          : "bg-success/10 text-success border-success/10 group-hover:bg-success group-hover:text-success-foreground"
      }`;
    }
    return `${base} ${
      active
        ? "bg-info text-info-foreground border-info/20"
        : "bg-info/10 text-info border-info/10 group-hover:bg-info group-hover:text-info-foreground"
    }`;
  };

  const linkIconBadgeClass = (
    href: string,
    scheme: "primary" | "secondary" | "success" | "info"
  ) => iconBadgeClass(pathname === href, scheme);

  useEffect(() => {
    const raw = window.localStorage.getItem("sidebarCollapsed");
    if (raw === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

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
          className={`fixed left-0 top-0 z-[60] h-full w-72 border-r border-border bg-surface shadow-xl transition-transform lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"}`}
        >
          <div className={`p-6 ${sidebarCollapsed ? "lg:p-4" : ""}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
              <div className="rounded-3xl bg-primary text-primary-foreground p-3 border border-border">
                <LogoChecklist className="w-8 h-8" />
              </div>
              <div className={sidebarCollapsed ? "lg:hidden" : ""}>
                <div className="font-black text-lg uppercase tracking-tight text-foreground">KAI Supervisi</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/60 mt-1">Internal Dashboard</div>
              </div>
              <button
                type="button"
                className={`hidden lg:inline-flex button button--ghost button--icon-only ${sidebarCollapsed ? "" : "ml-auto"}`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setSidebarCollapsed((v) => !v)}
              >
                {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            <div>
              <div className={`px-4 mb-2 text-[10px] uppercase tracking-[0.24em] text-foreground/60 font-black ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                Main Menu
              </div>
              <ul className="space-y-2">
                <li>
                  <Link
                    className={navItemClass("/dashboard")}
                    href="/dashboard"
                    onClick={() => setSidebarOpen(false)}
                    title="Dashboard"
                  >
                    <span className={linkIconBadgeClass("/dashboard", "primary")}>
                      <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className={`flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>Dashboard</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className={`px-4 mb-2 text-[10px] uppercase tracking-[0.24em] text-foreground/60 font-black ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                Operations
              </div>
              <ul className="space-y-2">
                <li>
                  <details open className="group">
                    <summary
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-foreground/70 hover:bg-default cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        sidebarCollapsed ? "lg:justify-center lg:px-3 lg:gap-0" : ""
                      }`}
                      title="Input Supervisi"
                      onClick={() => {
                        if (sidebarCollapsed) setSidebarCollapsed(false);
                      }}
                    >
                      <span className={iconBadgeClass(false, "secondary")}>
                        <ClipboardPenLine aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className={`flex-1 font-semibold ${sidebarCollapsed ? "lg:hidden" : ""}`}>Input Supervisi</span>
                      <ChevronDown
                        className={`h-4 w-4 opacity-40 transition-transform duration-200 group-open:rotate-180 ${sidebarCollapsed ? "lg:hidden" : ""}`}
                      />
                    </summary>
                    <ul className={`mt-2 ml-8 space-y-2 border-l border-border ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/apd" ? "text-primary font-semibold" : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/input/apd"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground border border-border">
                            <HardHat className="h-4 w-4" />
                          </span>
                          APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/p3k" ? "text-primary font-semibold" : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/input/p3k"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-secondary text-secondary-foreground border border-border">
                            <BriefcaseMedical className="h-4 w-4" />
                          </span>
                          P3K
                        </Link>
                      </li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details open className="group">
                    <summary
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-foreground/70 hover:bg-default cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        sidebarCollapsed ? "lg:justify-center lg:px-3 lg:gap-0" : ""
                      }`}
                      title="Laporan"
                      onClick={() => {
                        if (sidebarCollapsed) setSidebarCollapsed(false);
                      }}
                    >
                      <span className={iconBadgeClass(false, "info")}>
                        <FileText aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className={`flex-1 font-semibold ${sidebarCollapsed ? "lg:hidden" : ""}`}>Laporan</span>
                      <ChevronDown
                        className={`h-4 w-4 opacity-40 transition-transform duration-200 group-open:rotate-180 ${sidebarCollapsed ? "lg:hidden" : ""}`}
                      />
                    </summary>
                    <ul className={`mt-2 ml-8 space-y-2 border-l border-border ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/laporan/apd" ? "text-primary font-semibold" : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/laporan/apd"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-accent text-accent-foreground border border-border">
                            <HardHat className="h-4 w-4" />
                          </span>
                          APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/laporan/p3k" ? "text-primary font-semibold" : "text-foreground/60 hover:text-primary"
                          }`}
                          href="/laporan/p3k"
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span aria-hidden="true" className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-accent text-accent-foreground border border-border">
                            <BriefcaseMedical className="h-4 w-4" />
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
              <div className={`px-4 mb-2 text-[10px] uppercase tracking-[0.24em] text-foreground/60 font-black ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                Master
              </div>
              <ul className="space-y-2">
                <li>
                  <Link className={navItemClass("/master/users")} href="/master/users" onClick={() => setSidebarOpen(false)} title="Data User">
                    <span className={linkIconBadgeClass("/master/users", "primary")}>
                      <Users aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className={`flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>Data User</span>
                  </Link>
                </li>
                <li>
                  <Link className={navItemClass("/master/klinik")} href="/master/klinik" onClick={() => setSidebarOpen(false)} title="Data Klinik">
                    <span className={linkIconBadgeClass("/master/klinik", "secondary")}>
                      <Building2 aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className={`flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>Data Klinik</span>
                  </Link>
                </li>
                <li>
                  <Link className={navItemClass("/master/upt")} href="/master/upt" onClick={() => setSidebarOpen(false)} title="Data UPT">
                    <span className={linkIconBadgeClass("/master/upt", "success")}>
                      <MapPinned aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className={`flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>Data UPT</span>
                  </Link>
                </li>
                <li>
                  <Link className={navItemClass("/master/import")} href="/master/import" onClick={() => setSidebarOpen(false)} title="Import CSV">
                    <span className={linkIconBadgeClass("/master/import", "info")}>
                      <Upload aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className={`flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>Import CSV</span>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="rounded-3xl border border-border bg-surface p-4">
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
                <div className="h-9 w-9 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center border border-border">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest text-primary ${sidebarCollapsed ? "lg:hidden" : ""}`}>System Online</span>
              </div>
              <p className={`mt-2 text-[10px] text-foreground/70 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                Monitoring APD &amp; P3K secara real-time untuk kepatuhan K3.
              </p>
            </div>

            <div className="mt-3">
              <LogoutButton className={`button button--outline w-full justify-start gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
                <span className={iconBadgeClass(false, "primary")}>
                  <LogOut aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className={`font-semibold ${sidebarCollapsed ? "lg:hidden" : ""}`}>Logout</span>
              </LogoutButton>
            </div>
          </div>
        </aside>

        <div className={`flex min-h-screen flex-1 flex-col bg-background ${mainOffsetClass}`}>
          <header className="px-4 py-3 lg:px-6 border-b border-border bg-surface">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="button button--ghost button--icon-only lg:hidden"
                  aria-label="Buka menu"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div className="hidden lg:block">
                  <h1 className="text-xl font-black tracking-tight">
                    <span className="text-primary">Supervisi</span>
                    <span className="ml-2 text-sm font-semibold text-foreground/60">APD &amp; P3K</span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end text-right mr-2">
                  <span className="text-sm font-semibold leading-none text-foreground">{name}</span>
                  <span className="text-[10px] uppercase tracking-wider mt-1 font-bold text-foreground/60">
                    {roleLabel} {wilayah}
                  </span>
                </div>
                <details className="relative">
                  <summary role="button" aria-label="Buka menu akun" className="list-none button button--ghost button--icon-only">
                    <span className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center border border-border">
                      <span className="text-sm font-bold">{initials}</span>
                    </span>
                  </summary>
                  <div className="absolute right-0 mt-3 w-64 rounded-3xl border border-border bg-surface shadow-2xl z-50 p-3">
                    <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-foreground/60">Account</div>
                    <div className="px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{name}</span>
                        <span className="text-xs text-foreground/60">@{user.username}</span>
                      </div>
                    </div>
                    <div className="my-2 h-px bg-border" />
                    <LogoutButton />
                  </div>
                </details>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>

          <footer className="p-4 text-center text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-bold">
            &copy; 2026 KAI Supervisi
          </footer>
        </div>
      </div>
    </div>
  );
}
