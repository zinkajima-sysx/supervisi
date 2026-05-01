import Link from "next/link";
import { Building2, MapPinned, Upload, Users } from "lucide-react";

export default function MasterHomePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-base-content">
          Data Master
        </h1>
        <p className="text-sm md:text-base text-base-content/60 font-medium max-w-2xl">
          Kelola data referensi (User, Klinik, UPT) dan lakukan import CSV (APD/P3K) dengan parsing multi-index.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <Link
          href="/master/users"
          className="glass-card col-span-12 md:col-span-6 lg:col-span-4 p-6 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="h-12 w-12 rounded-3xl bg-primary/10 border border-primary/10 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div className="mt-5 text-lg font-black tracking-tight text-base-content">Data User</div>
          <div className="mt-1 text-sm font-medium text-base-content/60">
            Akun &amp; role pengguna aplikasi.
          </div>
        </Link>

        <Link
          href="/master/klinik"
          className="glass-card col-span-12 md:col-span-6 lg:col-span-4 p-6 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="h-12 w-12 rounded-3xl bg-secondary/10 border border-secondary/10 text-secondary flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="mt-5 text-lg font-black tracking-tight text-base-content">Data Klinik</div>
          <div className="mt-1 text-sm font-medium text-base-content/60">
            Master klinik Mediska &amp; kepala klinik.
          </div>
        </Link>

        <Link
          href="/master/upt"
          className="glass-card col-span-12 md:col-span-6 lg:col-span-4 p-6 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="h-12 w-12 rounded-3xl bg-success/10 border border-success/10 text-success flex items-center justify-center">
            <MapPinned className="h-6 w-6" />
          </div>
          <div className="mt-5 text-lg font-black tracking-tight text-base-content">Data UPT</div>
          <div className="mt-1 text-sm font-medium text-base-content/60">
            DAOP, unit kerja, UPT, kategori, dan mapping klinik.
          </div>
        </Link>

        <Link
          href="/master/import"
          className="glass-card col-span-12 lg:col-span-12 p-6 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-3xl bg-base-200/60 border border-base-content/10 text-base-content flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black tracking-tight text-base-content">Import CSV (APD / P3K)</div>
              <div className="mt-1 text-sm font-medium text-base-content/60">
                Upload file CSV hasil export Excel (merged header), preview hasil parsing, lalu simpan ke Google Sheet.
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
