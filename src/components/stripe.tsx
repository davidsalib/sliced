"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { CheesePull } from "@/components/Toppings";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
  return stripePromise;
}

const appearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#ff5b3d",
    colorBackground: "#2e1f17",
    colorText: "#fff3e3",
    colorTextSecondary: "#c7aa92",
    colorDanger: "#ff5b3d",
    borderRadius: "14px",
    fontFamily: "Figtree, system-ui, sans-serif",
  },
  rules: { ".Input": { border: "1px solid #45322a" } },
};

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data as T;
}

const btn =
  "btn-pep w-full rounded-full bg-tomato px-5 py-3.5 font-display text-lg font-extrabold text-oven transition active:scale-[0.98] disabled:opacity-50";

// ---------------------------------------------------------------------------
// Save a card for weekly charges (SetupIntent)
// ---------------------------------------------------------------------------

function CardForm({ onSaved, returnPath }: { onSaved: (label: string) => void; returnPath: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}${returnPath}` },
    });
    if (error) {
      setError(error.message ?? "Your card couldn't be saved.");
      setBusy(false);
      return;
    }
    try {
      const { label } = await postJson<{ label: string }>("/api/stripe/card", { setupIntentId: setupIntent?.id });
      onSaved(label);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm font-semibold text-tomato">{error}</p>}
      <button className={btn} disabled={!stripe || busy}>
        {busy ? "Saving…" : "Save card"}
      </button>
      <p className="text-center text-xs text-dough">Stored securely by Stripe. Charged only when a pizza you&apos;re chipping in on gets sliced.</p>
    </form>
  );
}

export function CardSetup({ onSaved, returnPath = "/wallet" }: { onSaved: (label: string) => void; returnPath?: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    postJson<{ clientSecret: string }>("/api/stripe/setup-intent")
      .then((d) => alive && setClientSecret(d.clientSecret))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="text-sm font-semibold text-tomato">{error}</p>;
  if (!clientSecret) return <CheesePull label="Warming up the card form" />;
  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
      <CardForm onSaved={onSaved} returnPath={returnPath} />
    </Elements>
  );
}

/** Finishes a card setup that needed a bank redirect (3-D Secure). */
export function CardReturn({ setupIntentId, onDone }: { setupIntentId: string; onDone: (msg: string) => void }) {
  useEffect(() => {
    postJson<{ label: string }>("/api/stripe/card", { setupIntentId })
      .then((d) => onDone(`${d.label} saved.`))
      .catch((e) => onDone((e as Error).message));
  }, [setupIntentId, onDone]);
  return null;
}

// ---------------------------------------------------------------------------
// Pay a share by hand after an automatic charge failed (PaymentIntent)
// ---------------------------------------------------------------------------

function PayForm({ requestId, amount, onPaid }: { requestId: string; amount: string; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/r/${requestId}` },
    });
    if (error) {
      setError(error.message ?? "Payment didn't go through.");
      setBusy(false);
      return;
    }
    await fetch(`/api/requests/${requestId}/pay`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: paymentIntent?.id }),
    }).catch(() => undefined);
    onPaid();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm font-semibold text-tomato">{error}</p>}
      <button className={btn} disabled={!stripe || busy}>
        {busy ? "Paying…" : `Pay ${amount}`}
      </button>
    </form>
  );
}

export function PayNow({ requestId, onPaid }: { requestId: string; onPaid: () => void }) {
  const [state, setState] = useState<{ clientSecret: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    postJson<{ clientSecret: string; amount: number }>(`/api/requests/${requestId}/pay`)
      .then((d) => alive && setState(d))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [requestId]);

  if (error) return <p className="text-sm font-semibold text-tomato">{error}</p>;
  if (!state) return <CheesePull label="Getting your share ready" />;
  return (
    <Elements stripe={getStripe()} options={{ clientSecret: state.clientSecret, appearance }}>
      <PayForm requestId={requestId} amount={`$${(state.amount / 100).toFixed(2)}`} onPaid={onPaid} />
    </Elements>
  );
}
