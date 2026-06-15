import { useMemo } from "react";
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
 * Stores the combined E.164 string via `onChange`.
 */
export function PhoneNumberInput({ id, value, onChange, disabled, placeholder = "82 123 4567" }: Props) {
  const { dial, local } = useMemo(() => splitE164(value), [value]);
  const currentDial = dial || DEFAULT_DIAL;

  return (
    <div className="flex gap-2">
      <Select
        value={currentDial}
        onValueChange={(d) => onChange(joinE164(d, local))}
        disabled={disabled}
      >
        <SelectTrigger className="w-[8.5rem] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRY_DIAL_CODES.map((c) => (
            <SelectItem key={`${c.code}-${c.dial}`} value={c.dial}>
              <span className="mr-1.5">{c.flag}</span>
              {c.dial}
              <span className="ml-1.5 text-xs text-muted-foreground">{c.code}</span>
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
        onChange={(e) => onChange(joinE164(currentDial, e.target.value))}
        className="flex-1"
      />
    </div>
  );
}
