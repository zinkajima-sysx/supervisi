import { getServerSession } from "next-auth";
import Link from "next/link";
import { Building2, MapPinned, Upload, Users } from "lucide-react";

import { authOptions } from "@/auth";

const SCOPED_ROLES = new Set(["KEPALA_KLINIK", "DOKTER_FUNGSIONAL"]);

export default async function MasterHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user?.role ?? "").toUpperCase();
  const isScoped = SCOPED_ROLES.has(role);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
          Data Master
        </h1>
        <p className="text-sm md:text-base text-foreground/70 font-medium max-w-2xl">
          {isScoped
            ? "Kelola data UPT untuk klinik Anda."
            : "Kelola data referensi (User, Klinik, UPT) dan lakukan import CSV (APD/P3K)."}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Data User — hanya ADMIN, MANAGER, ASMEN */}
        {!isScoped && (
          <Link
            href="/master/users"
            className="col-span-12 md:col-span-6 lg:col-span-4 p-6 rounded-3xl border border-border bg-surface shadow-xl hover:bg-base-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="h-12 w-12 rounded-3xl bg-primary border border-border text-primary-content flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div className="mt-5 text-lg font-black tracking-tight text-foreground">Data User</div>
            <div className="mt-1 text-sm font-medium text-foreground/70">
              Akun &amp; role pengguna aplikasi.
            </div>
          </Link>
        )}

        {/* Data Klinik — hanya ADMIN, MANAGER, ASMEN */}
        {!isScoped && (
          <Link
            href="/master/klinik"
            className="col-span-12 md:col-span-6 lg:col-span-4 p-6 rounded-3xl border border-border bg-surface shadow-xl hover:bg-base-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="h-12 w-12 rounded-3xl bg-secondary border border-border text-secondary-content flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="mt-5 text-lg font-black tracking-tight text-foreground">Data Klinik</div>
            <div className="mt-1 text-sm font-medium text-foreground/70">
              Master klinik Mediska &amp; kepala klinik.
            </div>
          </Link>
        )}

        {/* Data UPT — semua role */}
        <Link
          href="/master/upt"
          className="col-span-12 md:col-span-6 lg:col-span-4 p-6 rounded-3xl border border-border bg-surface shadow-xl hover:bg-base-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="h-12 w-12 rounded-3xl bg-success border border-border text-success-content flex items-center justify-center">
            <MapPinned className="h-6 w-6" />
          </div>
          <div className="mt-5 text-lg font-black tracking-tight text-foreground">Data UPT</div>
          <div className="mt-1 text-sm font-medium text-foreground/70">
            {isScoped
              ? "Kelola UPT untuk klinik Anda."
              : "DAOP, unit kerja, UPT, kategori, dan mapping klinik."}
          </div>
        </Link>

        {/* Import CSV — hanya ADMIN, MANAGER, ASMEN */}
        {!isScoped && (
          <Link
            href="/master/import"
            className="col-span-12 p-6 rounded-3xl border border-border bg-surface shadow-xl hover:bg-base-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-3xl bg-base-200 border border-border text-foreground flex items-center justify-center">
                <Upload className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black tracking-tight text-foreground">Import CSV (APD / P3K)</div>
                <div className="mt-1 text-sm font-medium text-foreground/70">
                  Upload file CSV hasil export Excel (merged header), preview hasil parsing, lalu simpan ke Google Sheet.
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
