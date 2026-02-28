import { createClient } from "@/lib/supabase/server";
import { ensureCurrentUserProfile, getCurrentUserProfile } from "@/lib/db/challenges";
import AuthForm from "./(auth)/auth-form";
import HomePage from "./(app)/home-page";
import { Suspense } from "react";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800">Challenge Tracker</h1>
          <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    );
  }

  await ensureCurrentUserProfile();
  const profile = await getCurrentUserProfile();
  const needsOnboarding = !profile?.username?.trim();
  if (needsOnboarding) redirect("/onboarding");
  return <HomePage />;
}
