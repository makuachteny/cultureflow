/**
 * Edge-safe NextAuth config.
 *
 * Middleware runs on the Edge Runtime, which can't execute Node-only
 * deps (Prisma, bcryptjs). If middleware imports @/lib/auth directly,
 * Webpack pulls bcryptjs into the Edge bundle and the build warns
 * loudly. We keep the pure-JS parts — types, pages, callbacks — here,
 * and import them from both the Edge middleware and the Node auth.ts.
 *
 * Providers (which need bcrypt / Prisma) and the NextAuth adapter live
 * in auth.ts only.
 */
import type { NextAuthConfig, DefaultSession } from "next-auth";

export type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";

declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}

export const authConfig = {
  session: { strategy: "jwt" as const },
  pages:   { signIn: "/sign-in" },
  /* Middleware doesn't use `authorized` — it does its own gating in
     middleware.ts — but NextAuth v5 expects the key to exist. */
  callbacks: {
    authorized() { return true; },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "ATTENDEE";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        const role = token.role;
        if (role === "ATTENDEE" || role === "ORGANIZER" || role === "ADMIN") {
          session.user.role = role;
        }
      }
      return session;
    }
  },
  providers: []
} satisfies NextAuthConfig;
