"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const next = searchParams.get("next") || "/";

    async function handleCallback() {
      const supabase = createClient();

      // Hash fragment (e.g. from password reset): #access_token=...&refresh_token=...&type=recovery
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            setStatus("error");
            return;
          }
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          router.push(next);
          router.refresh();
          return;
        }
      }

      // Query params (OTP flow): ?token_hash=...&type=recovery
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (token_hash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "recovery",
        });
        if (error) {
          setStatus("error");
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      setStatus("ok");
      router.push(next);
      router.refresh();
    }

    handleCallback();
  }, [router, searchParams]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600">Completing sign in…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 p-4">
        <p className="text-red-600">Something went wrong. Please try again or use the sign-in page.</p>
        <a href="/" className="text-blue-600 hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <p className="text-gray-600">Completing sign in…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
