import { crypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";

export const PF_MODE = Deno.env.get("PAYFAST_MODE") === "live" ? "live" : "sandbox";
export const PF_HOST = PF_MODE === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za";
export const PF_MERCHANT_ID = Deno.env.get("PAYFAST_MERCHANT_ID") ?? "";
export const PF_MERCHANT_KEY = Deno.env.get("PAYFAST_MERCHANT_KEY") ?? "";
export const PF_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";

export async function md5(s: string) {
  const buf = await crypto.subtle.digest("MD5", new TextEncoder().encode(s));
  return encodeHex(new Uint8Array(buf));
}

// PayFast-style encoding: uppercase hex, spaces as +
export function pfEncode(v: string) {
  return encodeURIComponent(v.trim()).replace(/%20/g, "+").replace(/[!'()*~]/g, (c) =>
    "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/** Signature over ordered pairs (checkout form / ITN order). */
export async function signOrdered(pairs: [string, string][], passphrase = PF_PASSPHRASE) {
  let s = pairs.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
  if (passphrase) s += `&passphrase=${pfEncode(passphrase)}`;
  return md5(s);
}

/** API signature: alphabetically sorted, includes passphrase as a param. */
export async function signApi(params: Record<string, string>) {
  const all: Record<string, string> = { ...params };
  if (PF_PASSPHRASE) all.passphrase = PF_PASSPHRASE;
  const s = Object.keys(all).sort().map((k) => `${k}=${pfEncode(all[k])}`).join("&");
  return md5(s);
}
