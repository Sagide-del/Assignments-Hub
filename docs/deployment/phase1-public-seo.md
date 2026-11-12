# Phase 1: static SEO and public routing

This project is React/Vite hosted on S3/CloudFront. Do not migrate to Next.js or add an application server to render these pages.

## Build contract

`npm run build` in frontend runs its existing generators, TypeScript, Vite and static rendering. Outputs:

- `index.html`: actual homepage body, including H1, subtitle, respiratory image, Problem and How it works.
- `login/index.html` and `register/index.html`: account shells with unique titles and `noindex, nofollow` in the initial response.
- `app.html`: separate noindex shell for real authenticated application routes.
- `404.html`: readable branded error page.
- `routing-manifest.json` and `cloudfront-function.js`: routes generated from actual public HTML and the React route declarations. The function is rejected at build time if it exceeds AWS's 10 KB limit.

`node scripts/check-static-seo.mjs dist` checks the artifacts. Do not upload an unrendered Vite shell in place of the final output.

## Production routing

A CloudFront viewer-request function resolves public directory documents and known app URLs. Unknown URLs return HTTP 404 directly with a noindex error page. Missing assets return the origin error with HTTP 404; the old 403/404-to-200 homepage fallback is removed. Existing backend authentication and tenant access checks remain authoritative.

Sitemap upload is explicit, even when its bytes are unchanged, with `Cache-Control: public,max-age=86400`. Its exact CloudFront behaviour also caps caching at one day. Hashed assets retain their existing long-lived caching.

The verified publishing wrapper snapshots the previous distribution/function and S3 state. It checks edge permissions/configuration before uploading, tests function execution in AWS before association, and rolls back routing and files if live verification fails. It refuses to overwrite an unrelated viewer-request function/Lambda or a concurrently edited distribution.

## One-time AWS role setup

The existing OIDC role can upload files and invalidate CloudFront, but the checked-in setup policy does not grant function/distribution updates. The repository cannot grant its own AWS permissions. An AWS account owner must run the additive scoped setup once in AWS CloudShell:

```bash
curl -fsSL https://raw.githubusercontent.com/Sagide-del/Assignments-Hub/main/scripts/deployment/enable-frontend-routing.sh -o /tmp/assignmenthub-routing.sh && bash /tmp/assignmenthub-routing.sh
```

This grants only the named routing function and distribution actions to `AssignmentHubGitHubFrontendDeploy`. It does not expose credentials or change backend settings. Then rerun **Deploy frontend to AWS** on main. No broad administrator policy is needed. If this step has not happened, the deployment fails closed before publishing rather than claiming a working 404 configuration.

## Verification

- `npm run test:static-seo`
- `python3 -m unittest discover -s scripts/deployment -p frontend_edge_test.py -v` from the repository root
- Existing frontend and deployment rollback suites
- `AUTH_UI_BASE_URL=http://127.0.0.1:4196 node scripts/static-seo.browser.cjs` against built preview
- `node scripts/check-static-seo.mjs --live https://assignmenthub.co.ke` after deployment

The live check verifies homepage body without JS, account metadata on all login variants, actual 404 status and sitemap cache headers. No login credentials, payment requests, database migrations or new backend features are required for these checks.


## S3 snapshot format

Rollback snapshots store each S3 object as `objects/<SHA-256 of key>` with its original key, headers, metadata and content checksum in `state.json`. This preserves conflicting keys such as `blog`, `blog/` and `blog/index.html`, which cannot coexist as ordinary filesystem paths. A copy of the previous homepage remains at `previous/index.html` for comparison. Do not upload the snapshot folder as a directory: recover it with `frontend-snapshot.mjs restore <bucket> <origin-prefix> <snapshot-directory>`. The verified wrapper restores this snapshot together with the saved CloudFront configuration and public route aliases automatically.
