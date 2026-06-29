import fs from "fs";
import path from "path";

const files = [
  // Critical security
  "src/components/auth/BackupCodesScreen.tsx",
  "src/components/auth/MfaEnrollScreen.tsx",
  "src/components/auth/TwoFactorSetup.tsx",
  "src/components/auth/MfaChallengeScreen.tsx",
  "src/components/auth/TwoFactorVerify.tsx",
  // Other auth
  "src/components/auth/PasswordStrength.tsx",
  "src/components/auth/MfaGate.tsx",
  "src/components/auth/DevErLoginButton.tsx",
  "src/components/auth/TrialSignupSection.tsx",
  // Form components
  "src/components/forms/PhoneNumberInput.tsx",
  "src/components/admissions/NursePicker.tsx",
  "src/components/doctor/HospitalAffiliations.tsx",
];

// Regex patterns to find hardcoded strings
const patterns = [
  /title:\s*["'`]([^"'`]+)["'`]/g,
  /placeholder:\s*["'`]([^"'`]+)["'`]/g,
  /label:\s*["'`]([^"'`]+)["'`]/g,
  /aria-label:\s*["'`]([^"'`]+)["'`]/g,
  /alt:\s*["'`]([^"'`]+)["'`]/g,
  />"([^"'`<]+)<\/(?:Button|p|span|h\d|a|label)/g,
  /["'`]([A-Z][^"'`]{10,})["'`]/g, // capitalized strings (conservative)
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, "utf-8");
  console.log(`\n=== ${file} ===`);
  const strings = new Set();
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const str = match[1]?.trim();
      if (str && str.length > 0 && str.length < 200) {
        strings.add(str);
      }
    }
  });
  
  strings.forEach(str => {
    if (!["true", "false", "undefined", "null", "number", "string"].includes(str)) {
      console.log(`  - "${str}"`);
    }
  });
});
