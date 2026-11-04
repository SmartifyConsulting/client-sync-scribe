import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Selection = { workflowId: string; insurers: string[]; publisher: object };
const Context = createContext<{
  selection: Selection | null;
  publish: (value: Selection) => void;
  clear: (publisher: object) => void;
} | null>(null);

/** Local draft selection stays inside one client's workspace; saving still uses the quote plan. */
export function QuoteInsurerSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const publish = useCallback((value: Selection) => setSelection(value), []);
  const clear = useCallback((publisher: object) => setSelection(current => current?.publisher === publisher ? null : current), []);
  const value = useMemo(() => ({ selection, publish, clear }), [selection, publish, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePublishQuoteInsurers(workflowId: string, insurers: string[]) {
  const context = useContext(Context);
  const publish = context?.publish, clear = context?.clear;
  const publisher = useRef({});
  useEffect(() => { publish?.({ workflowId, insurers, publisher: publisher.current }); }, [workflowId, insurers, publish]);
  useEffect(() => { const owner = publisher.current; return () => clear?.(owner); }, [workflowId, clear]);
}

export function useSelectedQuoteInsurers(workflowId: string | undefined, saved: string[] | undefined): string[] {
  const context = useContext(Context);
  const draft = context?.selection;
  const list = draft && draft.workflowId === workflowId ? draft.insurers : saved ?? [];
  return [...new Set((Array.isArray(list) ? list : []).filter(name => typeof name === "string" && name.trim()))];
}
