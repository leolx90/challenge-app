"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconRefresh } from "../../icons";

export default function DetailNav() {
  const router = useRouter();
  return (
    <div className="mb-4 flex min-w-0 items-center gap-2">
      <Link
        href="/"
        className="truncate text-sm text-blue-600 hover:underline"
        title="Back to home"
      >
        ← <span className="hidden sm:inline">Back to home</span>
        <span className="sm:hidden">Back</span>
      </Link>
      <button
        type="button"
        onClick={() => router.refresh()}
        title="Refresh"
        className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Refresh"
      >
        <IconRefresh />
      </button>
    </div>
  );
}
