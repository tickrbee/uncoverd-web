"use client";

// Tiny shared store so the header listing switcher and the price chart (rendered
// in different parts of the server page) can share which listing is selected,
// without threading state through the server component or using ?searchParams
// (which would force a Suspense boundary). Selection is per-page-view; it resets
// on navigation, which is the desired behaviour.

import { useSyncExternalStore } from "react";

let selected: string | null = null;
const listeners = new Set<() => void>();

export function setSelectedListing(symbol: string | null) {
  selected = symbol;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Returns the selected listing symbol, or `fallback` when nothing is selected.
export function useSelectedListing(fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => selected ?? fallback,
    () => fallback,
  );
}
