"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRecentSearches } from "@/hooks/use-recent-searches";

export function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const { searches, addSearch } = useRecentSearches();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const username = query.trim();
    if (!username) return;
    addSearch(username);
    router.push(`/developer/${username}`);
  }

  function handleRecentClick(username: string) {
    addSearch(username);
    router.push(`/developer/${username}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b bg-white dark:bg-zinc-950">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback>
                {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {session?.user?.name ?? "Reviewer"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-6 pt-24">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            GitHub Developer Review
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Search for a GitHub user to review their Bitcoin contributions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a GitHub username..."
            className="pl-10 h-12 text-base"
          />
        </form>

        {/* Recent searches */}
        {searches.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Recent searches
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {searches.map((s) => (
                <Card
                  key={s.username}
                  className="cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => handleRecentClick(s.username)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          s.avatarUrl ??
                          `https://github.com/${s.username}.png?size=64`
                        }
                      />
                      <AvatarFallback>
                        {s.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {s.username}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
