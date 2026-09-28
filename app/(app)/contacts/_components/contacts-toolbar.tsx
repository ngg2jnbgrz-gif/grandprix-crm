"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input, Select, Button } from "@/components/ui/forms";

type Props = {
  /** Distinct non-empty category values for the filter dropdown. */
  categories: string[];
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Search + filter toolbar. Writes filters into the URL so filtering stays
 *  server-side (the page re-reads searchParams). */
export function ContactsToolbar({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debouncedQ = useDebouncedValue(q, 350);

  function push(params: URLSearchParams) {
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounced free-text search updates the URL automatically.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("q") ?? "";
    if (debouncedQ === current) return;
    if (debouncedQ) params.set("q", debouncedQ);
    else params.delete("q");
    push(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  function onSelect(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    push(params);
  }

  function onPriorityOnly(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set("priority", "1");
    else params.delete("priority");
    push(params);
  }

  const hasFilters =
    searchParams.get("q") ||
    searchParams.get("category") ||
    searchParams.get("temperature") ||
    searchParams.get("priority");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label
          htmlFor="contacts-search"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted"
        >
          Search
        </label>
        <Input
          id="contacts-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, company, phone, email…"
          autoComplete="off"
        />
      </div>
      <div className="w-44">
        <label
          htmlFor="contacts-category"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted"
        >
          Category
        </label>
        <Select
          id="contacts-category"
          value={searchParams.get("category") ?? ""}
          onChange={(e) => onSelect("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-36">
        <label
          htmlFor="contacts-temp"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted"
        >
          Temperature
        </label>
        <Select
          id="contacts-temp"
          value={searchParams.get("temperature") ?? ""}
          onChange={(e) => onSelect("temperature", e.target.value)}
        >
          <option value="">All</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </Select>
      </div>
      <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-hud-ink">
        <input
          type="checkbox"
          checked={searchParams.get("priority") === "1"}
          onChange={(e) => onPriorityOnly(e.target.checked)}
          className="h-4 w-4 accent-[var(--hud-accent)]"
        />
        Priority only
      </label>
      {hasFilters ? (
        <div className="pb-1">
          <Button variant="ghost" size="sm" onClick={() => router.replace(pathname, { scroll: false })}>
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
