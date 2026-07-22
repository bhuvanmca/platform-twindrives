# Deployment

Production is a Cloudflare Worker built with `@opennextjs/cloudflare`. The only
supported way to ship is **push to `main`** — CI builds on Linux and runs
`wrangler deploy` (`.github/workflows/deploy.yml`).

Pull requests upload a preview version (`wrangler versions upload`) and never
promote it.

## Keep Cloudflare Workers Builds disconnected

The dashboard can also build this repo itself, via Workers & Pages → Settings →
Builds. **Leave that disconnected.** GitHub Actions is the only pipeline.

Connected, it fails on every push. Workers Builds detects Next.js and runs
`npm run build`, which is `next build` and emits only `.next/` — but
`wrangler.toml` points `main` at `.open-next/worker.js`, which nothing but
`opennextjs-cloudflare build` produces. The deploy step then cannot find its
entrypoint.

The failing build is the harmless half. The real hazard is that both pipelines
deploy the *same* worker, so whichever finishes last wins: a slow dashboard
build can overwrite a newer Actions deploy with older code, silently and
without failing. Symptom seen on 2026-07-22 — the dashboard showed a red
*Latest build failed* and an active deployment days older than the last green
Actions run, while production was in fact serving current code.

There is no way to fix this from the repo. The obvious idea — point `build` at
`opennextjs-cloudflare build` so Workers Builds emits the right output — does not
work: `opennextjs-cloudflare build` shells out to `npm run build` to produce the
Next output, so it calls itself until the process dies. A `postbuild` hook
recurses the same way. `build` must stay `next build`.

If you ever want the dashboard to own deploys instead, set its build command to
`npm run pages:build` and its deploy command to `npx wrangler deploy` — in the
dashboard, not here — then delete `.github/workflows/deploy.yml`. That loses the
secret validation and the Windows guard. Run one or the other, never both.

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
keeping it in the repo rather than in CI config means the value travels with the
source instead of living in a dashboard. The `/api/v1` suffix is required; a bare
host 404s at the gateway.
