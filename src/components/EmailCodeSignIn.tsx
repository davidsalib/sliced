"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field = "w-full rounded-2xl border border-ash bg-oven-2 px-4 py-3.5 text-lg outline-none focus:border-cheese";

/** Sign in with a 6-digit code emailed by Supabase (no password, no Google needed). */
export function EmailCodeSignIn({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState<string | null>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Too many codes requested. Wait a minute and try again." : "Couldn't send a code. Check the address and try again.");
      return;
    }
    setEmail(address);
    setStep("code");
    setCode("");
    setSentNote(`We emailed a 6-digit code to ${address}.`);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError("The code is 6 digits.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      setBusy(false);
      setError("That code didn't work. Check it, or send a new one.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.form key="email" onSubmit={sendCode} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="grid gap-3">
            <label htmlFor="signin-email" className="sr-only">
              Email address
            </label>
            <input
              id="signin-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
            <button disabled={busy} className="btn-pep rounded-full border border-cheese/60 px-6 py-3.5 font-bold text-cheese hover:bg-cheese/10 disabled:opacity-60">
              {busy ? "Sending…" : "Email me a sign-in code"}
            </button>
          </motion.form>
        ) : (
          <motion.form key="code" onSubmit={verify} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="grid gap-3">
            {sentNote && <p className="text-center text-sm text-dough">{sentNote}</p>}
            <label htmlFor="signin-code" className="sr-only">
              6-digit code
            </label>
            <input
              id="signin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${field} text-center font-display text-3xl font-extrabold tracking-[0.4em]`}
              autoFocus
            />
            <button disabled={busy || code.length !== 6} className="btn-pep rounded-full bg-tomato px-6 py-3.5 font-display text-lg font-extrabold text-oven disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div className="flex justify-center gap-4 text-sm font-semibold text-dough">
              <button type="button" onClick={() => sendCode()} disabled={busy} className="hover:text-flour">
                Send a new code
              </button>
              <button type="button" onClick={() => (setStep("email"), setError(null))} className="hover:text-flour">
                Use a different email
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      {error && (
        <p role="alert" className="text-center text-sm font-semibold text-tomato">
          {error}
        </p>
      )}
    </div>
  );
}

/** Google first, then the email-code option, with an "or" divider. */
export function SignInOptions({ next = "/", google }: { next?: string; google: React.ReactNode }) {
  return (
    <div className="grid gap-4">
      {google}
      <div className="flex items-center gap-3 text-xs font-bold tracking-widest text-dough uppercase">
        <span className="h-px flex-1 bg-ash" /> or <span className="h-px flex-1 bg-ash" />
      </div>
      <EmailCodeSignIn next={next} />
    </div>
  );
}
