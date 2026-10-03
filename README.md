# spa-platform

Everything needed to host a single-page app on AWS (S3 + CloudFront) with Cloudflare DNS, deployed from GitHub Actions. Each site lives in its owner's AWS account, GitHub repository and Cloudflare account. This repo is the shared, versioned part they pin to.

> **Superseded, kept as a reference.** arsw.dev's client sites now run on Cloudflare Workers, in each client's own
> Cloudflare account, so this AWS setup won't get further releases: `v1.0.0-rc.2` is the last, and there will be no
> `v1.0.0`. [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) still runs on it until it moves to Workers too;
> after that, this repository is archived. Everything here still works as documented, at `v1.0.0-rc.2`.

## What's here

| Path                                                                         | What                                                                                                                                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`modules/static-site`](modules/static-site)                                 | S3 + CloudFront + routing function + optional certificate + deploy role for one site                                                                                         |
| [`modules/cloudflare-dns`](modules/cloudflare-dns)                           | DNS records in a Cloudflare zone (certificate validation and domain records)                                                                                                 |
| [`modules/account-bootstrap`](modules/account-bootstrap)                     | Per-account setup: state bucket, GitHub OIDC provider, read-only plan role                                                                                                   |
| [`tools/deploy`](tools/deploy)                                               | Deploy tool: uploads a Vite build with the right caching, records each deploy, prunes safely, and smoke-tests the live site                                                  |
| [`tools/contractor`](tools/contractor)                                       | Contractor's daily MFA session (`pnpm --filter contractor mfa-session`), which client profiles and Terraform use                                                             |
| [`.github/workflows/site-ci.yml`](.github/workflows/site-ci.yml)             | Reusable CI for site repos: lint, build, actionlint, Terraform fmt and plans, live routing-function test                                                                     |
| [`.github/workflows/site-deploy.yml`](.github/workflows/site-deploy.yml)     | Reusable deploy for site repos: build, deploy with `tools/deploy` at the same commit, smoke test                                                                             |
| [`cloudformation/contractor-role.yaml`](cloudformation/contractor-role.yaml) | Grants the contractor (arsw.dev) administrator access to a client's AWS account, requiring MFA and a per-client access code. Each release publishes it with a one-click link |

New sites start from [spa-template](https://github.com/arsw-dev/spa-template).

## Documentation

- **[Onboarding a client site](docs/onboarding.md):** the contractor's checklist, from gathering details to a live site on the client's domain.
- **Client guides**, written for non-technical owners: [AWS](docs/guides/aws.md), [GitHub](docs/guides/github.md), [Cloudflare](docs/guides/cloudflare.md).
- **[Runbook](docs/runbook.md):** rollback, restoring files, stuck state locks, the domain pre-flight, upgrading spa-platform, and more.
- Each module's README: inputs, outputs and limits.

## Using the modules

Pin a release tag (tags are immutable once published):

```hcl
module "site" {
  source = "github.com/arsw-dev/spa-platform//modules/static-site?ref=v1.0.0-rc.2"
  # ...
}
```

Each module's README covers its inputs, outputs and limits. [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) is a complete example: it's the first site built on this platform.

## Using the workflows

Site repos call the reusable workflows from their own `ci.yml` and `deploy.yml`, pinned to a release commit SHA with the version as a comment. Dependabot proposes new workflow pins; move the module `?ref=` tags to the same release in that PR ([runbook](docs/runbook.md#upgrade-spa-platform)). Each workflow file's header shows the caller, including the permissions it must grant. Keep an aggregate `CI Result` job in the site's own workflow as the required check, so the check's name doesn't depend on the platform.

The deploy workflow runs `tools/deploy` from the same spa-platform commit as the workflow itself (`job.workflow_sha`), so one pin covers both.

## Development

```sh
pnpm install
pnpm lint
pnpm --filter deploy typecheck && pnpm --filter deploy test
node --test "modules/static-site/functions/*.test.ts"
(cd modules/static-site && terraform init -backend=false && terraform test)   # likewise for the other modules
```

CI runs all of the above on every pull request. **CI Result** is the required check.

Requirements: Node 24, pnpm 11, Terraform 1.15.6.

## Releases

Pushing a `v*` tag runs `release.yml`:

1. It uploads `cloudformation/contractor-role.yaml` to `contractor-role/<tag>/` in the templates bucket. CloudFormation's one-click links only accept templates from S3, so this is the only public copy.
2. It creates the GitHub release; versions with a hyphen (`-rc.1`) are pre-releases.
3. The release notes include the one-click link to send a client, with `EXTERNAL_ID` replaced by their access code.

Published templates can't be replaced or deleted, just like tags.

## Versioning

[Semantic versioning](https://semver.org/). Breaking changes to module inputs, outputs or resource addresses bump the major version. See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
