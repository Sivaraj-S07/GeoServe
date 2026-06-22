# GeoServe Security Guide

## Secrets & Environment Variables

| Variable        | Required | Notes |
|-----------------|----------|-------|
| `JWT_SECRET`    | ✅ Yes   | Min 32 chars. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `COOKIE_SECRET` | Recommended | Different from JWT_SECRET for defence-in-depth |
| `CORS_ORIGIN`   | ✅ Yes in prod | Comma-separated list of allowed frontend origins |
| `NODE_ENV`      | ✅ Yes in prod | Set to `production` — disables stack traces in API errors |

## HTTPS

- Both frontend apps deploy to Vercel — HTTPS is automatic.
- Backend (Render/Railway): HTTPS is provided by the platform.
- `vercel.json` includes `Strict-Transport-Security` (HSTS) with a 2-year max-age and preload.

## Security Headers (applied via Helmet + Vercel headers)

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Restricts scripts/styles to `'self'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Permissions-Policy` | Blocks camera/mic; geolocation only from self |

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| All `/api/*` routes | 200 req / 15 min per IP |
| `/api/auth/login` | 20 req / 15 min (failed only) |
| `/api/auth/signup` | 20 req / 15 min |

## Cookie Management

- Auth tokens can be stored in `sessionStorage` (default) or `localStorage` (persist mode).
- The backend sends `withCredentials: true` — cookies are `SameSite=Strict` by default from the browser.
- Cookie secret is separate from JWT secret for defence-in-depth.

## Dependency Audit

Run regularly:
```bash
cd backend && npm audit
cd frontend && npm audit
cd admin-panel && npm audit
```
