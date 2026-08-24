# Frontend deployment

Cloudflare Workers Builds is the only automatic deployment pipeline for this
frontend. GitHub Actions deployment is intentionally paused in
`.github/workflows/deploy.yml` to prevent two pipelines from racing to update
the same Worker.

## Cloudflare dashboard configuration

Open **Workers & Pages → platform-twindrives → Settings → Builds** and connect
the GitHub repository `bhuvanmca/platform-twindrives`.

Configure the production build as follows:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

The Worker selected in the dashboard must be named `platform-twindrives`,
matching `name` in `wrangler.toml`. The build command produces
`.open-next/worker.js`, and the deploy command promotes it to the active Worker
deployment.

For branch previews, enable **Builds for non-production branches** and retain
the default preview deploy command:

```sh
npx wrangler versions upload
```

Do not add a GitHub deploy job while Cloudflare Builds is connected. Cloudflare
will report its build status back to GitHub, so a second GitHub Actions deploy
is unnecessary.

## Viewing deployments

Open **Workers & Pages → platform-twindrives → Deployments**. A successful
production build appears in version history and is promoted to **Active
Deployment**. Use **View build history** for build logs and select a version to
see its build details and preview URL.

If a push to `main` does not appear there, check:

1. The Git repository is connected under **Settings → Builds**.
2. The production branch is `main`.
3. The Worker name matches `wrangler.toml`.
4. The build command is `npm run build` and deploy command is
   `npx wrangler deploy`.
5. The Cloudflare GitHub App has access to this repository.

## Build environment

`NEXT_PUBLIC_API_URL` is committed in `.env.production` because Next.js embeds
`NEXT_PUBLIC_*` values in the browser bundle. The `/api/v1` suffix is required.

The build must run on Linux. Do not deploy a locally built Worker from Windows:
the OpenNext output can contain Windows path separators and fail at runtime.
`npm run pages:deploy` retains a guard against Windows deployment.

## Production URL and smoke test

The Worker is served from `workers.dev`; no custom domain is configured.

After a deployment, verify these routes in a Linux/macOS shell:

```sh
BASE=https://platform-twindrives.bhuvanmsc2023.workers.dev
for p in / /login /admins /colleges; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" -L "$BASE$p"
done
```

All four routes should return HTTP 200 after redirects.
