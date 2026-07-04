import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/features/console/components/ConsoleShell";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <ConsoleShell currentUser={user}>{children}</ConsoleShell>;
}
