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
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface shadow-xl p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className="w-14 h-14 mb-4 rounded-2xl bg-primary text-primary-foreground border border-border shadow-lg flex items-center justify-center">
              <LogoChecklist className="w-8 h-8 text-primary-foreground" />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary-foreground mb-2">
              Supervisi Internal
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Super<span className="text-primary">visi</span>
            </h1>
            <p className="text-xs text-foreground/70 mt-1 font-medium">
              Aplikasi inspeksi APD &amp; P3K untuk pemantauan kepatuhan K3.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-danger bg-danger text-danger-foreground px-3 py-2.5 text-sm"
            >
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="font-semibold leading-relaxed text-xs">{error}</span>
              </div>
            </div>
          )}

          <form id="loginForm" onSubmit={onSubmit} className="space-y-4">
            <div className="w-full">
              <label htmlFor="username" className="block pb-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-foreground/60">
                Username / ID Pegawai
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60" size={16} />
                <input
                  type="text"
                  id="username"
                  autoComplete="username"
                  inputMode="text"
                  placeholder="Masukkan username"
                  className="input w-full h-11 rounded-xl pl-10 pr-4"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="w-full">
              <label htmlFor="password" className="block pb-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-foreground/60">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input w-full h-11 rounded-xl pl-10 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="button button--ghost button--icon-only button--sm absolute right-1.5 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                id="submitBtn"
                className="button button--primary button--lg w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk ke Sistem"
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <a href="#" className="text-xs font-semibold text-foreground/60 hover:text-primary transition-colors">
              Lupa password atau kendala akses?
            </a>
          </div>
        </div>

        <div className="mt-4 text-center text-xs font-medium text-foreground/60">
          &copy; 2026 Unit K3 &amp; Kesehatan. Sistem Supervisi Internal.
        </div>
      </div>
    </main>
  );
}
