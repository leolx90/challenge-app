import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/db/challenges";
import { redirect } from "next/navigation";
import Link from "next/link";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?redirectTo=/settings");
  const profile = await getCurrentUserProfile();
  if (!profile?.username?.trim()) redirect("/onboarding?redirectTo=/settings");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>
        <SettingsForm
          initialUsername={profile?.username ?? ""}
          initialEmail={profile?.email ?? user.email ?? ""}
        />
      </div>
    </div>
  );
}

