import fs from "fs";

const enPath = "src/i18n/locales/en.json";
const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));

// Ensure nested structure exists
if (!en.components) en.components = {};
if (!en.components.auth) en.components.auth = {};
if (!en.components.forms) en.components.forms = {};
if (!en.components.admissions) en.components.admissions = {};
if (!en.components.doctor) en.components.doctor = {};

// CRITICAL SECURITY FILES
en.components.auth.backup_codes = {
  title: "Save your backup codes",
  subtitle: "Last step · Save these codes",
  description: "Your authenticator app lives on your phone. If you lose your phone, you'll be locked out — unless you save these backup codes now.",
  description_secondary: "A backup code is a one-time password you type instead of the 6-digit code from your app. Each code works once, then disappears. Treat them like cash: store them somewhere safe — a note in your wallet, a printed sheet at home, or a password manager.",
  description_tertiary: "We're showing you 8 codes. You only need them if you lose your phone.",
  warning: "These codes won't be shown again. If you lose them, you'll have to contact support to get back into your account.",
  acknowledgement: "I've saved my backup codes somewhere safe.",
  continue_button: "Continue",
  copy_button: "Copy",
  download_button: "Save",
  print_button: "Print",
  copied_message: "Copied",
  copy_all_description: "All 8 codes copied to clipboard.",
  copy_failed: "Copy failed",
  copy_failed_description: "Long-press to copy manually.",
  file_title: "Holarc Health — Backup Codes",
  error_title: "Could not create backup codes",
};

en.components.auth.mfa_enroll = {
  title: "Set up Two-Factor Authentication",
  subtitle: "Account security · One-time setup",
  description: "This account holds sensitive health information. 2FA is required for every user — please enrol an authenticator app to continue.",
  generating: "Setting up 2FA…",
  qr_alt: "QR code for two-factor authentication setup. Scan with your authenticator app.",
  qr_description: "Scan this with Google Authenticator, Authy, Microsoft Authenticator, or any TOTP app.",
  setup_key_label: "Setup key (for manual entry)",
  show_key: "Show setup key",
  hide_key: "Hide setup key",
  copy_key_button: "Copy Setup Key",
  copy_key_button_copied: "Copied!",
  key_copied: "Secret key copied to clipboard.",
  key_copy_failed: "Long-press the key to copy it manually.",
  mobile_hint: "On a mobile phone? Copy this key and paste it into Google Authenticator under Enter a setup key.",
  save_key_warning: "Save this key somewhere safe. You'll need it if you lose access to your authenticator app.",
  code_label: "Enter the 6-digit code from your app",
  verify_button: "Verify & enable 2FA",
  verifying_button: "Verifying code…",
  code_error: "Enter the 6-digit code",
  code_error_detail: "Codes refresh every 30 seconds — open your authenticator app and try the newest 6-digit code.",
  code_error_title: "That code didn't work",
  success_title: "2FA enabled",
  success_description: "Your account is now protected.",
  enabled_message: "2FA enabled",
  taking_you_in: "Taking you in…",
  help_link: "Need help? Contact support",
  signout_button: "Sign out",
  error_title: "Could not start 2FA setup",
};

en.components.auth.mfa_apps = {
  dont_have_apps: "Don't have an authenticator app yet?",
  install_instructions: "Click below to install one of these authenticator apps, then come back here to scan the code.",
  install_instructions_mobile: "Tap below to install one of these authenticator apps, then come back here to scan the code.",
  google_android: "Google Authenticator — Android",
  google_iphone: "Google Authenticator — iPhone",
  authy: "Authy",
  microsoft: "Microsoft Authenticator",
};

en.components.auth.mfa_challenge = {
  title: "Two-Factor Verification",
  description: "Open your authenticator app and enter the 6-digit code for Holarc Health.",
  code_label: "Verification code",
  code_placeholder: "000000",
  verify_button: "Verify",
  verified_message: "Verified",
  verified_description: "Welcome back.",
  cancel_button: "Cancel and sign out",
  error_title: "Invalid code",
  error_detail: "The code didn't match. Try the next one.",
  error_title_verification: "Could not start verification",
};

en.components.auth.two_factor_setup = {
  error_title: "Error",
  error_invalid_code: "Invalid code",
  error_invalid_code_description: "Please enter a 6-digit verification code",
  error_failed_setup: "Failed to set up 2FA",
  code_label: "Enter the code from your authenticator app",
  verify_button: "Verify",
  verified_title: "2FA Enabled",
  verified_description: "Two-factor authentication has been enabled for your account",
  code_error: "That code didn't work",
  code_error_detail: "Codes refresh every 30 seconds — open your authenticator app and try the newest 6-digit code.",
  copied: "Copied",
  copy_key_button: "Copy Setup Key",
  key_copied: "Secret key copied to clipboard",
  key_copy_failed: "Long-press the key to copy it manually.",
  setup_key_label: "Setup key (for manual entry)",
  show_key: "Show setup key",
  hide_key: "Hide setup key",
  protection_note: "Your account is now protected",
};

en.components.auth.two_factor_verify = {
  title: "Two-Factor Authentication",
  description: "Enter the code from your authenticator app",
  code_label: "Verification Code",
  code_placeholder: "000000",
  error_title: "Invalid code",
  error_description: "Please enter a 6-digit verification code",
  verification_failed: "Verification failed",
  invalid_code: "Invalid verification code",
  cancel_button: "Cancel",
  verify_button: "Verify",
};

en.components.auth.password_strength = {
  label: "Password strength",
  unsafe_breached: "Unsafe (breached)",
  very_weak: "Very weak",
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
  excellent: "Excellent",
  rule_length: "At least 8 characters",
  rule_case: "Mixed upper & lower case",
  rule_number: "At least one number",
  rule_symbol: "At least one symbol",
  breached_warning: "Found in known data breaches — pick a different one",
  breached_safe: "Not found in known data breaches",
  tip: "Tip: avoid names, dictionary words, and passwords you've used on other sites — even with numbers/symbols added.",
};

en.components.auth.dev_login = {
  dev_only_label: "Dev only",
  button_text: "Sign in as NEMS dispatcher",
  signed_in_message: "Signed in as NEMS dispatcher",
  error_message: "Dev login failed",
  test_description: "Test the SOS pickup → destination hospital flow.",
};

en.components.auth.trial_signup = {
  consent_agreement: "Patient Consent and Authorization",
  business_associate: "Business Associate Agreement",
  accept_terms: "I have read and agree to the",
  and_the: "and the",
  terms_and_conditions: "Terms and Conditions",
};

// OTHER AUTH FORMS
en.components.auth.mfa_gate = {
  loading: "Loading...",
};

// FORM COMPONENTS
en.components.forms.phone_input = {
  placeholder: "82 123 4567",
};

en.components.admissions.nurse_picker = {
  label: "Nurse",
  no_hospital: "No hospital linked",
  loading: "Loading...",
  select_placeholder: "Select a nurse",
  no_nurses: "No nurses on roster yet.",
};

en.components.doctor.hospital_affiliations = {
  title: "Hospital Affiliations",
  description: "Add hospitals you serve at. Listed hospitals will see you in their staff directory. Unknown hospitals are submitted to admin for activation.",
  search_label: "Search or pick a registered hospital",
  search_placeholder: "Start typing or browse the list below…",
  role_label: "Your role",
  role_placeholder: "Visiting",
  loading_message: "Loading hospitals…",
  no_results: "No matching hospitals.",
  add_new_hospital_prefix: "Add \"",
  add_new_hospital_suffix: "\" as new hospital (pending admin activation)",
  success_added_prefix: "Added ",
  success_submitted: "Hospital submitted to admin for activation",
  no_affiliations: "No hospital affiliations added yet.",
  pending_review: "pending admin review",
  remove_aria: "Remove",
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 4));
console.log("Added Phase 5 Batch 1 keys to en.json");
