"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import {
  KELAS_KOTAK_OPTIONS,
  KONDISI_KOTAK_OPTIONS,
  P3K_ITEM_OPTIONS,
} from "@/lib/options";

type ApiRowsResponse = { rows: Record<string, string>[] };

type KlinikOption = { id: string; label: string };

function pick(row: Record<string, string>, keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const P3K_ITEMS: Array<{ key: string; label: string }> = [
  { key: "kasa_steril", label: "Kasa Steril" },
  { key: "perban_5cm", label: "Perban 5 cm" },
  { key: "perban_10cm", label: "Perban 10 cm" },
  { key: "perban_1,2cm", label: "Perban 1,2 cm" },
  { key: "plester_cepat", label: "Plester Cepat" },
  { key: "kapas_25gram", label: "Kapas 25 gram" },
  { key: "kain_mitela", label: "Kain Mitela" },
  { key: "gunting", label: "Gunting" },
  { key: "peniti", label: "Peniti" },
  { key: "sarung_tangan_disposible", label: "Sarung Tangan Disposable" },
  { key: "bidai", label: "Bidai" },
  { key: "masker", label: "Masker" },
  { key: "pinset", label: "Pinset" },
  { key: "lampu_senter", label: "Lampu Senter" },
  { key: "gelas_cucimata", label: "Gelas Cuci Mata" },
  { key: "kantong_plastik_bersih", label: "Kantong Plastik Bersih" },
  { key: "aquades_100ml", label: "Aquades 100 ml" },
  { key: "betadine_60ml", label: "Betadine 60 ml" },
  { key: "alkohol_70", label: "Alkohol 70%" },
  { key: "buku_panduan_p3k", label: "Buku Panduan P3K" },
  { key: "buku_catatan", label: "Buku Catatan" },
  { key: "buku_daftar_isikotak", label: "Buku Daftar Isi Kotak" },
];

export default function InputP3kPage() {
  const { data: session } = useSession();
  const [uptRows, setUptRows] = useState<Record<string, string>[]>([]);
  const [klinikOptions, setKlinikOptions] = useState<KlinikOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  const isKepala = useMemo(
    () => (session?.user?.role ?? "").toUpperCase() === "KEPALA_KLINIK",
    [session?.user?.role]
  );

  const [tanggal, setTanggal] = useState("");
  const [idKlinik, setIdKlinik] = useState("");
  const [daop, setDaop] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [upt, setUpt] = useState("");
  const [kelasKotak, setKelasKotak] = useState("");
  const [kondisiKotak, setKondisiKotak] = useState("");
  const [hasilPemeriksaan, setHasilPemeriksaan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tindakLanjut, setTindakLanjut] = useState("");
  const [items, setItems] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/master/upt"), fetch("/api/master/klinik")])
      .then(async ([uptRes, klinikRes]) => {
        const uptData = (await uptRes.json()) as ApiRowsResponse;
        const klinikData = (await klinikRes.json()) as ApiRowsResponse;
        if (cancelled) return;
        setUptRows(uptData.rows ?? []);
        const options = (klinikData.rows ?? [])
          .map((r) => ({
            id: pick(r, ["id_klinik", "id"]),
            label: pick(r, ["klinik"]),
          }))
          .filter((x) => x.id && x.label)
          .sort((a, b) => a.label.localeCompare(b.label));
        setKlinikOptions(options);
      })
      .catch(() => {
        if (cancelled) return;
        setUptRows([]);
        setKlinikOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isKepala) return;
    const wilayah = (session?.user?.wilayahKerja ?? "").trim();
    if (!wilayah) return;
    const found = klinikOptions.find((k) => k.label.toLowerCase() === wilayah.toLowerCase());
    if (found) setIdKlinik(found.id);
  }, [isKepala, session?.user?.wilayahKerja, klinikOptions]);

  useEffect(() => {
    setDaop("DAOP 2 BANDUNG");
  }, []);

  const visibleUptRows = useMemo(() => {
    if (!isKepala) return uptRows;
    const wilayah = (session?.user?.wilayahKerja ?? "").trim().toLowerCase();
    if (!wilayah) return [];
    return uptRows.filter((r) => pick(r, ["klinik"]).toLowerCase() === wilayah);
  }, [isKepala, session?.user?.wilayahKerja, uptRows]);

  const daftarUnitKerja = useMemo(() => {
    const s = new Set<string>();
    for (const r of visibleUptRows) {
      const v = pick(r, ["unit_kerja", "nama_unit_kerja"]);
      if (v) s.add(v);
    }
    return Array.from(s).sort();
  }, [visibleUptRows]);

  const daftarUpt = useMemo(() => {
    const s = new Set<string>();
    for (const r of visibleUptRows) {
      if (unitKerja && pick(r, ["unit_kerja", "nama_unit_kerja"]) !== unitKerja) continue;
      const v = pick(r, ["upt", "nama_upt"]);
      if (v) s.add(v);
    }
    return Array.from(s).sort();
  }, [visibleUptRows, unitKerja]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);
    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.set("tanggal_supervisi", tanggal);
      form.set("id_klinik", idKlinik);
      form.set("daop", daop);
      form.set("unit_kerja", unitKerja);
      form.set("upt", upt);
      form.set("kelas_kotak", kelasKotak);
      for (const item of P3K_ITEMS) {
        form.set(item.key, items[item.key] ?? "");
      }
      form.set("kondisi_kotak_p3k", kondisiKotak);
      form.set("hasil_pemeriksaan", hasilPemeriksaan);
      form.set("keterangan", keterangan);
      form.set("tindak_lanjut", tindakLanjut);
      if (file) form.set("file", file);

      const res = await fetch("/api/supervisi/p3k", { method: "POST", body: form });
      if (!res.ok) {
        setAlert({ type: "error", msg: "Gagal menyimpan data P3K." });
        return;
      }
      setAlert({ type: "success", msg: "Berhasil menyimpan data P3K." });
      setIdKlinik("");
      setUnitKerja("");
      setUpt("");
      setKelasKotak("");
      setKondisiKotak("");
      setHasilPemeriksaan("");
      setKeterangan("");
      setTindakLanjut("");
      setItems({});
      setFile(null);
    } catch {
      setAlert({ type: "error", msg: "Terjadi error saat submit." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60">
            Supervisi P3K
          </h1>
          <p className="text-sm font-medium text-base-content/50 max-w-md">
            Audit ketersediaan dan kelayakan Kotak P3K di setiap unit kerja untuk menjamin kesiapsiagaan medis.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border-primary/10">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary/80">
              {isKepala ? "Klinik Terkunci" : "Mode Admin"}
            </span>
            {isKepala && session?.user?.wilayahKerja && (
              <>
                <div className="h-4 w-[1px] bg-base-content/10"></div>
                <span className="text-xs font-black opacity-60">{session.user.wilayahKerja}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {alert && (
        <div className={`alert glass-panel border-none shadow-lg ${
          alert.type === "success" 
            ? "bg-success/10 text-success" 
            : "bg-error/10 text-error"
        } animate-in slide-in-from-top duration-300`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={alert.type === "success" ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
          </svg>
          <span className="font-semibold text-sm">{alert.msg}</span>
          <button onClick={() => setAlert(null)} className="btn btn-ghost btn-xs btn-circle">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form Content */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={onSubmit} className="glass-card overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-primary/20 via-transparent to-kereta-orange/20"></div>
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Step 1: Location & Context */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-bold">Informasi Lokasi & Unit</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Tanggal Supervisi</span>
                    </label>
                    <input
                      type="date"
                      className="input w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Klinik</span>
                    </label>
                    <select
                      className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={idKlinik}
                      onChange={(e) => setIdKlinik(e.target.value)}
                      disabled={isKepala}
                      required
                    >
                      <option value="" disabled>
                        Pilih Klinik
                      </option>
                      {klinikOptions.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">DAOP</span>
                    </label>
                    <input
                      className="input w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value="DAOP 2 BANDUNG"
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Unit Kerja</span>
                    </label>
                    <select
                      className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={unitKerja}
                      onChange={(e) => {
                        setUnitKerja(e.target.value);
                        setUpt("");
                      }}
                      required
                    >
                      <option value="" disabled>
                        Pilih Unit Kerja
                      </option>
                      {daftarUnitKerja.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">UPT</span>
                    </label>
                    <select
                      className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={upt}
                      onChange={(e) => setUpt(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Pilih UPT
                      </option>
                      {daftarUpt.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-base-content/5 to-transparent"></div>

              {/* Step 2: Box Specification */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-kereta-orange rounded-full"></div>
                  <h3 className="text-lg font-bold">Spesifikasi Kotak</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Kelas Kotak P3K</span>
                    </label>
                    <select
                      className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={kelasKotak}
                      onChange={(e) => setKelasKotak(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Kelas</option>
                      {KELAS_KOTAK_OPTIONS.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Kondisi Fisik Kotak</span>
                    </label>
                    <select
                      className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={kondisiKotak}
                      onChange={(e) => setKondisiKotak(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih kondisi</option>
                      {KONDISI_KOTAK_OPTIONS.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-base-content/5 to-transparent"></div>

              {/* Step 3: Content Inventory */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-lg font-bold">Isi Perlengkapan P3K</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {P3K_ITEMS.map((item) => (
                    <div key={item.key} className="form-control">
                      <label className="label px-1">
                        <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">{item.label}</span>
                      </label>
                      <select
                        className={`select w-full bg-base-200/50 border-base-content/5 focus:bg-base-100 transition-all rounded-xl ${
                          items[item.key] === "LENGKAP" ? "text-success border-success/20" : 
                          items[item.key] === "TIDAK LENGKAP" ? "text-error border-error/20" : ""
                        }`}
                        value={items[item.key] ?? ""}
                        onChange={(e) =>
                          setItems((prev) => ({ ...prev, [item.key]: e.target.value }))
                        }
                        required
                      >
                        <option value="" disabled>Pilih status</option>
                        {P3K_ITEM_OPTIONS.map((x) => (
                          <option key={x} value={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-base-content/5 to-transparent"></div>

              {/* Step 4: Final Results & Docs */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-lg font-bold">Hasil & Dokumentasi</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Kesimpulan Supervisi</span>
                    </label>
                    <select
                      className={`select w-full bg-base-200/50 border-base-content/5 focus:bg-base-100 transition-all rounded-xl ${
                        hasilPemeriksaan === "LENGKAP" ? "bg-success/10 text-success border-success/30 font-bold" :
                        hasilPemeriksaan === "TIDAK LENGKAP" ? "bg-error/10 text-error border-error/30 font-bold" : ""
                      }`}
                      value={hasilPemeriksaan}
                      onChange={(e) => setHasilPemeriksaan(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih hasil</option>
                      {P3K_ITEM_OPTIONS.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Foto Kotak P3K</span>
                    </label>
                    <input
                      type="file"
                      className="file-input file-input-bordered w-full bg-base-200/50 rounded-xl"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="form-control md:col-span-2">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Keterangan Tambahan</span>
                    </label>
                    <textarea
                      className="textarea w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-2xl min-h-[80px]"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Detail kondisi item atau catatan khusus..."
                    />
                  </div>

                  <div className="form-control md:col-span-2">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Rencana Tindak Lanjut</span>
                    </label>
                    <textarea
                      className="textarea w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-2xl min-h-[80px]"
                      value={tindakLanjut}
                      onChange={(e) => setTindakLanjut(e.target.value)}
                      placeholder="Langkah perbaikan untuk item yang tidak lengkap..."
                    />
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end pt-6">
                <button 
                  className={`btn btn-primary rounded-xl px-12 font-bold shadow-lg shadow-primary/20 ${isSubmitting ? 'loading' : ''}`} 
                  disabled={isSubmitting} 
                  type="submit"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Laporan P3K"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div>
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40 mb-4">Statistik Unit</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-60">Total Item Dicek</span>
                  <span className="font-bold">{P3K_ITEMS.length} Item</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-60">Terisi</span>
                  <span className="font-bold text-success">
                    {Object.values(items).filter(v => v === "LENGKAP").length}
                  </span>
                </div>
                <div className="w-full bg-base-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${(Object.values(items).filter(v => v === "LENGKAP").length / P3K_ITEMS.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="divider opacity-5"></div>

            <div>
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40 mb-4">Ketentuan Kelas</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 rounded-xl bg-base-200/50 border border-base-content/5">
                  <span className="text-xs font-bold block mb-1">Kelas A</span>
                  <p className="text-[10px] opacity-60">Untuk tempat kerja dengan jumlah pekerja ≤ 25 orang.</p>
                </div>
                <div className="p-3 rounded-xl bg-base-200/50 border border-base-content/5">
                  <span className="text-xs font-bold block mb-1">Kelas B</span>
                  <p className="text-[10px] opacity-60">Untuk tempat kerja dengan jumlah pekerja 26 - 50 orang.</p>
                </div>
                <div className="p-3 rounded-xl bg-base-200/50 border border-base-content/5">
                  <span className="text-xs font-bold block mb-1">Kelas C</span>
                  <p className="text-[10px] opacity-60">Untuk tempat kerja dengan jumlah pekerja 51 - 100 orang.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl bg-kereta-orange/10 border-kereta-orange/10">
            <h4 className="font-bold text-sm text-kereta-orange mb-2">Penting!</h4>
            <p className="text-[11px] opacity-70 leading-relaxed italic">
              "Ketersediaan alat P3K yang lengkap dapat menyelamatkan nyawa pada menit-menit kritis pertama saat terjadi kecelakaan kerja."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
