import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/db/challenges";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewChallengeForm from "./new-challenge-form";

export default async function NewChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?redirectTo=/challenge/new");
  const profile = await getCurrentUserProfile();
  if (!profile?.username?.trim()) redirect("/onboarding?redirectTo=/challenge/new");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Create challenge</h1>
        <NewChallengeForm />
      </div>
    </div>
  );
}
