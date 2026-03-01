"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { IconLogOut } from "./icons";

export default function SignOutButton() {
  const router = useRouter();
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleSignOut}
      title="Sign out"
      aria-label="Sign out"
      className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      <IconLogOut />
    </button>
  );
}
