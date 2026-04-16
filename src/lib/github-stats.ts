const REPO_CAP = 20;

interface ContributorWeek {
  w: number;
  a: number;
  d: number;
  c: number;
}

interface ContributorStat {
  author: { login: string } | null;
  weeks: ContributorWeek[];
}

export interface LinesOfCodeResult {
  linesAdded: number;
  linesDeleted: number;
}

interface RepoContribution {
  repoNameWithOwner: string;
  count: number;
}

async function fetchRepoStats(
  repoNameWithOwner: string,
  token: string,
  retry = false
): Promise<ContributorStat[] | null> {
  const res = await fetch(
    `https://api.github.com/repos/${repoNameWithOwner}/stats/contributors`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (res.status === 202) {
    if (!retry) {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchRepoStats(repoNameWithOwner, token, true);
    }
    console.warn(`[github-stats] Stats not ready for ${repoNameWithOwner}, defaulting to 0`);
    return null;
  }

  if (res.status === 404 || res.status === 403) {
    return null;
  }

  if (!res.ok) {
    console.warn(`[github-stats] Unexpected ${res.status} for ${repoNameWithOwner}`);
    return null;
  }

  return res.json() as Promise<ContributorStat[]>;
}

export async function fetchLinesOfCode(
  repos: RepoContribution[],
  username: string,
  token: string
): Promise<LinesOfCodeResult> {
  const sorted = [...repos].sort((a, b) => b.count - a.count);

  if (sorted.length > REPO_CAP) {
    console.info(`[github-stats] Capping repos from ${sorted.length} to ${REPO_CAP} for ${username}`);
  }

  const capped = sorted.slice(0, REPO_CAP);
  const loginLower = username.toLowerCase();

  let linesAdded = 0;
  let linesDeleted = 0;

  for (const { repoNameWithOwner } of capped) {
    const stats = await fetchRepoStats(repoNameWithOwner, token);
    if (!stats) continue;

    const contributor = stats.find(
      (s) => s.author?.login.toLowerCase() === loginLower
    );
    if (!contributor) continue;

    for (const week of contributor.weeks) {
      linesAdded += week.a;
      linesDeleted += week.d;
    }
  }

  return { linesAdded, linesDeleted };
}
