"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import {
  KELAS_KOTAK_OPTIONS,
  KONDISI_KOTAK_OPTIONS,
  P3K_ITEM_OPTIONS,
} from "@/lib/options";
import { uploadImageToCloudinary } from "@/lib/uploadImage";
import { useToast } from "@/components/ToastProvider";

type ApiRowsResponse = { rows: Record<string, string>[] };
type StatusResponse = { belum: string[]; sudah: string[]; semester: number; year: number };

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
  { key: "perban_1.2cm", label: "Perban 1,2 cm" },
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
  const toast = useToast();
  const [uptRows, setUptRows] = useState<Record<string, string>[]>([]);
  const [klinikOptions, setKlinikOptions] = useState<KlinikOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  const isKepala = useMemo(
    () => {
      const r = (session?.user?.role ?? "").toUpperCase();
      return r === "KEPALA_KLINIK" || r === "DOKTER_FUNGSIONAL";
    },
    [session?.user?.role]
  );

  const wilayahKerja = useMemo(() => (session?.user?.wilayahKerja ?? "").trim(), [session?.user?.wilayahKerja]);

  const matchedKlinik = useMemo(() => {
    if (!wilayahKerja) return null;
    if (wilayahKerja.toUpperCase() === "ALL") return null;
    return klinikOptions.find((k) => k.label.toLowerCase() === wilayahKerja.toLowerCase()) ?? null;
  }, [wilayahKerja, klinikOptions]);

  const isScopedKlinik = useMemo(() => isKepala && !!matchedKlinik, [isKepala, matchedKlinik]);

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
  const [uptSudah, setUptSudah] = useState<Set<string>>(new Set());

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
    if (!isScopedKlinik) return;
    if (matchedKlinik) setIdKlinik(matchedKlinik.id);
  }, [isScopedKlinik, matchedKlinik]);

  useEffect(() => {
    setDaop("DAOP 2 BANDUNG");
  }, []);

  // Fetch UPT yang sudah disupervisi semester ini (hanya untuk role terbatas)
  useEffect(() => {
    if (!isKepala) return;
    let cancelled = false;
    const now = new Date();
    const semester = now.getMonth() < 6 ? 1 : 2;
    const year = now.getFullYear();
    fetch(`/api/supervisi/status?type=p3k&year=${year}&semester=${semester}`)
      .then((r) => r.json())
      .then((data: StatusResponse) => {
        if (cancelled) return;
        setUptSudah(new Set(data.sudah ?? []));
      })
      .catch(() => { if (!cancelled) setUptSudah(new Set()); });
    return () => { cancelled = true; };
  }, [isKepala]);

  const visibleUptRows = useMemo(() => {
    if (!isScopedKlinik) return uptRows;
    const wilayah = wilayahKerja.trim().toLowerCase();
    if (!wilayah) return uptRows;
    return uptRows.filter((r) => pick(r, ["klinik"]).toLowerCase() === wilayah);
  }, [isScopedKlinik, wilayahKerja, uptRows]);

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
    // Untuk KEPALA_KLINIK: sembunyikan UPT yang sudah disupervisi semester ini
    return Array.from(s)
      .filter((u) => !isKepala || !uptSudah.has(u))
      .sort();
  }, [visibleUptRows, unitKerja, isKepala, uptSudah]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);
    setIsSubmitting(true);
    try {
      // Step 1: Upload foto langsung dari browser ke Cloudinary (jika ada)
      let foto_url = "";
      if (file) {
        try {
          foto_url = await uploadImageToCloudinary(file, "p3k");
        } catch (uploadErr) {
          console.warn("[P3K] Client-side upload gagal, lanjut tanpa foto:", uploadErr);
        }
      }

      // Step 2: Kirim data form + foto_url ke API (tanpa file binary)
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
      form.set("foto_url", foto_url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      let res: Response;
      try {
        res = await fetch("/api/supervisi/p3k", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        let errMsg = "Gagal menyimpan data P3K.";
        try {
          const errData = await res.json() as { error?: string };
          if (errData?.error) errMsg = errData.error;
        } catch { /* ignore */ }
        setAlert({ type: "error", msg: errMsg });
        toast.error(errMsg, "Gagal");
        return;
      }

      setAlert({ type: "success", msg: "Berhasil menyimpan data P3K." });
      toast.success("Berhasil menyimpan data P3K.", "Sukses");
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
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError"
        ? "Request timeout — koneksi terlalu lambat. Coba lagi."
        : "Terjadi error saat submit.";
      setAlert({ type: "error", msg });
      toast.error(msg, "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Supervisi P3K</h1>
          <p className="text-sm font-medium text-foreground/70 max-w-md">
            Audit ketersediaan dan kelayakan Kotak P3K di setiap unit kerja untuk menjamin kesiapsiagaan medis.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl flex items-center gap-3 border border-border bg-surface shadow">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {isScopedKlinik ? "Klinik Terkunci" : "Mode ALL"}
            </span>
            {isScopedKlinik && wilayahKerja && (
              <>
                <div className="h-4 w-[1px] bg-border"></div>
                <span className="text-xs font-black text-foreground/70">{wilayahKerja}</span>
              </>
            )}
          </div>
          {isKepala && (
            <div className="px-4 py-2 rounded-2xl flex items-center gap-3 border border-border bg-surface shadow">
              <div className="h-2 w-2 rounded-full bg-warning"></div>
              <span className="text-xs font-bold text-foreground/70">
                Semester ini: <span className="text-success font-black">{uptSudah.size} selesai</span>
                {daftarUpt.length > 0 && (
                  <span className="text-warning font-black ml-1">· {daftarUpt.length} belum</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {alert && (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
            alert.type === "success"
              ? "bg-success text-success-content border-success"
              : "bg-error text-error-content border-error"
          } animate-in slide-in-from-top duration-300`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={alert.type === "success" ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
          </svg>
          <span className="font-semibold text-sm">{alert.msg}</span>
          <button onClick={() => setAlert(null)} className="button button--ghost button--icon-only button--sm rounded-full">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form Content */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-surface shadow-xl overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-primary/20 via-transparent to-kereta-orange/20"></div>
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Step 1: Location & Context */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-bold">Informasi Lokasi & Unit</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Tanggal Supervisi
                    </label>
                    <input
                      type="date"
                      className="input w-full rounded-xl px-4"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Klinik
                    </label>
                    <select
                      className="input w-full h-12 rounded-xl px-3"
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

                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      DAOP
                    </label>
                    <input
                      className="input w-full rounded-xl px-4"
                      value="DAOP 2 BANDUNG"
                      disabled
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Unit Kerja
                    </label>
                    <select
                      className="input w-full h-12 rounded-xl px-3"
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

                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      UPT
                    </label>
                    <select
                      className="input w-full h-12 rounded-xl px-3"
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
                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Kelas Kotak P3K
                    </label>
                    <select
                      className="input w-full h-12 rounded-xl px-3"
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

                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Kondisi Fisik Kotak
                    </label>
                    <select
                      className="input w-full h-12 rounded-xl px-3"
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
                    <div key={item.key}>
                      <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                        {item.label}
                      </label>
                      <select
                        className={`input w-full h-12 rounded-xl px-3 ${
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
                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Kesimpulan Supervisi
                    </label>
                    <select
                      className={`input w-full h-12 rounded-xl px-3 ${
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

                  <div>
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Foto Kotak P3K
                    </label>
                    <input
                      type="file"
                      className="block w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Keterangan Tambahan
                    </label>
                    <textarea
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm min-h-[80px]"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Detail kondisi item atau catatan khusus..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-foreground/60">
                      Rencana Tindak Lanjut
                    </label>
                    <textarea
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm min-h-[80px]"
                      value={tindakLanjut}
                      onChange={(e) => setTindakLanjut(e.target.value)}
                      placeholder="Langkah perbaikan untuk item yang tidak lengkap..."
                    />
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end pt-6">
                <button
                  className="button button--primary button--lg rounded-xl px-12 font-bold"
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
          <div className="rounded-3xl border border-border bg-surface shadow-xl p-6 space-y-6">
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

            <div className="h-px bg-border opacity-50"></div>

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

          <div className="p-6 rounded-3xl border border-border bg-surface shadow">
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
