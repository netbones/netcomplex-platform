---
title: Check
status: current
reviewed: 2026-07-28
tags: [standards, best-practices]
audience: developer
---

Don't skip this:
https://x.com/PrajwalTomar_/status/2080974596392837123

1. Protect yourself, not just your app. The moment you collect user data you're in legal territory (GDPR, CCPA). Have a privacy policy. Know where user data lives.

2. Row Level Security. Without RLS, anyone can open DevTools and read your entire database. Supabase → Auth → Policies. Zero policies means your app is naked. 5 min to fix.

3. Test the failure path, not just the happy path. Wrong password 5x. Reset for an email that doesn't exist. Verification link clicked twice. Signup with an existing email. Catches 80% of auth bugs.

4. Security baseline in 2 min. Prompt your AI: "Review my app as a security specialist and make sure I have strong security headers and a solid baseline security posture."

5. OWASP. Prompt: "Review my app against OWASP standards and highlight vulnerabilities." This is where SQL injection, XSS and auth bugs actually get caught.

6. Client-side validation is UX, not security. Attackers disable JS and hit your API directly. Validate again on the server. Every time.

7. AI code leaks data in 3 spots: .env values in the frontend, API responses returning too much, secrets in logs. Prompt: "Check my app for credential or sensitive data leaks in frontend or API routes."

8. API keys in the frontend means game over. If it's in the browser, assume it's already taken. Move it server-side or proxy it.

9. Rate limits before someone burns your API bill. Cap every endpoint hitting a paid API. I've watched a Supabase bill jump from $20 to $200 in a day.

10. CAPTCHA on public forms (Cloudflare Turnstile is free) plus CORS locked to your domain. 10 min, kills bot floods.

11. Error messages that don't leak. "User not found", not "SELECT \* FROM users failed". Log full errors server-side, show users generic messages.
