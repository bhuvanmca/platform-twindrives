# Deployment

Production is a Cloudflare Worker built with `@opennextjs/cloudflare`. The only
supported way to ship is **push to `main`** — CI builds on Linux and runs
`wrangler deploy` (`.github/workflows/deploy.yml`).

Pull requests upload a preview version (`wrangler versions upload`) and never
promote it.

## Do not deploy from Windows

`opennextjs-cloudflare` bakes host path separators into the server function, so a
Windows-built worker 500s on every route. This shipped on 2026-07-17 and was
rolled back the same day. `npm run pages:deploy` refuses on Windows; see
`scripts/guard-windows-deploy.mjs`.

## Credentials

Two repo secrets, both of which must belong to the **same** Cloudflare account —
**Bhuvanmsc2023@gmail.com's Account**, `b8f5c3fac14286cf6c5029f9b33c7b36`, which
owns the `platform-twindrives` worker:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Workers Scripts: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | `b8f5c3fac14286cf6c5029f9b33c7b36` |

If the two disagree, every deploy fails with:

```
A request to the Cloudflare API (/accounts/.../workers/services/platform-twindrives) failed.
  Authentication error [code: 10000]
```

This is what blocked production from 2026-07-17 to 2026-07-22: the token was
correct, but `CLOUDFLARE_ACCOUNT_ID` pointed at a different account, so the API
was asked for a worker that does not exist there. The message names neither the
mismatch nor the missing worker, which is why it survived every CI run in the
repo's history.

Reading the failing step's own log tells you both halves. It prints the token's
account in a table (`👋 You are logged in with an User API Token, associated with
the email …`), and — because Actions masks secret values wherever they appear —
the account ID shows as `***` when the secret matches that account and in
cleartext when it does not.

### Rotating the secrets

Create the token at https://dash.cloudflare.com/profile/api-tokens using the
**Edit Cloudflare Workers** template, scoped to the account above. Then:

```sh
gh secret set CLOUDFLARE_API_TOKEN  --repo bhuvanmca/platform-twindrives
gh secret set CLOUDFLARE_ACCOUNT_ID --repo bhuvanmca/platform-twindrives
```

Both prompt for the value rather than taking it as an argument, which keeps it
out of shell history.

Verify against a PR first — a green *Upload preview version* proves the token can
reach the worker without touching production.

## Verifying a deploy

CI passing means the upload succeeded, not that the site works. The 07-17 outage
deployed cleanly and 500'd on every route, so check the live site itself:

```sh
BASE=https://platform-twindrives.bhuvanmsc2023.workers.dev
for p in / /login /admins /colleges; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" -L "$BASE$p"
done
```

All four should be 200. A 500 across the board is the Windows-build signature.

The worker is served from `workers.dev` only — there is no custom domain, and
`wrangler.toml` declares no routes. `workers_dev` and `preview_urls` are set
there explicitly: both were already on by default, but stating them keeps the
production URL out of the hands of a future default change. Note that preview
URLs are publicly reachable, so a version uploaded by a PR is browsable by
anyone who has the link. If a custom domain is ever added, put it in
`wrangler.toml` too, so it is version-controlled rather than dashboard-only.

## Environment

`NEXT_PUBLIC_API_URL` is committed in `.env.production` on purpose — `NEXT_PUBLIC_*`
is inlined into the browser bundle at build time, so it is public regardless, and
keeping it in the repo stops CI and Workers Builds from drifting. The `/api/v1`
suffix is required; a bare host 404s at the gateway.
