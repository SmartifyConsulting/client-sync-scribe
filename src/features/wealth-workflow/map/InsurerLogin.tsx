import { useEffect, useState } from "react";
import { Check, Mail, KeyRound } from "lucide-react";
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
  "no-addon": "The browser add-on isn't installed or running, so the insurer login can't start.",
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
