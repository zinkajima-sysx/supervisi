"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";

import LogoChecklist from "@/components/LogoChecklist";
import { useToast } from "@/components/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (!res || res.error) {
        if (res?.error === "CredentialsSignin") {
          const msg = "Username atau password tidak cocok. Silakan coba lagi.";
          setError(msg);
          toast.error(msg, "Login gagal");
        } else {
          const msg = `Terjadi kesalahan pada server (${res?.error ?? "unknown"}). Pastikan ENV Vercel & akses Google Sheet sudah benar.`;
          setError(msg);
          toast.error(msg, "Login gagal");
        }
      } else {
        toast.success("Berhasil login. Mengalihkan ke dashboard…", "Sukses");
        router.replace("/dashboard");
      }
    } catch {
      const msg = "Terjadi kesalahan pada sistem autentikasi.";
      setError(msg);
      toast.error(msg, "Login gagal");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="brand-card p-8 sm:p-10">
          <div className="flex flex-col items-center justify-center mb-10 text-center">
            <div className="w-20 h-20 mb-5 rounded-[2.5rem] bg-primary/10 border border-primary/15 shadow-lg flex items-center justify-center">
              <LogoChecklist className="w-12 h-12" />
            </div>

            <div className="brand-pill mb-3">Supervisi Internal</div>
            <h1 className="text-3xl font-black tracking-tight text-base-content">
              Super<span className="text-primary">visi</span>
            </h1>
            <p className="text-sm text-base-content/60 mt-2 font-medium">
              Aplikasi inspeksi APD &amp; P3K untuk pemantauan kepatuhan K3.
            </p>
          </div>

          {error && (
            <div role="alert" className="glass-panel mb-6 rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          <form id="loginForm" onSubmit={onSubmit} className="space-y-6">
            <div className="form-control w-full">
              <label htmlFor="username" className="label pb-2">
                <span className="label-text text-xs font-black uppercase tracking-[0.22em] text-base-content/55">
                  Username / ID Pegawai
                </span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30" size={18} />
                <input
                  type="text"
                  id="username"
                  autoComplete="username"
                  inputMode="text"
                  placeholder="Masukkan username"
                  className="input input-bordered w-full h-12 rounded-2xl bg-base-200/40 border-base-content/10 pl-12 pr-4 text-base-content placeholder:text-base-content/35 focus:border-primary/30 focus:bg-base-100"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control w-full">
              <label htmlFor="password" className="label pb-2">
                <span className="label-text text-xs font-black uppercase tracking-[0.22em] text-base-content/55">
                  Password
                </span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input input-bordered w-full h-12 rounded-2xl bg-base-200/40 border-base-content/10 pl-12 pr-12 text-base-content placeholder:text-base-content/35 focus:border-primary/30 focus:bg-base-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="btn btn-ghost btn-sm btn-circle absolute right-2 top-1/2 -translate-y-1/2 text-base-content/55 hover:text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-control pt-2">
              <button
                type="submit"
                id="submitBtn"
                className="btn btn-primary h-12 w-full rounded-2xl shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk ke Sistem"
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <a href="#" className="text-sm font-semibold text-base-content/55 hover:text-primary transition-colors">
              Lupa password atau kendala akses?
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-xs font-medium text-base-content/40">
          &copy; 2026 Unit K3 &amp; Kesehatan. Sistem Supervisi Internal.
        </div>
      </div>
    </main>
  );
}
