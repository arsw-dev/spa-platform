# spa-platform

Everything needed to host a single-page app on AWS (S3 + CloudFront) with Cloudflare DNS, deployed from GitHub Actions. Each site lives in its owner's AWS account, GitHub repository and Cloudflare account. This repo is the shared, versioned part they pin to.

> **Status:** pre-release. The first release will be `v1.0.0-rc.1`. Until then, pin a commit SHA.

## What's here

| Path                                                                     | What                                                                                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`modules/static-site`](modules/static-site)                             | S3 + CloudFront + routing function + optional certificate + deploy role for one site                                        |
| [`modules/cloudflare-dns`](modules/cloudflare-dns)                       | DNS records in a Cloudflare zone (certificate validation and domain records)                                                |
| [`modules/account-bootstrap`](modules/account-bootstrap)                 | Per-account setup: state bucket, GitHub OIDC provider, read-only plan role                                                  |
| [`tools/deploy`](tools/deploy)                                           | Deploy tool: uploads a Vite build with the right caching, records each deploy, prunes safely, and smoke-tests the live site |
| [`.github/workflows/site-ci.yml`](.github/workflows/site-ci.yml)         | Reusable CI for site repos: lint, build, actionlint, Terraform fmt and plans, live routing-function test                    |
| [`.github/workflows/site-deploy.yml`](.github/workflows/site-deploy.yml) | Reusable deploy for site repos: build, deploy with `tools/deploy` at the same commit, smoke test                            |

Coming before `v1.0.0-rc.1`: the CloudFormation template for granting contractor access, a site template repo, and onboarding guides.

## Using the modules

Pin a release tag (tags are immutable once published):

```hcl
module "site" {
  source = "github.com/arsw-dev/spa-platform//modules/static-site?ref=v1.0.0-rc.1"
  # ...
}
```

Each module's README covers its inputs, outputs and limits. [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) is a complete example: it's the first site built on this platform.

## Using the workflows

Site repos call the reusable workflows from their own `ci.yml` and `deploy.yml`, pinned to a release commit SHA with the version as a comment (Dependabot keeps it updated). Each workflow file's header shows the caller, including the permissions it must grant. Keep an aggregate `CI Result` job in the site's own workflow as the required check, so the check's name doesn't depend on the platform.

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

## Versioning

[Semantic versioning](https://semver.org/). Breaking changes to module inputs, outputs or resource addresses bump the major version. See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
