# Email Verification Module

A Node.js module that verifies whether an email address is **valid**, **invalid**, or **unknown** — by checking syntax, detecting domain typos, resolving DNS MX records, and probing the mailbox over SMTP.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run all tests
npm test

# 3. Try it manually (optional)
node -e "
const { verifyEmail } = require('./index');
verifyEmail('user@gmial.com').then(console.log);
"
```

---

## Try the Live API

The module is hosted and accessible via a REST API. You can test it directly without any setup.

**Base URL:** `https://warewe.onrender.com`

---

### Option 1 — Browser (simplest)

Just paste any of these URLs into your browser:

```
https://warewe.onrender.com/verify?email=user@gmail.com
https://warewe.onrender.com/verify?email=user@gmial.com
https://warewe.onrender.com/verify?email=notanemail
https://warewe.onrender.com/verify?email=user@fakexyz999.com
```

---

### Option 2 — curl (terminal)

```bash
# Valid domain — triggers DNS + SMTP probe
curl "https://warewe.onrender.com/verify?email=user@example.com"

# Typo detection — returns didyoumean suggestion instantly
curl "https://warewe.onrender.com/verify?email=user@gmial.com"

# Bad syntax — rejected before any network call
curl "https://warewe.onrender.com/verify?email=notanemail"

# POST request with JSON body
curl -X POST https://warewe.onrender.com/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "user@gmail.com"}'
```

---

### What each test case demonstrates

| Email to test | What it shows |
|---|---|
| `user@gmial.com` | Typo detected → `didyoumean: user@gmail.com` |
| `user@gmail.com` | Known provider → `smtp_not_supported` (fast) |
| `notanemail` | Syntax rejection → `missing_at_symbol` |
| `us..er@example.com` | Syntax rejection → `invalid_local_part` |
| `user@fakexyz999.com` | DNS failure → `dns_error` or `no_mx_records` |
| `user@@example.com` | Syntax rejection → `multiple_at_symbols` |

---

## How It Works

When you call `verifyEmail(email)`, it runs through a pipeline of checks in order:

```
Input
  │
  ▼
1. Syntax Validation       → rejects malformed emails immediately
  │
  ▼
2. Typo Detection          → catches common misspellings like gmial.com → gmail.com
  │
  ▼
3. DNS MX Lookup           → checks if the domain has mail servers
  │
  ▼
4. SMTP Probe              → connects to the mail server and checks if the mailbox exists
  │
  ▼
Structured JSON Response
```

Each step can short-circuit the pipeline and return a result immediately — so if the syntax is wrong, no DNS lookup happens; if a typo is detected, no SMTP probe fires.

---

## Project Structure

```
├── config/
│   └── constants.js              # SMTP timeout, max email length, common domains
├── helpers/
│   ├── levenshtein.js            # Edit-distance algorithm for typo detection
│   └── responseBuilder.js        # Builds the final response object
├── services/
│   ├── domainService.js          # Resolves DNS MX records for a domain
│   ├── smtpService.js            # Opens a raw TCP socket and runs the SMTP handshake
│   └── typoService.js            # Compares domain against common providers (edit distance ≤ 2)
├── validators/
│   └── emailSyntaxValidator.js   # Format checks before any network calls
├── tests/
│   ├── verifyEmail.test.js       # Integration tests for the full pipeline
│   ├── emailSyntaxValidator.test.js
│   └── typoService.test.js
├── verifyEmail.js                # Orchestrates the full pipeline
└── index.js                      # Public exports
```

---

## Running the Tests

### Prerequisites

- Node.js v18+
- npm

### Install & Run

```bash
npm install
npm test
```

### What to expect

All 29 tests should pass. You'll see output grouped by file:

```
PASS tests/emailSyntaxValidator.test.js
PASS tests/typoService.test.js
PASS tests/verifyEmail.test.js
```

---

## Response Format

Every call returns a consistent JSON object:

```json
{
  "email": "user@example.com",
  "result": "valid",
  "resultcode": 1,
  "subresult": "mailbox_exists",
  "domain": "example.com",
  "mxRecords": ["mx1.example.com", "mx2.example.com"],
  "executiontime": 0.312,
  "error": null,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

When a typo is detected, a `didyoumean` field is added:

```json
{
  "email": "user@gmial.com",
  "result": "invalid",
  "resultcode": 6,
  "subresult": "typo_detected",
  "didyoumean": "user@gmail.com"
}
```

### Result Codes

| `resultcode` | `result`  | When it's returned                              |
|--------------|-----------|-------------------------------------------------|
| `1`          | `valid`   | SMTP confirmed the mailbox exists               |
| `3`          | `unknown` | DNS failure, timeout, greylisting, etc.         |
| `6`          | `invalid` | Bad syntax, typo detected, or SMTP 550 rejection|

### All Subresults

| Subresult                  | Triggered by                                        |
|----------------------------|-----------------------------------------------------|
| `mailbox_exists`           | SMTP 250 on RCPT TO                                 |
| `mailbox_does_not_exist`   | SMTP 550–553 on RCPT TO or MAIL FROM                |
| `typo_detected`            | Domain edit-distance ≤ 2 from a known provider      |
| `invalid_type`             | Input is not a string (`null`, `undefined`, etc.)   |
| `empty_string`             | Input is empty after trimming                       |
| `missing_at_symbol`        | No `@` in the email                                 |
| `multiple_at_symbols`      | More than one `@`                                   |
| `invalid_local_part`       | Leading/trailing dot or `..` in the local part      |
| `invalid_domain_part`      | Leading/trailing dot or `..` in the domain          |
| `email_too_long`           | Exceeds 254 characters (RFC 5321)                   |
| `regex_mismatch`           | Fails the final format regex                        |
| `missing_local_or_domain`  | Nothing before or after `@`                         |
| `dns_error`                | MX lookup threw an error                            |
| `no_mx_records`            | Domain exists but has no MX records                 |
| `greylisted`               | SMTP 450 response (try again later)                 |
| `smtp_temporary_error`     | SMTP 421/451/452 response                           |
| `smtp_unexpected_response` | Unrecognised SMTP response code                     |
| `connection_timeout`       | Socket timed out before completing the handshake    |
| `connection_error`         | Could not connect to the MX host                    |
| `connection_closed`        | Server closed the connection before finishing       |
| `smtp_not_supported`       | Domain blocks SMTP probing (Gmail, Outlook, etc.)   |

---

## What Each Test File Covers

**`emailSyntaxValidator.test.js`** — unit tests for syntax checking only, no network involved:
- Accepts a correctly formatted email
- Rejects missing `@`, multiple `@`, double dots, empty string, `null`, `undefined`, oversized email

**`typoService.test.js`** — unit tests for typo detection:
- Suggests `gmail.com` for `gmial.com`, `yahoo.com` for `yahooo.com`, etc.
- Returns `null` for an already-correct domain
- Returns `null` for a domain unrelated to common providers

**`verifyEmail.test.js`** — integration tests for the full pipeline using mocked dependencies:
- Happy path: valid MX + SMTP 250 → `valid`
- SMTP 550 → `invalid / mailbox_does_not_exist`
- SMTP 450 → `unknown / greylisted`
- Connection timeout → `unknown / connection_timeout`
- Typo in domain → `invalid / typo_detected` (never reaches DNS)
- Empty string / null / undefined / bad format → `invalid` with correct subresult
- DNS lookup failure → `unknown / dns_error`
- No MX records → `unknown / no_mx_records`
- MX records sorted by priority before probing
- Falls back to second MX when the first one fails

