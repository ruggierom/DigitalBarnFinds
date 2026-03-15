import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { TopNav } from "@/components/top-nav";
import { authOptions } from "@/lib/auth";

const devAuthBypass = process.env.DEV_AUTH_BYPASS === "true";

export default async function AuthenticatedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = devAuthBypass
    ? {
        user: {
          name: "Local Admin",
          email:
            process.env.ADMIN_ALLOWLIST?.split(",")[0]?.trim() ??
            "local-admin@example.com"
        }
      }
    : await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <main className="shell">
      <div className="shell__inner">
        <TopNav />
        {children}
      </div>
    </main>
  );
}
