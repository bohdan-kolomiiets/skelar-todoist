"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocalAuthService } from "@/lib/auth/LocalAuthService";
import { DaysparkWordmark } from "@/components/brand/DaysparkWordmark";
import { SignInForm } from "@/components/auth/SignInForm";

/** Pre-guest entry (PRODUCT §12): value prop → Get started (guest) or Sign in (free). */
export function WelcomeScreen() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const auth = new LocalAuthService();

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <DaysparkWordmark />
        <h1 className="text-2xl font-medium">Plan your day in one brain-dump.</h1>
        <p className="text-text-secondary">
          Get everything out of your head — tasks, errands, deadlines. Dayspark sorts it into your day.
        </p>
      </header>

      {signingIn ? (
        <SignInForm
          autoFocus
          submitLabel="Continue"
          onSubmit={(emailOrName) => {
            auth.signIn({ emailOrName });
            router.push("/capture");
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              auth.startGuest();
              router.push("/capture");
            }}
            className="min-h-11 rounded-full bg-fill-accent px-4 text-[15px] font-medium text-on-accent"
          >
            Get started
          </button>
          <button type="button" onClick={() => setSigningIn(true)} className="min-h-11 text-[15px] text-text-secondary">
            Sign in
          </button>
        </div>
      )}

      <Link href="/plans" className="text-center text-[13px] text-text-secondary underline">
        What&rsquo;s included
      </Link>
    </section>
  );
}
