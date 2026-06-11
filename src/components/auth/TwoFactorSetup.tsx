// src/pages/TwoFactorSetup.tsx  (or wherever your 2FA setup component lives)
import { useState } from "react";
import { Eye, EyeOff, Copy, Check, ShieldCheck, LogOut } from "lucide-react";

interface TwoFactorSetupProps {
  secret: string; // pass in from your existing hook/query — do NOT generate here
  qrCodeUrl: string; // the otpauth:// QR data URL
  onVerify: (code: string) => Promise<void>;
  onSignOut: () => void;
}

export default function TwoFactorSetup({ secret, qrCodeUrl, onVerify, onSignOut }: TwoFactorSetupProps) {
  const [code, setCode] = useState("");
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onVerify(code);
      setDone(true);
    } catch {
      setError("That code didn't match. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success screen ─────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <img src="/logo.png" alt="Holarc Health" className="h-10 mb-8" />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-50">
              <ShieldCheck className="w-7 h-7 text-teal-700" />
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">You're all set!</h2>
          <p className="text-gray-500 text-sm mb-6">Two-factor authentication is now active on your account.</p>
          <a
            href="/dashboard"
            className="block w-full py-2.5 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors"
          >
            Continue to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ── Setup screen ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <img src="/logo.png" alt="Holarc Health" className="h-10 mb-6" />

      {/* Step indicator */}
      <p className="text-xs text-teal-700 font-semibold tracking-wide uppercase mb-1">
        Account security · One-time setup
      </p>

      <h1 className="text-2xl font-semibold text-gray-900 mb-1 text-center">Set up Two-Factor Authentication</h1>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
        This account holds sensitive health information. 2FA is required for every user — please enrol an authenticator
        app to continue.
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-md space-y-6">
        {/* Step 1: Install app */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-1">Don't have an authenticator app yet?</p>
          <p className="text-xs text-gray-500 mb-3">
            {isMobile ? "Tap" : "Click"} below to install one, then come back here to scan the code.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Google Auth
            </a>
            <a
              href="https://authy.com/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Authy
            </a>
            <a
              href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Microsoft
            </a>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-2">
          <img
            src={qrCodeUrl}
            alt="Scan this QR code with your authenticator app to set up two-factor authentication. Use the setup key below if scanning is not possible."
            className="w-44 h-44 rounded-lg border border-gray-100"
          />
          <p className="text-xs text-gray-400 text-center">
            Scan with Google Authenticator, Authy, Microsoft Authenticator, or any TOTP app.
          </p>
        </div>

        {/* Manual setup key */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Setup key (for manual entry)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm tracking-wider text-gray-800 select-all overflow-hidden">
              {secretVisible ? secret : "•".repeat(secret.length)}
            </div>
            <button
              type="button"
              onClick={() => setSecretVisible((v) => !v)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
              aria-label={secretVisible ? "Hide secret key" : "Reveal secret key"}
            >
              {secretVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
              aria-label="Copy secret key"
            >
              {copied ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
            Save this key somewhere safe. You'll need it if you lose access to your authenticator app.
          </p>
        </div>

        {/* Verify form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="totp-code" className="block text-xs font-medium text-gray-600 mb-1.5">
              Enter the 6-digit code from your app
            </label>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center tracking-[0.5em] text-lg font-mono border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              autoComplete="one-time-code"
            />
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full py-3 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Verifying…" : "Verify & enable 2FA"}
          </button>
        </form>

        {/* Support + sign out */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
          <a href="mailto:support@holarchealth.com" className="text-teal-700 hover:underline">
            Need help? Contact support
          </a>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
