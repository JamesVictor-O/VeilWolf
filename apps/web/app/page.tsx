"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getStoredNickname } from "@/lib/identity";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const nickname = getStoredNickname();
    router.replace(nickname ? "/home" : "/onboarding/nickname");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="text-slate-500">Loading VeilWolf…</span>
    </div>
  );
}
