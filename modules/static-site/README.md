# static-site

Hosts a single-page app: a private S3 bucket behind CloudFront, with SPA routing, security headers, an optional custom-domain certificate, and a GitHub Actions deploy role.

## What it creates

- **S3 bucket.** Private (public access blocked), versioned, with old versions expiring after `noncurrent_version_retention_days`. Only this distribution can read it (OAC). CloudFront may also list it so missing files return 404, and it's denied `_deploys/*` (deploy records).
- **CloudFront distribution.** HTTPS only, TLS 1.2+ on custom domains, HTTP/2 and 3, AWS managed `CachingOptimized` and `SecurityHeadersPolicy`.
- **Routing function** (`functions/viewer-request.js`, a CloudFront Function):
  - Extensionless paths get `/index.html`.
  - `/.well-known/` passes through untouched.
  - `/_deploys/` is answered with 404.
  - Paths are matched URL-decoded.
- **ACM certificate** for `domains`, and a validation step that waits for issuance before CloudFront uses it.
- **Deploy role.** Only jobs in `github_environment` of `github_repo` (by its OIDC subject, `github_subject_prefix`) can assume it, and it can only touch this bucket and distribution.
- **Plan read grant** (when `plan_role_name` is set). The account's plan role may read this site's resources, by exact ARN.

## Usage

```hcl
provider "aws" {
  region = "us-east-1" # CloudFront only uses certificates from us-east-1
}

module "site" {
  source = "github.com/arsw-dev/spa-platform//modules/static-site?ref=v1.0.0-rc.2"

  name           = "acme"
  domains        = ["acme.com", "www.acme.com"]
  github_repo    = "acme-co/site"
  # GitHub's immutable subject for this repo: gh api repos/acme-co/site/actions/oidc/customization/sub --jq .sub_claim_prefix
  github_subject_prefix = "repo:acme-co@111111/site@222222"
  plan_role_name = module.bootstrap.plan_role_name # or the literal name from account-bootstrap

  # With cloudflare-dns creating the validation records in the same apply
  validation_record_fqdns = values(module.certificate_dns.record_names)
}
```

**Domain modes:**

| Mode              | Settings                                                                                                                                            | Result                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview           | `domains = []`                                                                                                                                      | Site at its `*.cloudfront.net` address; no certificate                                                                                                                              |
| DNS in Cloudflare | `domains = [...]`, records from `certificate_validation_records` and `domain_records` via two `cloudflare-dns` calls, `validation_record_fqdns` set | One apply: certificate, validation records, issuance, distribution, domain records                                                                                                  |
| DNS elsewhere     | `domains = [...]`, `attach_domains = false`                                                                                                         | Certificate requested and `certificate_validation_records` output; the distribution stays on its preview address. Add the records, then set `attach_domains = true` and apply again |

Validation records and domain records need **separate** `cloudflare-dns` calls. The domain records point at the distribution, which needs the validated certificate, which needs the validation records: one resource for both would be a dependency cycle.

The account's GitHub OIDC provider must already exist (see `account-bootstrap`).

## Inputs

| Name                                | Type           | Default                     | Description                                                                                                                                                                       |
| ----------------------------------- | -------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                              | `string`       | required                    | Short site identifier, used in resource names and tags                                                                                                                            |
| `github_repo`                       | `string`       | required                    | `owner/repo` allowed to deploy the site                                                                                                                                           |
| `github_subject_prefix`             | `string`       | `null`                      | The repo's OIDC subject prefix from GitHub (`repo:<owner>@<id>/<repo>@<id>` for repos with immutable subjects, GitHub's default for new repos). `null` means `repo:<github_repo>` |
| `domains`                           | `list(string)` | `[]`                        | Custom domains; the first is canonical. Empty runs the site on its preview address only. No wildcards or duplicates                                                               |
| `attach_domains`                    | `bool`         | `true`                      | Attach domains and certificate to CloudFront. Set `false` first when DNS is managed by hand                                                                                       |
| `validation_record_fqdns`           | `list(string)` | `null`                      | Names of validation records created in the same apply, so validation waits for them                                                                                               |
| `plan_role_name`                    | `string`       | `null`                      | The account's plan role. When set, the site grants it read access to its own resources                                                                                            |
| `github_environment`                | `string`       | `"production"`              | GitHub environment whose jobs may assume the deploy role                                                                                                                          |
| `bucket_name`                       | `string`       | `<name>-<account>-<region>` | S3 bucket name override                                                                                                                                                           |
| `noncurrent_version_retention_days` | `number`       | `7`                         | Days to keep overwritten or deleted site files                                                                                                                                    |
| `price_class`                       | `string`       | `"PriceClass_All"`          | CloudFront price class                                                                                                                                                            |
| `tags`                              | `map(string)`  | `{}`                        | Extra tags; `Name`, `site` and `managed_by` are always set                                                                                                                        |

## Outputs

| Name                                  | Description                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `bucket_name`, `bucket_arn`           | The site bucket                                                                                                                     |
| `distribution_id`, `distribution_arn` | The distribution; the ID is used for invalidations                                                                                  |
| `distribution_domain`                 | `*.cloudfront.net` domain, usable as a preview URL                                                                                  |
| `deploy_role_arn`                     | Role for the deploy workflow                                                                                                        |
| `certificate_arn`                     | ACM certificate, or `null` without domains                                                                                          |
| `certificate_validation_records`      | Per domain `{ name, type, value }` proving ownership, without ACM's trailing dots. Keep them in DNS permanently: renewals need them |
| `domain_records`                      | Per domain `{ name, type, value }` pointing it at CloudFront. An apex needs CNAME flattening or ALIAS/ANAME                         |
| `domains_attached`                    | Whether domains are attached (false while `attach_domains = false`)                                                                 |

## Limits and caveats

- **Region:** the certificate must be created in `us-east-1`; a precondition fails the plan otherwise. Without domains, any region works.
- **Sites per account:** each site adds about 1.2 KB of inline policy to the shared plan role, and IAM allows 10,240 characters per role, so an account holds roughly 7 sites.
- **Bucket listing:** CloudFront's `s3:ListBucket` is safe only because the routing function turns `/` into `/index.html` and query strings aren't forwarded. **Every cache behavior on this origin must run the routing function**, or it exposes a bucket listing.
- **Routes with a dot in the last segment** (`/writing/v1.2-notes`) are treated as files and return 404.
- **Unknown routes** get the SPA shell with 200 (soft 404s). The app should render a `noindex` view for them.
- **Existing DNS records** at the site names block the Cloudflare flow. See the onboarding pre-flight.

## Testing

- `terraform test` runs offline against a mocked provider.
- `node --test "functions/*.test.ts"` runs the routing cases in Node.
- `functions/test-live.sh` runs the same cases in CloudFront's own runtime against a deployed function: `FUNCTION_NAME=<name>-viewer-request functions/test-live.sh` (needs `cloudfront:DescribeFunction` and `cloudfront:TestFunction`).
