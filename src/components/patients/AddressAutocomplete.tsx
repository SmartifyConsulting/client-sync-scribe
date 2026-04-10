import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  rows?: number;
}

export function AddressAutocomplete({ value, onChange, placeholder, id, rows = 2 }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
        body: { input },
      });
      if (!error && data?.predictions) {
        setSuggestions(data.predictions.map((p: any) => ({ description: p.description, place_id: p.place_id })));
        setShowSuggestions(true);
      }
    } catch {
      // silently fail - user can still type manually
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), 400);
  };

  const selectSuggestion = (description: string) => {
    onChange(description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        id={id}
        className="text-sm"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 text-foreground border-b border-border/30 last:border-0"
              onClick={() => selectSuggestion(s.description)}
            >
              {s.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
