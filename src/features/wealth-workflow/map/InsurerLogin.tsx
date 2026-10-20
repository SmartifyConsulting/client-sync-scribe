import { useEffect, useState } from "react";
import { Check, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LoginState = "connecting" | "challenge" | "connected" | "failed" | "no-addon";
export type Challenge = { insurer: string; method: "otp" | "email"; hint?: string };

export const LOGIN_TEXT: Record<LoginState, string> = {
  connecting: "Logging in with the saved login…",
  challenge: "Waiting for verification…",
  connected: "Connected",
  failed: "Login failed — click the tab to try again.",
  "no-addon": "Holarc Wealth Companion is not set up in this browser.",
};

/** Small circular progress ring shown on an insurer tab while the add-on logs in. */
export function LoginRing({ state }: { state?: LoginState }) {
  if (!state) return null;
  if (state === "connected") return <Check className="h-3 w-3" aria-label="Connected" />;
  const spinning = state === "connecting" || state === "challenge";
  return (
    <svg viewBox="0 0 16 16" className={spinning ? "h-3 w-3 animate-spin" : "h-3 w-3 opacity-60"} aria-label={LOGIN_TEXT[state]}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeDasharray="37.7" strokeDashoffset={spinning ? 26 : 37.7} />
    </svg>
  );
}

/** Pops up by itself when the insurer asks for a one-time PIN or an emailed verification. */
export function OtpDialog({ challenge, onClose, onSubmit }: { challenge: Challenge | null; onClose: () => void; onSubmit: (v: string) => void }) {
  const [code, setCode] = useState("");
  useEffect(() => setCode(""), [challenge]);
  const isOtp = challenge?.method === "otp";
  const valid = /^\d{4,8}$/.test(code);
  return (
    <Dialog open={!!challenge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {isOtp ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {challenge?.insurer} {isOtp ? "sent a one-time PIN" : "sent a verification email"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isOtp ? `Type the PIN ${challenge?.hint ? `sent to ${challenge.hint}` : "from the SMS"}.` : `Open the email${challenge?.hint ? ` sent to ${challenge.hint}` : ""}, click the link, then continue.`}
          </DialogDescription>
        </DialogHeader>
        {isOtp ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(code); }}>
            <Input autoFocus inputMode="numeric" autoComplete="one-time-code" className="h-8 text-center tracking-[0.3em] tabular-nums"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} />
            <Button size="sm" className="h-8" disabled={!valid}>Continue</Button>
          </form>
        ) : (
          <Button size="sm" className="h-8" onClick={() => onSubmit("")}>I've clicked the link</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Asks once per session for the Password Protector that unlocks the saved insurer logins. */
export function ProtectorDialog({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (v: string) => void; busy?: boolean }) {
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => { if (!open) setCode(""); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" />Unlock saved insurer logins</DialogTitle>
          <DialogDescription className="text-xs">Unlock all insurer quotes for 15 minutes. After that, Holarc Wealth asks for your Password Protector again.</DialogDescription>
        </DialogHeader>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code) onSubmit(code); }}>
          <div className="relative flex-1">
            <Input autoFocus type={show ? "text" : "password"} className="h-8 pr-8 text-xs" value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" tabIndex={-1} aria-label={show ? "Hide" : "Show"} onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
          </div>
          <Button size="sm" className="h-8" disabled={!code || busy}>Unlock</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const addonInstalled = () => document.documentElement.dataset.holarcAddon === "1";

export function downloadAddon() {
  fetch("/holarc-insurer-addon.zip")
    .then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.blob(); })
    .then((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "holarc-insurer-addon.zip"; a.click(); URL.revokeObjectURL(a.href); })
    .catch((e) => alert(e.message));
}
