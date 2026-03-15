import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { TopNav } from "@/components/top-nav";
import { authDisabled, authOptions } from "@/lib/auth";

export default async function AuthenticatedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = authDisabled
    ? {
        user: {
          name: "Admin Preview",
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
