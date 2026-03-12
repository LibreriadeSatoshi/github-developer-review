import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return <DashboardContent />;
}
