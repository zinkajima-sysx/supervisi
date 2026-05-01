"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseMedical,
  Building2,
  ChevronDown,
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

  const navItemClass = (href: string) =>
    `group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
      pathname === href
        ? "bg-primary text-primary-content shadow-lg shadow-primary/15 font-semibold"
        : "text-base-content/80 hover:bg-base-200/60 hover:text-base-content"
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
    <div className="drawer lg:drawer-open font-sans">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen flex-col bg-slate-50">
        <header className="glass-navbar px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="app-drawer" className="btn btn-ghost btn-circle lg:hidden" aria-label="Buka menu">
                <Menu className="h-6 w-6" />
              </label>
              <div className="hidden lg:block">
                <h1 className="text-xl font-black tracking-tight">
                  <span className="text-primary">Supervisi</span>
                  <span className="ml-2 text-sm font-semibold text-base-content/50">APD &amp; P3K</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end text-right mr-2">
                <span className="text-sm font-semibold leading-none text-base-content">{name}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60 mt-1 font-bold text-base-content/55">
                  {roleLabel} {wilayah}
                </span>
              </div>
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  aria-label="Buka menu akun"
                  className="btn btn-ghost btn-circle avatar border border-slate-200 p-0.5"
                >
                  <div className="w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="text-sm font-bold">{name.trim().slice(0, 2).toUpperCase()}</span>
                  </div>
                </div>
                <ul tabIndex={0} className="dropdown-content menu glass-panel mt-3 w-64 p-3 rounded-3xl shadow-2xl z-50">
                  <li className="menu-title px-4 py-2 opacity-50 text-[10px] uppercase tracking-widest font-bold">Account</li>
                  <li className="px-4 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-base-content">{name}</span>
                      <span className="text-xs text-base-content/60">@{user.username}</span>
                    </div>
                  </li>
                  <div className="divider my-2" />
                  <li>
                    <LogoutButton />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <footer className="p-4 text-center text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold text-slate-500">
          &copy; 2026 KAI Supervisi
        </footer>
      </div>

      <div className="drawer-side z-[60]">
        <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <aside className="w-72 min-h-full border-r border-slate-200/70 bg-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-primary/10 p-3 border border-primary/10">
                <LogoChecklist className="w-8 h-8 text-primary" />
              </div>
              <div>
                <div className="font-black text-lg uppercase tracking-tight text-slate-900">KAI Supervisi</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mt-1">Internal Dashboard</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            <div>
              <div className="px-4 mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Main Menu</div>
              <ul className="space-y-2">
                <li>
                  <Link className={navItemClass("/dashboard")} href="/dashboard">
                    <span className={linkIconBadgeClass("/dashboard", "primary")}>
                      <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex-1">Dashboard</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="px-4 mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Operations</div>
              <ul className="space-y-2">
                <li>
                  <details open className="group">
                    <summary className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base-content/70 hover:bg-base-200/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                      <span className={iconBadgeClass(false, "secondary")}>
                        <ClipboardPenLine aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="flex-1 font-semibold">Input Supervisi</span>
                      <ChevronDown className="h-4 w-4 opacity-40 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <ul className="mt-2 ml-8 space-y-2 border-l border-slate-200">
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/apd"
                              ? "text-primary font-semibold"
                              : "text-base-content/60 hover:text-primary"
                          }`}
                          href="/input/apd"
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/10"
                          >
                            <HardHat className="h-4 w-4" />
                          </span>
                          APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/input/p3k"
                              ? "text-primary font-semibold"
                              : "text-base-content/60 hover:text-primary"
                          }`}
                          href="/input/p3k"
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/10"
                          >
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
                    <summary className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base-content/70 hover:bg-base-200/60 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                      <span className={iconBadgeClass(false, "info")}>
                        <FileText aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="flex-1 font-semibold">Laporan</span>
                      <ChevronDown className="h-4 w-4 opacity-40 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <ul className="mt-2 ml-8 space-y-2 border-l border-slate-200">
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/laporan/apd"
                              ? "text-primary font-semibold"
                              : "text-base-content/60 hover:text-primary"
                          }`}
                          href="/laporan/apd"
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-info/10 text-info border border-info/10"
                          >
                            <HardHat className="h-4 w-4" />
                          </span>
                          APD
                        </Link>
                      </li>
                      <li>
                        <Link
                          className={`block rounded-2xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            pathname === "/laporan/p3k"
                              ? "text-primary font-semibold"
                              : "text-base-content/60 hover:text-primary"
                          }`}
                          href="/laporan/p3k"
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-success/10 text-success border border-success/10"
                          >
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
              <div className="px-4 mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Master</div>
              <ul className="space-y-2">
                <li>
                  <Link className={navItemClass("/master/users")} href="/master/users">
                    <span className={linkIconBadgeClass("/master/users", "primary")}>
                      <Users aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex-1">Data User</span>
                  </Link>
                </li>
                <li>
                  <Link className={navItemClass("/master/klinik")} href="/master/klinik">
                    <span className={linkIconBadgeClass("/master/klinik", "secondary")}>
                      <Building2 aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex-1">Data Klinik</span>
                  </Link>
                </li>
                <li>
                  <Link className={navItemClass("/master/upt")} href="/master/upt">
                    <span className={linkIconBadgeClass("/master/upt", "success")}>
                      <MapPinned aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex-1">Data UPT</span>
                  </Link>
                </li>
                <li>
                  <Link className={navItemClass("/master/import")} href="/master/import">
                    <span className={linkIconBadgeClass("/master/import", "info")}>
                      <Upload aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex-1">Import CSV</span>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-200/70">
            <div className="brand-panel p-4 rounded-3xl bg-primary/5 border-primary/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/10">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">System Online</span>
              </div>
              <p className="mt-2 text-[10px] opacity-70">Monitoring APD &amp; P3K secara real-time untuk kepatuhan K3.</p>
            </div>

            <div className="mt-3">
              <LogoutButton className="btn btn-outline w-full rounded-2xl justify-start gap-3">
                <span className={iconBadgeClass(false, "primary")}>
                  <LogOut aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="font-semibold">Logout</span>
              </LogoutButton>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
