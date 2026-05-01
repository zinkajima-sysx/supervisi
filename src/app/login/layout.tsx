import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk | Supervisi APD & P3K",
  description: "Halaman login internal untuk aplikasi Supervisi APD dan P3K PT KAI.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
