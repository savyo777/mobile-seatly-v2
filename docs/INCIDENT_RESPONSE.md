# Incident response runbook

This document is for the moment when something has gone wrong and you need to act fast. Keep it short, keep it specific. Read it before you need it.

**The single most important rule:** don't panic, don't blindly revert. Confirm the incident is real, contain the immediate damage, THEN investigate the root cause.

---

## Roles + emergency contacts

Fill these in before launch. Print this section + post it on the wall.

| Role | Name | Email | Phone |
|---|---|---|---|
| Primary on-call | Steven Georgy | markhabbi2@gmail.com | _add when ready_ |
| Backup on-call | _add_ | _add_ | _add_ |
| Legal counsel (for breach disclosure) | _add_ | _add_ | _add_ |

**Vendor support lines:**
- Supabase support: https://supabase.com/support (paid plans get faster response)
- Stripe support: https://support.stripe.com (24/7 phone for Pro)
- Twilio support: https://help.twilio.com
- Apple Developer: https://developer.apple.com/contact

---

## Incident: Supabase service-role key leaked

**Signals:** key visible in a Slack message, screenshot, public repo commit, or third-party report.

**Impact:** anyone with the key has god-mode read+write on the entire database, bypassing all RLS.

**Immediate actions (in order, < 5 min total):**

1. **Rotate the key.**
   - Supabase Dashboard → Project Settings → API
   - Find **service_role** key → click **Roll** / **Regenerate**
   - Copy the new key.
2. **Update the new key everywhere it's used.**
   - Edge function secrets (Supabase Dashboard → Edge Functions → Settings → `SUPABASE_SERVICE_ROLE_KEY`)
   - Any CI / CD env that has it
   - Your local `.env`
3. **Audit for damage:**
   ```sql
   -- Check for unexpected rows added/modified since the leak window.
   select acting_role, table_name, operation, count(*)
   from public.audit_log
   where occurred_at > '<approximate leak time>'
   group by 1, 2, 3
   order by count desc;
   ```
4. If `audit_log` shows unexpected service-role writes: PITR-restore the affected tables (Supabase → Database → Point-in-Time Recovery) to just before the leak.
5. **Notify stakeholders** — depending on what was accessed, this may trigger data-breach notification obligations (GDPR: 72h; CCPA: "without unreasonable delay").

**Recovery validation:**
- Rotate complete = the old key returns 401 in `curl https://exbjodmnpdiayfzrdyux.supabase.co/rest/v1/restaurants -H "apikey: <OLD_KEY>"`
- Audit log scan shows no anomalies post-rotation.

---

## Incident: Stripe API key (sk_live_*) leaked

**Signals:** Stripe support emails you, key visible in logs/commits, customer reports unexpected charges.

**Impact:** attacker can charge any saved card on file, issue refunds, create transfers.

**Immediate actions (in order, < 10 min):**

1. **Roll the key.** Stripe Dashboard (Live mode) → Developers → API keys → Roll the secret key. Stripe gives you a grace period — the old key keeps working until you confirm the swap.
2. **Update every place that uses it:**
   - Supabase Edge Function secrets → `STRIPE_SECRET_KEY`
   - Any CI/CD env
   - Local `.env`
3. **Once new key is verified working: revoke the old key** (Stripe Dashboard → roll completion).
4. **Stripe Dashboard → Logs → API requests** — filter to recent activity with the old key. Look for any unfamiliar `charges.create` / `refunds.create` calls.
5. **Stripe Dashboard → Payments → All payments** — sort by most recent, look for anything you don't recognize. Refund any unauthorized charges to the customer immediately (Stripe → Refund button). Don't dispute via the chargeback path — refund preempts it.
6. **Rotate the webhook signing secret** too if the leak vector could have exposed it. Stripe → Developers → Webhooks → Roll.

**Recovery validation:**
- Test a real charge via the mobile app with the new key.
- Audit Stripe activity for the next 72 hours.

---

## Incident: customer account compromised (account takeover)

**Signals:** customer reports unauthorized bookings, unexpected charges, password reset email they didn't request.

**Immediate actions:**

1. **Sign them out of every session** (Supabase Dashboard → Authentication → Users → search by email → click user → "Sign out user").
2. **Reset their password** (same user page → "Send password reset").
3. **Forensics — check `auth_attempts`:**
   ```sql
   select email, attempted_at, success
   from public.auth_attempts
   where email = '<victim email>'
   order by attempted_at desc
   limit 20;
   ```
   Look for failed attempts followed by a success — credential stuffing.
4. **Forensics — check `audit_log`:**
   ```sql
   select * from public.audit_log
   where acting_user_id = (
     select id from public.user_profiles where email = '<victim>'
   )
   and occurred_at > now() - interval '30 days'
   order by occurred_at desc;
   ```
   Look for actions the legitimate user wouldn't have done.
5. **Refund any unauthorized bookings** that have already charged.
6. **If credential stuffing is confirmed:** the attacker has a list of email/password pairs. Set Supabase's "Prevent use of leaked passwords" toggle to ON if it isn't already, and force a password reset on every account that shares the leaked password (check via the HaveIBeenPwned API).

---

## Incident: database corruption / accidental DELETE

**Signals:** rows missing, data inconsistent, customer reports their data is gone.

**Immediate actions:**

1. **STOP writes** if the corruption is ongoing. Supabase Dashboard → Settings → Database → restart isn't ideal, but consider pausing the affected edge functions:
   ```bash
   # Disable the function temporarily
   # Dashboard → Edge Functions → click function → "Disable" if option exists
   # Otherwise rename it via CLI to break the route
   ```
2. **Identify the time window** — when did the bad change happen?
   ```sql
   select min(occurred_at), max(occurred_at), operation, count(*)
   from public.audit_log
   where table_name = '<affected table>'
     and occurred_at > now() - interval '7 days'
   group by operation
   order by min(occurred_at) desc;
   ```
3. **Restore via PITR** — Supabase Dashboard → Database → Point-in-Time Recovery. Pick a time JUST BEFORE the corruption window. You can restore the entire DB to a new project as a branch, or selectively restore tables.
4. **Take a snapshot of the corrupted state** before restoring — you may need it for the post-mortem.
5. **Communicate with affected customers** within the day. "We had an issue, we restored from backup, here's what may have changed since X timestamp."

---

## Incident: Twilio SMS pumping fraud

**Signals:** Twilio bill spikes overnight, hundreds of SMS attempts from your account to phone numbers in random countries.

**Impact:** could rack up thousands of dollars in a few hours. Twilio's SMS-pumping fraud is a known industry problem.

**Immediate actions (in order, < 10 min):**

1. **Twilio Console → Phone Numbers → Manage → Pause** the active phone number. This stops all outbound SMS instantly.
2. **Twilio → Billing → set a hard usage cap** (if you haven't already — you should before launch).
3. **Stop the source:** check which edge function fired the suspicious sends:
   ```sql
   select channel, count(*), min(sent_at), max(sent_at)
   from public.communication_log
   where sent_at > now() - interval '24 hours'
     and channel = 'sms'
   group by channel;
   ```
   And:
   ```sql
   select * from public.communication_log
   where channel = 'sms'
     and sent_at > now() - interval '1 hour'
   order by sent_at desc limit 100;
   ```
4. **Identify the abuse vector** — probably `send-waitlist-ready-sms` (rate-limited per user but could be hit by many compromised user accounts) or guest-booking confirmation SMS.
5. **File a dispute with Twilio** — they sometimes credit back fraud charges if reported quickly.
6. **Add stricter rate limits** to the offending function (lower per-user cap, add per-phone-number-cap).

---

## Incident: GitHub account compromised

**Signals:** unfamiliar commits/branches, password change you didn't request, SSH key you didn't add appears in your settings.

**Impact:** attacker can rewrite repo history, push malicious code that gets deployed via your CI/CD.

**Immediate actions:**

1. **Change your GitHub password** (https://github.com/settings/security).
2. **Enable 2FA** if it wasn't already on. Use an authenticator app, not SMS.
3. **Revoke all sessions** (https://github.com/settings/sessions) — kicks the attacker out of every active login.
4. **Revoke all OAuth tokens** (https://github.com/settings/applications) and **personal access tokens** (https://github.com/settings/tokens).
5. **Check Audit log** (https://github.com/savyo777/mobile-seatly-v2/settings/audit-log) for unauthorized actions.
6. **Force-push a known-good commit to main** if the attacker pushed bad code, AFTER you've audited the diff. Get a second pair of eyes if you're unsure.
7. **Rotate every secret the attacker could have read** — they could have downloaded the repo and seen the codebase. Time to rotate: Supabase service-role, Stripe secret, Twilio, OpenAI, etc.

---

## Incident: edge function malfunction (silent failure, wrong responses)

**Signals:** customer reports bookings aren't going through, charges aren't completing, payment confirmations missing.

**Immediate actions:**

1. **Check the function logs:**
   - Supabase Dashboard → Edge Functions → click function → Logs tab
   - Look for stack traces, 500 errors, timeouts
2. **Check the function version:** the deployed version may be ahead of what's in git if someone deployed without committing, or behind if a commit didn't deploy.
   ```bash
   npx supabase functions list --project-ref exbjodmnpdiayfzrdyux | grep <function>
   # Compare the `updated_at` to your git log
   ```
3. **Revert to the previous version** — Supabase keeps version history:
   - Dashboard → Edge Functions → click function → Versions tab
   - Pick a known-good version → "Activate"
4. **Once stable, debug the broken version locally** before redeploying.

---

## Routine: monthly security check

Every month, run this checklist:

- [ ] Re-run `mcp__claude_ai_Supabase__get_advisors` (security type). Compare to last month's output. Triage any new findings.
- [ ] Review `auth_attempts` for unusual patterns (high failures from same IP).
- [ ] Review `audit_log` for unusual service-role writes during business hours that you don't recognize.
- [ ] Check GitHub repo Security tab for new Dependabot / CodeQL / secret scanning alerts.
- [ ] Review GitHub repo collaborators + Stripe team + Supabase team — revoke anyone no longer needed.
- [ ] Rotate any API key that's been in use > 6 months.
- [ ] Test PITR restore — pick a random table, simulate a "what if I needed to restore this 3 days ago" exercise.

---

## Routine: after any incident

Within 7 days of resolving an incident:

1. **Post-mortem document** — `docs/incidents/YYYY-MM-DD-incident-name.md`
   - What happened (timeline)
   - Customer impact
   - Detection signal (what tipped you off)
   - Containment actions taken
   - Root cause
   - Permanent fix
2. **Add a regression test** — make sure the same thing can't happen again silently.
3. **Update this runbook** — if the playbook for this incident type was wrong or incomplete, fix it.
