"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { neighborName, parseName } from "@/lib/neighbors";
import type { NeighborHit } from "@/lib/types";

export type PickedNeighbor = { neighborId: string | null; newName: string | null; label: string } | null;

type Props = {
  value: PickedNeighbor;
  onChange: (v: PickedNeighbor) => void;
  id?: string;
  label?: string;
  /** Preview/demo only: search these instead of the server. */
  sampleHits?: NeighborHit[];
  autoFocus?: boolean;
};

function seen(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

/**
 * Type a name; matching neighbors drop down live so the same person is linked
 * across weeks. If nobody matches, add them as someone new.
 */
export function NeighborPicker({ value, onChange, id, label = "Their name", sampleHits, autoFocus }: Props) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-name`;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<NeighborHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      const t = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(t);
    }
    if (sampleHits) {
      const t = setTimeout(() => setHits(sampleHits.filter((h) => neighborName(h).toLowerCase().includes(q.toLowerCase())).slice(0, 8)), 0);
      return () => clearTimeout(t);
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/neighbors/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setHits(res.ok ? (data.results as NeighborHit[]) : []);
      } catch {
        // aborted or offline: keep the last results
      }
      setLoading(false);
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, sampleHits]);

  const parsed = parseName(query);
  const newLabel = parsed ? neighborName({ first_name: parsed.first, last_name: parsed.last }) : "";
  const exact = hits.some((h) => neighborName(h).toLowerCase() === newLabel.toLowerCase());
  const options: ({ kind: "hit"; hit: NeighborHit } | { kind: "new" })[] = [
    ...hits.map((hit) => ({ kind: "hit" as const, hit })),
    ...(parsed ? [{ kind: "new" as const }] : []),
  ];

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    if (o.kind === "hit") onChange({ neighborId: o.hit.id, newName: null, label: neighborName(o.hit) });
    else if (parsed) onChange({ neighborId: null, newName: query.trim(), label: newLabel });
    setOpen(false);
    setQuery("");
  }

  if (value) {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-semibold text-dough">{label}</span>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-cheese/50 bg-oven-2 px-4 py-2.5">
          <span className="min-w-0 truncate font-semibold">
            {value.label}
            {!value.neighborId && <span className="ml-2 rounded-full bg-cheese/15 px-2 py-0.5 text-xs font-bold text-cheese">New neighbor</span>}
          </span>
          <button
            type="button"
            className="shrink-0 text-sm font-semibold text-dough hover:text-flour"
            onClick={() => {
              onChange(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-dough">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="First name, last name or initial"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && options.length) {
            e.preventDefault();
            choose(active);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="rounded-2xl border border-ash bg-oven-2 px-4 py-3 outline-none focus:border-cheese"
      />
      <AnimatePresence>
        {open && query.trim() && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 left-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-ash bg-oven-2 p-1.5 shadow-2xl"
          >
            {loading && !hits.length && <li className="px-3 py-2 text-sm text-dough">Searching…</li>}
            {options.map((o, i) => (
              <li
                key={o.kind === "hit" ? o.hit.id : "new"}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(i);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-oven-3" : ""}`}
              >
                {o.kind === "hit" ? (
                  <>
                    <span className="min-w-0 truncate font-semibold">{neighborName(o.hit)}</span>
                    <span className="shrink-0 text-xs text-dough">
                      {o.hit.mentions ? `${o.hit.mentions}× · ` : ""}seen {seen(o.hit.last_seen_at)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm">
                    <span className="font-bold text-cheese">+ Add “{newLabel}”</span>
                    <span className="text-dough"> as {exact ? "a different" : "a new"} neighbor</span>
                  </span>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
