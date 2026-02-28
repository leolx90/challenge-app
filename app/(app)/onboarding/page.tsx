import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/db/challenges";
import { redirect } from "next/navigation";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?redirectTo=/onboarding");

  const profile = await getCurrentUserProfile();
  if (profile?.username?.trim()) redirect("/");

  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-gray-800">
          Welcome to Challenge Tracker
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Please set your display name so others can see who you are in challenges.
        </p>
        <OnboardingForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
