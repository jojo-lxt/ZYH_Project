import { LoginPage } from "@/features/auth/components/LoginPage";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/overview");
  }

  return <LoginPage />;
}
