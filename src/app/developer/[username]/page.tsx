import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DeveloperOverviewPage } from "@/components/DeveloperOverviewPage";

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const { username } = await params;

  return <DeveloperOverviewPage username={username} />;
}
