# Deployment

Production is a Cloudflare Worker built with `@opennextjs/cloudflare`. The only
supported way to ship is **push to `main`** — CI builds on Linux and runs
`wrangler deploy` (`.github/workflows/deploy.yml`).

Pull requests upload a preview version (`wrangler versions upload`) and never
promote it.

## Keep Cloudflare Workers Builds disconnected

The dashboard can also build this repo itself, via Workers & Pages → Settings →
Builds. **Leave that disconnected.** GitHub Actions is the only pipeline.

This is no longer because the build is broken. As of #5, `build` is
`next build && opennextjs-cloudflare build --skipNextBuild` with
`output: "standalone"` in `next.config.ts`, so `npm run build` emits
`.open-next/worker.js`. A connected Workers Builds — which runs `npm run build`
then `npx wrangler deploy` — therefore now succeeds. (Before #5, `build` was
just `next build`, which emitted only `.next/` while `wrangler.toml` points
`main` at `.open-next/worker.js`, so the deploy step could not find its
entrypoint. That is the "Could not find compiled Open Next config" failure in
any dashboard build dated before 2026-07-22 21:20 — a stale log, not the current
state.)

Keep it disconnected anyway, because a green build does not remove the hazard:
both pipelines deploy the *same* worker, so whichever finishes last wins. A slow
dashboard build can overwrite a newer Actions deploy with older code, silently
and without failing. Symptom seen on 2026-07-22 — the dashboard showed a red
*Latest build failed* and an active deployment days older than the last green
Actions run, while production was in fact serving current code. Now that the
dashboard build passes, the red X is gone but the race is not — pick one
pipeline.

Historical note: an earlier version of this doc claimed the build could not be
fixed from the repo, because pointing `build` at `opennextjs-cloudflare build`
makes it shell out to `npm run build` and recurse until the process dies. #5
broke that cycle: `--skipNextBuild` stops the recursion, and `output: "standalone"`
supplies the standalone `.next` that `--skipNextBuild` would otherwise leave
missing. The build side is fixed; the disconnect advice stands on the race, not
on a broken build.

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
