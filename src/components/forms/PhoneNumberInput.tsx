import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL,
  joinE164,
  splitE164,
} from "@/lib/countryDialCodes";

interface Props {
  id?: string;
  /** Full E.164 string, e.g. "+27821234567" */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Country-code + local-number phone input.
 * The dial code is held locally so changing the country before typing a
 * local number still persists (parent receives "" until a local exists, but
 * the chosen flag/code stays visible).
 */
export function PhoneNumberInput({ id, value, onChange, disabled, placeholder = "82 123 4567" }: Props) {
  const parsed = splitE164(value);
  const [dial, setDial] = useState<string>(parsed.dial || DEFAULT_DIAL);

  // If parent supplies an E.164 with a recognisable prefix, mirror it locally.
  useEffect(() => {
    const p = splitE164(value);
    if (value && p.dial && p.dial !== dial) setDial(p.dial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const local = parsed.local;

  const onDialChange = (d: string) => {
    setDial(d);
    // Re-emit so parent stays in sync once a local exists.
    onChange(joinE164(d, local));
  };

  const onLocalChange = (next: string) => {
    onChange(joinE164(dial, next));
  };

  return (
    <div className="flex gap-2">
      <Select value={dial} onValueChange={onDialChange} disabled={disabled}>
        <SelectTrigger className="w-[13rem] h-12 text-lg shrink-0 font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRY_DIAL_CODES.map((c) => (
            <SelectItem key={`${c.code}-${c.dial}`} value={c.dial} className="text-lg">
              <span className="mr-2 text-2xl">{c.flag}</span>
              <span className="text-lg font-semibold">{c.dial}</span>
              <span className="ml-2 text-sm text-muted-foreground">{c.code}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={local}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onLocalChange(e.target.value)}
        className="flex-1 h-12 text-lg"
      />
    </div>
  );
}

