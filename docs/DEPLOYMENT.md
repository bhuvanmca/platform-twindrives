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
the one that owns the `platform-twindrives` worker (developer@twincord.in,
account `6efa6fda…`):

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Workers Scripts: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from Workers & Pages → right sidebar |

A token from a *different* account fails with:

```
A request to the Cloudflare API (/accounts/.../workers/services/platform-twindrives) failed.
  Authentication error [code: 10000]
```

That message names neither the account mismatch nor the missing worker, which is
why it went unnoticed through every CI run up to 2026-07-19. If you see it, check
which account the token belongs to before assuming the permissions are wrong —
the step's own log prints it (`👋 You are logged in with an User API Token,
associated with the email …`).

### Rotating the secrets

Create the token at https://dash.cloudflare.com/profile/api-tokens using the
**Edit Cloudflare Workers** template, scoped to the twincord.in account. Then:

```sh
gh secret set CLOUDFLARE_API_TOKEN  --repo bhuvanmca/platform-twindrives
gh secret set CLOUDFLARE_ACCOUNT_ID --repo bhuvanmca/platform-twindrives
```

Both prompt for the value rather than taking it as an argument, which keeps it
out of shell history.

Verify against a PR first — a green *Upload preview version* proves the token can
reach the worker without touching production.

## Verifying a deploy

CI passing means the upload succeeded, not that the site works. After a
production run, check that routes return 200 and not 500 — the 07-17 outage
deployed cleanly and was broken.

Note that `wrangler.toml` declares no routes, so custom-domain mapping lives in
the Cloudflare dashboard and is *not* managed by `wrangler deploy`. If the worker
is ever recreated, the route has to be reattached there.

## Environment

`NEXT_PUBLIC_API_URL` is committed in `.env.production` on purpose — `NEXT_PUBLIC_*`
is inlined into the browser bundle at build time, so it is public regardless, and
keeping it in the repo stops CI and Workers Builds from drifting. The `/api/v1`
suffix is required; a bare host 404s at the gateway.
