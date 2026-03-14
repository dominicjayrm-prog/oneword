# OneWord Custom Email Templates — Setup Guide

## 1. Configure Custom SMTP (Namecheap → Supabase)

Go to your **Supabase Dashboard** → **Project Settings** → **Authentication** → **SMTP Settings** and enable **Custom SMTP**.

Enter these Namecheap Private Email SMTP settings:

| Setting           | Value                                    |
| ----------------- | ---------------------------------------- |
| **Sender email**  | `hello@playoneword.app`                  |
| **Sender name**   | `OneWord`                                |
| **Host**          | `mail.privateemail.com`                  |
| **Port**          | `465` (SSL) or `587` (TLS/STARTTLS)     |
| **Username**      | `hello@playoneword.app`                  |
| **Password**      | Your Namecheap email password            |
| **Minimum interval** | `30` seconds (recommended)            |

> **Tip:** Port `465` with SSL is usually the most reliable for Namecheap Private Email. If you have issues, try `587` with TLS.

## 2. Install Email Templates

Go to **Supabase Dashboard** → **Authentication** → **Email Templates**.

For each template type, paste the corresponding HTML file contents:

| Template Type       | File                       | Subject Line                                   |
| ------------------- | -------------------------- | ---------------------------------------------- |
| **Confirm signup**  | `confirm-signup.html`      | `Welcome to OneWord — Confirm your email`      |
| **Reset password**  | `reset-password.html`      | `Reset your OneWord password`                  |
| **Magic link**      | `magic-link.html`          | `Your OneWord sign-in link`                    |
| **Change email**    | `change-email.html`        | `Confirm your new email address — OneWord`     |
| **Invite user**     | `invite-user.html`         | `You've been invited to OneWord!`              |

### Template Variables

These templates use Supabase's Go template syntax:

- `{{ .ConfirmationURL }}` — The confirmation/action link (auto-populated by Supabase)

## 3. Test Your Setup

1. **Send a test reset password email** from your app (this is the most common flow)
2. **Check it arrives** from `hello@playoneword.app` (not the default Supabase sender)
3. **Verify the link works** — taps should open the app via deep link (`oneword://reset-password`)
4. **Check spam folder** — if emails land in spam, verify your DNS records (SPF, DKIM, DMARC)

## 4. DNS Records (If Not Already Set)

Make sure these DNS records exist for `playoneword.app` to improve deliverability:

### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:spf.privateemail.com ~all
```

### DKIM
Namecheap Private Email usually handles DKIM automatically. Check your Namecheap dashboard under **Private Email** → **DNS Settings** to verify.

### DMARC (Optional but Recommended)
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:hello@playoneword.app
```

## File Overview

```
supabase/email-templates/
├── SETUP.md              ← This file
├── confirm-signup.html   ← Email verification after signup
├── reset-password.html   ← Password reset (most important)
├── magic-link.html       ← Passwordless sign-in link
├── change-email.html     ← Confirm email address change
└── invite-user.html      ← Admin-sent invitation
```

## Brand Specs Used

- **Primary:** `#FF6B4A` (coral)
- **Background:** `#FFFDF7` (warm white)
- **Surface:** `#F5F0E8` (light tan)
- **Text:** `#1A1A2E` (dark navy)
- **Muted text:** `#8B8697` (gray-purple)
- **Border:** `#E8E3D9` (warm gray)
- **Fonts:** Georgia (headings), Helvetica Neue (body)
- **Border radius:** 12–16px (matching app design)
