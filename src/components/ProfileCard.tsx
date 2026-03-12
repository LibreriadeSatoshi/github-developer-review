import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileCardProps {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  createdAt: string;
}

export function ProfileCard({ login, name, avatarUrl, bio, createdAt }: ProfileCardProps) {
  const joinDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardContent className="flex items-start gap-5 p-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} alt={login} />
          <AvatarFallback>{login[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {name ?? login}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">@{login}</p>
          {bio && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{bio}</p>
          )}
          <p className="mt-2 text-xs text-zinc-400">Joined {joinDate}</p>
        </div>
      </CardContent>
    </Card>
  );
}
