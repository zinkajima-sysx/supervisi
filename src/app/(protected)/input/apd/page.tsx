"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { APD_STATUS_OPTIONS } from "@/lib/options";
import { useToast } from "@/components/ToastProvider";

type ApiRowsResponse = { rows: Record<string, string>[] };

type KlinikOption = { id: string; label: string };

function pick(row: Record<string, string>, keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

type ApdField = { key: string; label: string };
type ApdGroup = { title: string; fields: ApdField[] };

const APD_GROUPS: ApdGroup[] = [
  {
    title: "Alat Pelindung Kepala",
    fields: [
      { key: "helemet_type_general_g", label: "Helmet Tipe General (G)" },
      { key: "helemet_type_electric_e", label: "Helmet Tipe Electric (E)" },
      { key: "helemet_type_conductive_c", label: "Helmet Tipe Conductive (C)" },
    ],
  },
  {
    title: "Alat Pelindung Mata",
    fields: [
      { key: "safety_spectales", label: "Safety Spectacles" },
      { key: "safety_goggles", label: "Safety Goggles" },
    ],
  },
  {
    title: "Alat Pelindung Telinga",
    fields: [
      { key: "ear_plug", label: "Ear Plug" },
      { key: "ear_muff", label: "Ear Muff" },
    ],
  },
  {
    title: "Alat Pelindung Pernafasan",
    fields: [
      { key: "masker", label: "Masker" },
      { key: "respirator", label: "Respirator" },
    ],
  },
  { title: "Alat Pelindung Badan", fields: [{ key: "apron", label: "Apron" }] },
  {
    title: "Alat Pelindung Tangan",
    fields: [
      { key: "sarung_tangan_katun", label: "Sarung Tangan Katun" },
      { key: "sarung_tangan_kulit", label: "Sarung Tangan Kulit" },
      { key: "sarung_tangan_karet", label: "Sarung Tangan Karet" },
      { key: "sarung_tangan_electrical", label: "Sarung Tangan Electrical" },
    ],
  },
  {
    title: "Alat Pelindung Kaki",
    fields: [{ key: "sepatu_pelindung", label: "Sepatu Pelindung" }],
  },
];

export default function InputApdPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [uptRows, setUptRows] = useState<Record<string, string>[]>([]);
  const [klinikOptions, setKlinikOptions] = useState<KlinikOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(
    null
  );

  const isKepalaKlinik = useMemo(
    () => (session?.user?.role ?? "").toUpperCase() === "KEPALA_KLINIK",
    [session?.user?.role]
  );

  const wilayahKerja = useMemo(() => (session?.user?.wilayahKerja ?? "").trim(), [session?.user?.wilayahKerja]);

  const matchedKlinik = useMemo(() => {
    if (!wilayahKerja) return null;
    if (wilayahKerja.toUpperCase() === "ALL") return null;
    return klinikOptions.find((k) => k.label.toLowerCase() === wilayahKerja.toLowerCase()) ?? null;
  }, [wilayahKerja, klinikOptions]);

  const isScopedKlinik = useMemo(() => isKepalaKlinik && !!matchedKlinik, [isKepalaKlinik, matchedKlinik]);

  const [tanggal, setTanggal] = useState("");
  const [idKlinik, setIdKlinik] = useState("");
  const [daop, setDaop] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [upt, setUpt] = useState("");
  const [apdLainnya, setApdLainnya] = useState("");
  const [kodisiApdLainnya, setKodisiApdLainnya] = useState("");
  const [catatan, setCatatan] = useState("");
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
    if (!isScopedKlinik) return;
    if (matchedKlinik) setIdKlinik(matchedKlinik.id);
  }, [isScopedKlinik, matchedKlinik]);

  useEffect(() => {
    setDaop("DAOP 2 BANDUNG");
  }, []);

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
      form.set("apd_lainnya", apdLainnya);
      form.set("kodisi_apd_lainnya", kodisiApdLainnya);
      form.set("catatan", catatan);
      for (const group of APD_GROUPS) {
        for (const field of group.fields) {
          form.set(field.key, items[field.key] ?? "");
        }
      }
      if (file) form.set("file", file);

      const res = await fetch("/api/supervisi/apd", { method: "POST", body: form });
      if (!res.ok) {
        setAlert({ type: "error", msg: "Gagal menyimpan data APD." });
        toast.error("Gagal menyimpan data APD.", "Gagal");
        return;
      }
      setAlert({ type: "success", msg: "Berhasil menyimpan data APD." });
      toast.success("Berhasil menyimpan data APD.", "Sukses");
      setIdKlinik("");
      setUpt("");
      setUnitKerja("");
      setCatatan("");
      setApdLainnya("");
      setKodisiApdLainnya("");
      setItems({});
      setFile(null);
    } catch {
      setAlert({ type: "error", msg: "Terjadi error saat submit." });
      toast.error("Terjadi error saat submit.", "Gagal");
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
            Supervisi APD
          </h1>
          <p className="text-sm font-medium text-base-content/50 max-w-md">
            Dokumentasikan kondisi Alat Pelindung Diri sesuai standar K3 untuk memastikan keselamatan operasional.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border-primary/10">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary/80">
              {isScopedKlinik ? "Klinik Terkunci" : "Mode ALL"}
            </span>
            {isScopedKlinik && wilayahKerja && (
              <>
                <div className="h-4 w-[1px] bg-base-content/10"></div>
                <span className="text-xs font-black opacity-60">{wilayahKerja}</span>
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
              
              {/* Primary Context */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-bold">Informasi Lokasi</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Tanggal Inspeksi</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="date"
                        className="input w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl pl-10"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        required
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-5 w-5 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Klinik</span>
                    </label>
                    <select
                      className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                      value={idKlinik}
                      onChange={(e) => setIdKlinik(e.target.value)}
                      disabled={isKepalaKlinik}
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

                  <div className="form-control md:col-span-2">
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

              {/* APD Inventory */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-kereta-orange rounded-full"></div>
                  <h3 className="text-lg font-bold">Status Perlengkapan</h3>
                </div>

                <div className="space-y-6">
                  {APD_GROUPS.map((group) => (
                    <div key={group.title} className="rounded-3xl border border-base-content/5 bg-base-200/30 p-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/45">
                        {group.title}
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {group.fields.map((field) => (
                          <div key={field.key} className="form-control">
                            <label className="label px-1">
                              <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">
                                {field.label}
                              </span>
                            </label>
                            <select
                              className="select w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                              value={items[field.key] ?? ""}
                              onChange={(e) =>
                                setItems((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              required
                            >
                              <option value="" disabled>
                                Pilih status
                              </option>
                              {APD_STATUS_OPTIONS.map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="h-px bg-gradient-to-r from-transparent via-base-content/5 to-transparent"></div>

              {/* Documentation */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-lg font-bold">Catatan & Dokumentasi</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label px-1">
                        <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">APD Lainnya</span>
                      </label>
                      <input
                        className="input w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                        value={apdLainnya}
                        onChange={(e) => setApdLainnya(e.target.value)}
                        placeholder="Contoh: Jas hujan…"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label px-1">
                        <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Kondisi APD Lainnya</span>
                      </label>
                      <input
                        className="input w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-xl"
                        value={kodisiApdLainnya}
                        onChange={(e) => setKodisiApdLainnya(e.target.value)}
                        placeholder="Contoh: Sesuai standar…"
                      />
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Catatan Tambahan</span>
                    </label>
                    <textarea
                      className="textarea w-full bg-base-200/50 border-base-content/5 focus:border-primary/30 focus:bg-base-100 transition-all rounded-2xl min-h-[120px]"
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Masukkan catatan temuan atau detail tambahan..."
                    />
                  </div>

                  <div className="form-control">
                    <label className="label px-1">
                      <span className="label-text font-black text-primary/80 uppercase text-[10px] tracking-widest">Foto Dokumentasi</span>
                    </label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-base-content/10 rounded-2xl p-8 hover:bg-base-200/50 transition-all cursor-pointer relative">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold">{file ? file.name : "Klik atau seret foto ke sini"}</p>
                          <p className="text-xs opacity-50 mt-1">Format: JPG, PNG, WEBP (Maks. 5MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-between pt-4">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-30">
                  Semua data akan diverifikasi oleh auditor
                </div>
                <button 
                  className={`btn btn-primary rounded-xl px-10 font-bold shadow-lg shadow-primary/20 ${isSubmitting ? 'loading' : ''}`} 
                  disabled={isSubmitting} 
                  type="submit"
                >
                  {isSubmitting ? "Memproses..." : "Submit Supervisi"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar Guidelines */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] opacity-40">Panduan Pengisian</h4>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                <p className="text-sm opacity-70 leading-relaxed">
                  Pilih <span className="font-bold text-base-content">Tanggal</span> dan <span className="font-bold text-base-content">UPT</span> tempat dilakukannya supervisi.
                </p>
              </li>
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                <p className="text-sm opacity-70 leading-relaxed">
                  Periksa kondisi fisik APD, pastikan tidak ada kerusakan yang membahayakan.
                </p>
              </li>
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                <p className="text-sm opacity-70 leading-relaxed">
                  Unggah <span className="font-bold text-base-content">Foto</span> jika terdapat temuan khusus atau untuk bukti dokumentasi.
                </p>
              </li>
            </ul>
          </div>

          <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-bold text-sm tracking-tight">Butuh Bantuan?</span>
            </div>
            <p className="text-xs opacity-60 leading-relaxed">
              Jika terjadi kendala teknis saat penginputan, hubungi tim IT Support Unit Kesehatan Kerja di wilayah masing-masing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
