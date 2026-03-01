import Link from "next/link";
import { getChallengesForUser } from "@/lib/db/challenges";
import SignOutButton from "./sign-out-button";
import { IconSettings, IconPlus } from "./icons";

export default async function HomePage({
  username,
}: {
  username?: string;
}) {
  const { data: challenges, error } = await getChallengesForUser();
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600">Failed to load challenges.</p>
      </div>
    );
  }

  const open = (challenges ?? []).filter((c) => c.status === "open");
  const completed = (challenges ?? []).filter((c) => c.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        {username && (
          <p className="mb-2 text-gray-600">Hello, {username}</p>
        )}
        <div className="mb-6 flex min-w-0 items-center justify-between gap-2">
          <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">My Challenges</h1>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/settings"
              title="Settings"
              className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Settings"
            >
              <IconSettings />
            </Link>
            <SignOutButton />
            <Link
              href="/challenge/new"
              title="Start challenge"
              className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
              aria-label="Start challenge"
            >
              <IconPlus />
              <span className="hidden sm:inline">Start</span>
            </Link>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Open</h2>
          {open.length === 0 ? (
            <p className="text-gray-500">No open challenges.</p>
          ) : (
            <ul className="space-y-2">
              {open.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/challenge/${c.id}`}
                    className="flex min-w-0 items-center gap-2 rounded border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-900">{c.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-sm text-gray-500">
                      {c.start_date} – {c.end_date}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Completed</h2>
          {completed.length === 0 ? (
            <p className="text-gray-500">No completed challenges.</p>
          ) : (
            <ul className="space-y-2">
              {completed.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/challenge/${c.id}`}
                    className="flex min-w-0 items-center gap-2 rounded border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-900">{c.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-sm text-gray-500">
                      {c.start_date} – {c.end_date}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
