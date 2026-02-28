import Link from "next/link";
import { getChallengesForUser } from "@/lib/db/challenges";
import SignOutButton from "./sign-out-button";

export default async function HomePage() {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Challenges</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <SignOutButton />
            <Link
            href="/challenge/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Start challenge
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
                    className="block rounded border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow"
                  >
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="ml-2 text-sm text-gray-500">
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
                    className="block rounded border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300"
                  >
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="ml-2 text-sm text-gray-500">
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
