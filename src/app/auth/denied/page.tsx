import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Access Restricted
        </h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
          Login is limited to members of the authorized GitHub organization.
          If you believe this is a mistake, please contact your administrator.
        </p>
        <Link
          href="/"
          className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Back to login
        </Link>
      </main>
    </div>
  );
}
