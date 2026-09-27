# spa-platform

Everything needed to host a single-page app on AWS (S3 + CloudFront) with Cloudflare DNS, deployed from GitHub Actions. Each site lives in its owner's AWS account, GitHub repository and Cloudflare account. This repo is the shared, versioned part they pin to.

> **Status:** pre-release. The first release will be `v1.0.0-rc.1`. Until then, pin a commit SHA.

## What's here

| Path                                                     | What                                                                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`modules/static-site`](modules/static-site)             | S3 + CloudFront + routing function + optional certificate + deploy role for one site                                        |
| [`modules/cloudflare-dns`](modules/cloudflare-dns)       | DNS records in a Cloudflare zone (certificate validation and domain records)                                                |
| [`modules/account-bootstrap`](modules/account-bootstrap) | Per-account setup: state bucket, GitHub OIDC provider, read-only plan role                                                  |
| [`tools/deploy`](tools/deploy)                           | Deploy tool: uploads a Vite build with the right caching, records each deploy, prunes safely, and smoke-tests the live site |

Coming before `v1.0.0-rc.1`: reusable GitHub workflows for CI and deploy, the CloudFormation template for granting contractor access, and onboarding guides.

## Using the modules

Pin a release tag (tags are immutable once published):

```hcl
module "site" {
  source = "github.com/arsw-dev/spa-platform//modules/static-site?ref=v1.0.0-rc.1"
  # ...
}
```

Each module's README covers its inputs, outputs and limits. [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) is a complete example: it's the first site built on this platform.

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
