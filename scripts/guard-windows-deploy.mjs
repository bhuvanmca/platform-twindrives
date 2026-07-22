// Refuse to deploy a worker built on Windows.
//
// opennextjs-cloudflare bakes host path separators into the server function
// (handler.mjs and .next/required-server-files.json reference ".next\\server\\
// pages-manifest.json"). Those paths do not resolve on the Workers runtime, so
// the handler cannot load its manifests and every route 500s. This shipped to
// production on 2026-07-17 and had to be rolled back the same day.
//
// Production builds run on Linux in CI (.github/workflows/deploy.yml), which is
// why CI does not call this script -- it invokes wrangler directly.

if (process.platform === "win32" && process.env.ALLOW_WINDOWS_DEPLOY !== "1") {
  console.error(
    [
      "",
      "Refusing to deploy: this build was produced on Windows.",
      "",
      "Windows-built workers 500 on all routes -- host path separators get baked",
      "into the server function and do not resolve on the Workers runtime.",
      "",
      "Deploy by pushing to main; CI builds on Linux and deploys from there.",
      "",
      "If you genuinely need to override this, set ALLOW_WINDOWS_DEPLOY=1.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
