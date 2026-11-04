# Companion session recovery (v1.7.2)

Step 4 connections now enable expired-session recovery. Credential-editor tests do not enable it.

On a managed portal load, and once a minute, the Companion inspects only that portal for a recognisable login form. Passwords are not retained after successful login. Holarc fetches fresh credentials through the existing authenticated credential service only while the same broker's Password Protector token remains valid. If the unlock expired, the existing Protector dialog is shown. OTP/email verification and CAPTCHA still require the broker.

Recovery uses the existing portal tab and its provider-controlled return URL. It never navigates to a new quote, replays a quote scenario or regenerates a PDF automatically. A rejected login, account lock, CAPTCHA, unexpected blocking dialog, timeout or Stop prevents further automatic credential attempts. Successful sign-in permits recovery of a later, distinct expiry. A duplicate recovery response cannot submit again.

Only metadata is persisted in extension session storage: initiating app, broker, integration, workflow, attempt, trusted origins, PDF routing and recovery state. A suspended extension worker can resume observation from that metadata. Trusted adviser tabs opened by an already managed portal inherit observation, without stealing focus. Independently opened tabs and pre-v1.7.2 connections are not adopted; connect from Holarc once after updating.

The Holarc app tab must remain open and signed in. Server-side credential checks continue to enforce the current account and unlock. There are no new permissions, database migrations or Edge Function deployments.

Validation: background recovery tests, native login-form probe tests, existing login/journey/interface tests and a synthetic browser check of unlocked recovery, duplicate suppression, broker isolation, expired-token unlock and Stop. Provider session recovery still needs a live check after installing the new extension.
