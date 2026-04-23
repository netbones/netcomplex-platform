# Email Provider Comparison: Free Tiers

Comparison of transactional email providers for Soralia Village, focusing on free tier limits and developer experience.

## Summary

| Feature                    | MailerSend              | Resend            | SendGrid            |
| -------------------------- | ----------------------- | ----------------- | ------------------- |
| **Free emails/mo**         | 500                     | 3,000             | 100/day (~3,000/mo) |
| **Daily limit**            | 100 API requests        | 100 emails        | 100 emails          |
| **Unique recipient limit** | 2 (trial) / none (free) | None              | None                |
| **Domains**                | 1                       | 1                 | 1                   |
| **Templates**              | 1 (branded)             | Unlimited         | Unlimited (dynamic) |
| **Webhooks**               | 1                       | Unlimited         | Unlimited           |
| **Inbound email**          | Yes                     | Yes               | Yes (Inbound Parse) |
| **Node.js SDK**            | Yes (7 SDKs)            | Yes (13 SDKs)     | Yes                 |
| **SMTP relay**             | Yes                     | Yes               | Yes                 |
| **DKIM/SPF/DMARC**         | Yes                     | Yes               | Yes                 |
| **React Email support**    | No                      | Yes (first-class) | No                  |
| **Credit card on free**    | Required                | Not required      | Not required        |
| **Branded logo**           | Cannot remove           | No logo           | No logo             |
| **SOC 2 Type II**          | No                      | Yes               | Yes                 |
| **Data retention**         | 1 day                   | 30 days           | 30 days             |

## MailerSend

### Free Plan

- 500 emails/month
- 100 daily API requests
- 1 domain, 1 template, 1 webhook
- 1 user seat + 1 accountant
- 1-day activity & API log retention
- Credit card required (abuse prevention, no charge)
- Cannot remove MailerSend logo
- No SMS, no bulk email, no sender identities on free

### Trial Plan (separate from Free)

- 100 emails/month
- **2 unique recipients maximum** ← current blocker
- Free trial domain (no DNS setup needed)
- No credit card required
- Must upgrade to Free (add + verify domain) to remove recipient limit

### Paid Plans

| Plan         | Price/mo          | Emails/mo | Key additions                                           |
| ------------ | ----------------- | --------- | ------------------------------------------------------- |
| Hobby        | $7 ($5.60 yearly) | 5,000     | Bulk email, 5 seats, 3 templates                        |
| Starter      | $25               | 50,000    | Sender identities, SMS API, 10 domains, 250 templates   |
| Professional | $50+              | 50,000+   | Unlimited domains/templates/webhooks, dedicated AM, SLA |

### SDK Support

Node.js, Python, Java, Laravel, PHP, Go, Ruby + OpenAPI collection + MCP server

### Current Issues

- Trial account limited to 2 unique recipients — blocks testing with real users
- Node.js SDK (v2.8.0) had `gaxios` issues passing empty headers in Next.js/Turbopack env
- Required `spawn('curl')` workaround instead of SDK or Node fetch due to `InvalidArgumentError: invalid authorization header`

---

## Resend

### Free Plan

- 3,000 emails/month
- 100 emails/day
- 1 domain
- 30-day data retention
- Ticket support
- 5 AI credits/month

### Paid Plans

| Plan       | Price/mo | Emails/mo | Key additions                                     |
| ---------- | -------- | --------- | ------------------------------------------------- |
| Pro        | $20      | 50,000    | No daily limit, 10 domains                        |
| Pro        | $35      | 100,000   | No daily limit, 10 domains                        |
| Scale      | $90      | 100,000   | 1,000 domains, Slack support, dedicated IP add-on |
| Scale      | $160     | 200,000   | $0.80/1K overage                                  |
| Enterprise | Custom   | Custom    | Dedicated IPs, SSO, SLA, priority support         |

### All Plans Include

- RESTful API + SMTP relay
- Official SDKs (Node.js, Python, Ruby, Go, Rust, Java, .NET, PHP, Elixir, etc.)
- Inbound emails
- Batch sending
- Open & link tracking
- React Email (first-class integration)
- Multi-region
- DKIM/SPF/DMARC
- Webhooks
- SOC 2 Type II, GDPR, MFA, API key permissions

### Key Advantages

- **Best free tier**: 6x more emails than MailerSend, no unique recipient limits
- **React Email**: Build templates as React components — fits our React/Preact stack
- **Clean Node.js SDK**: Well-maintained, no gaxios/header issues
- **No credit card required** for free tier
- **No branding** on free tier emails
- **Next.js quickstart** guide available

---

## SendGrid

### Free Plan

- 100 emails/day (~3,000/month)
- 1 authenticated domain
- Email API + SMTP relay
- Dynamic templates (unlimited)
- 30-day data retention
- No credit card required

### Paid Plans

| Plan       | Price/mo | Emails/mo | Key additions                 |
| ---------- | -------- | --------- | ----------------------------- |
| Essentials | $14.95   | 50,000    | No daily limit, 1 subuser     |
| Pro        | $89.95   | 100,000   | Dedicated IP, 5 subusers, SSO |
| Premier    | Custom   | Custom    | Dedicated account team        |

### Key Considerations

- Owned by Twilio — heavier ecosystem, upsell pressure
- 100 emails/day is sufficient for dev but same as Resend with less modern DX
- No React Email integration
- Free tier has been historically stable but Twilio has changed terms before
- Sandbox mode for new accounts can delay sending

---

## Recommendation

### For Soralia Village (180 homes, dev/testing phase)

**Switch to Resend** for the following reasons:

1. **Free tier is 6x more generous** (3,000 vs 500 emails/mo) with no unique recipient limit
2. **React Email support** — build templates as React components instead of inline HTML strings
3. **No SDK/auth issues** — Resend's Node.js SDK works reliably in Next.js/Turbopack (no curl workarounds needed)
4. **No credit card required** — easier onboarding for new developers
5. **SOC 2 Type II** on free tier — important for a community portal handling PII
6. **Proven Next.js integration** — official quickstart guide

### Migration Path

If we switch:

1. Install `resend` npm package
2. Replace `src/lib/email/mailer-send.ts` with `src/lib/email/resend.ts` using the Resend SDK
3. Convert `src/lib/email/templates.ts` to React Email components
4. Remove `mailersend` npm package
5. Add `RESEND_API_KEY` to `.env.local`

The MailerSend `spawn('curl')` workaround can be fully eliminated — Resend's SDK uses standard `fetch` under the hood with no known header issues in Next.js.

### If Staying with MailerSend

Upgrade from Trial to Free plan (add + verify `netbones.co.za` domain, provide credit card) to remove the 2-recipient limit. The curl-based sender works correctly once the account is properly tiered.
