import { auth } from "@/lib/auth";
import { getCached } from "@/lib/cache";
import { logger } from "@/lib/logger";
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

async function rollbackSnapshot(snapshotId: number) {
  const { error } = await supabase.from("developer_snapshots").delete().eq("id", snapshotId);
  if (error) logger.error("[save] rollback failed", { snapshotId, error });
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
    logger.error("[save] snapshot insert failed", { error });
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }

  const snapshotId = data.id;

  if (overview.bitcoinRepos.length > 0) {
    const { error: reposError } = await supabase.from("snapshot_bitcoin_repos").insert(
      overview.bitcoinRepos.map((r) => ({
        snapshot_id: snapshotId,
        repo_name: r.nameWithOwner,
        tier: r.tier,
        reason: r.reason,
        url: r.url ?? null,
      }))
    );
    if (reposError) {
      logger.error("[save] snapshot_bitcoin_repos insert failed", { error: reposError });
      await rollbackSnapshot(snapshotId);
      return NextResponse.json({ error: "Failed to save snapshot repos" }, { status: 500 });
    }
  }

  const seenDates = new Set<string>();
  const days = overview.calendarWeeks
    .flatMap((w) =>
      w.contributionDays.map((d) => ({
        snapshot_id: snapshotId,
        contribution_date: d.date,
        contribution_count: d.contributionCount,
        color: d.color,
      }))
    )
    .filter((d) => {
      if (seenDates.has(d.contribution_date)) return false;
      seenDates.add(d.contribution_date);
      return true;
    });
  if (days.length > 0) {
    const { error: daysError } = await supabase
      .from("snapshot_contribution_days")
      .insert(days);
    if (daysError) {
      logger.error("[save] snapshot_contribution_days insert failed", { error: daysError });
      await rollbackSnapshot(snapshotId);
      return NextResponse.json({ error: "Failed to save contribution days" }, { status: 500 });
    }
  }

  if (overview.contributions.length > 0) {
    const { error: contribError } = await supabase.from("snapshot_contributions").insert(
      overview.contributions.map((c) => ({
        snapshot_id: snapshotId,
        type: c.type,
        count: c.count,
        repo_name: c.repoNameWithOwner,
        date_from: c.dateRange.from,
        date_to: c.dateRange.to,
      }))
    );
    if (contribError) {
      logger.error("[save] snapshot_contributions insert failed", { error: contribError });
      await rollbackSnapshot(snapshotId);
      return NextResponse.json({ error: "Failed to save contributions" }, { status: 500 });
    }
  }

  return NextResponse.json({ id: snapshotId, savedAt: data.saved_at });
}
