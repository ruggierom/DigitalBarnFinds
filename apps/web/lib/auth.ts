import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowlist = (process.env.ADMIN_ALLOWLIST ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const devAuthBypass = process.env.DEV_AUTH_BYPASS === "true";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  pages: {
    signIn: "/signin"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user }) {
      if (devAuthBypass) {
        console.log("[auth] bypass enabled");
        return true;
      }
      const email = user.email?.toLowerCase();
      const allowed = Boolean(email && allowlist.includes(email));
      console.log("[auth] signIn attempt", {
        email,
        allowed,
        allowlist
      });
      return allowed;
    },
    async session({ session }) {
      if (devAuthBypass && !session.user?.email) {
        session.user = {
          ...session.user,
          name: "Local Admin",
          email: allowlist[0] ?? "local-admin@example.com"
        };
      }
      return session;
    }
  },
  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      console.log("[next-auth][debug]", code, metadata);
    }
  }
};
