import { auth } from "@/lib/auth";
import { getCached } from "@/lib/cache";
import { supabase } from "@/lib/supabase";
import type { DeveloperOverview } from "@/lib/types";
import { GITHUB_USERNAME_RE } from "@/lib/utils";
import { NextResponse } from "next/server";

const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;

function normalizeDateInput(input: unknown): string | null {
  if (typeof input !== "string") throw new Error("Invalid date format — expected MM/DD/YYYY");
  if (!input.trim()) return null;
  if (!DATE_RE.test(input)) throw new Error("Invalid date format — expected MM/DD/YYYY");
  const [month, day, year] = input.split("/");
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new Error("Invalid date — day does not exist in the given month");
  }
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { username, programEntryDate } = body as {
    username: unknown;
    programEntryDate?: unknown;
  };

  if (typeof username !== "string" || !GITHUB_USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  let normalizedDate: string | null;
  try {
    normalizedDate = normalizeDateInput(programEntryDate ?? "");
  } catch {
    return NextResponse.json(
      { error: "Invalid date format — expected MM/DD/YYYY" },
      { status: 400 }
    );
  }

  const cacheKey = `overview:2:${username.toLowerCase()}`;
  const overview = await getCached<DeveloperOverview>(cacheKey);
  if (!overview) {
    return NextResponse.json(
      { error: "Profile expired — please reload before saving" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("developer_snapshots")
    .insert({
      username: overview.login.toLowerCase(),
      program_entry_date: normalizedDate,
      snapshot_at: new Date().toISOString(),
      total_contributions: overview.totalContributions,
      lines_added: overview.linesAdded ?? 0,
      lines_deleted: overview.linesDeleted ?? 0,
      account_created_at: overview.createdAt.split("T")[0],
      profile_json: overview,
    })
    .select("id, saved_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }

  if (overview.bitcoinRepos.length > 0) {
    const { error: reposError } = await supabase.from("snapshot_bitcoin_repos").insert(
      overview.bitcoinRepos.map((r) => ({
        snapshot_id: data.id,
        repo_name: r.nameWithOwner,
        tier: r.tier,
      }))
    );
    if (reposError) {
      return NextResponse.json({ error: "Failed to save snapshot repos" }, { status: 500 });
    }
  }

  return NextResponse.json({ id: data.id, savedAt: data.saved_at });
}
