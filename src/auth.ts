import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { verifyCredentials } from "@/lib/users";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");

        if (!username || !password) return null;

        let user: Awaited<ReturnType<typeof verifyCredentials>> = null;
        try {
          user = await verifyCredentials(username, password);
        } catch (err) {
          console.error("verifyCredentials failed", err);
          throw err;
        }
        if (!user) return null;

        return {
          id: user.id,
          name: user.nama_lengkap,
          email: user.username,
          username: user.username,
          role: user.role,
          wilayahKerja: user.wilayah_kerja ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as any).username ?? token.username;
        token.role = (user as any).role ?? token.role;
        token.wilayahKerja = (user as any).wilayahKerja ?? token.wilayahKerja;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).wilayahKerja = token.wilayahKerja ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
