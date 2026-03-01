"use client";

import { useRouter } from "next/navigation";
import { IconRefresh } from "./icons";

export default function RefreshButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      title="Refresh"
      className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      aria-label="Refresh"
    >
      <IconRefresh />
    </button>
  );
}
