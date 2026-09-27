# account-bootstrap

One-time setup for an AWS account that hosts sites: the Terraform state bucket, the GitHub Actions OIDC provider, and a read-only role for pull-request plans.

## What it creates

- **State bucket.** Versioned, encrypted, public access blocked, `prevent_destroy`. It keeps the last 5 old versions of each file; older ones expire after 30 days.
- **GitHub OIDC provider** (unless `create_github_oidc_provider = false`). AWS allows one per account, so reuse an existing one.
- **Plan role** (`<name>-terraform-plan`):
  - Only pull requests on `github_repo` can assume it.
  - It can read the listed `state_keys`, the state bucket's settings, the OIDC provider and itself.
  - It **writes nothing**, so CI must plan with `-lock=false`.
  - Each site grants it read access to that site's resources (`static-site`'s `plan_role_name`).

## Usage

```hcl
module "bootstrap" {
  source = "github.com/arsw-dev/spa-platform//modules/account-bootstrap?ref=v1.0.0-rc.1"

  name              = "acme"
  state_bucket_name = "acme-tfstate-<account id>-us-east-1"
  github_repo       = "acme-co/site"
  state_keys        = ["bootstrap/terraform.tfstate", "site/terraform.tfstate"]
}
```

**First apply (chicken and egg).** The state bucket doesn't exist yet, so apply this root with local state first. Then add its `backend "s3"` block and run `terraform init -migrate-state` to move the state into the bucket it just created.

**Adding a Terraform root later:** add its state key to `state_keys` and apply, or its PR plans are denied.

## Inputs

| Name                          | Type           | Default  | Description                                                               |
| ----------------------------- | -------------- | -------- | ------------------------------------------------------------------------- |
| `name`                        | `string`       | required | Prefix for account-level names (the plan role)                            |
| `state_bucket_name`           | `string`       | required | Terraform state bucket                                                    |
| `github_repo`                 | `string`       | required | `owner/repo` whose pull requests may assume the plan role                 |
| `state_keys`                  | `list(string)` | required | State keys the plan role may read, one per root; exact keys, no wildcards |
| `create_github_oidc_provider` | `bool`         | `true`   | Set `false` if the account already has GitHub's OIDC provider             |
| `tags`                        | `map(string)`  | `{}`     | Extra tags; `managed_by` is always set                                    |

## Outputs

| Name                       | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `state_bucket_name`        | The state bucket                                |
| `github_oidc_provider_arn` | The OIDC provider, created here or pre-existing |
| `plan_role_arn`            | Role for the plan workflow                      |
| `plan_role_name`           | Pass to `static-site`'s `plan_role_name`        |

## Notes

- **Trust is by repository name** (`repo:<owner>/<repo>:pull_request`). Renaming or transferring the repo breaks it until `github_repo` is updated, and a trust left pointing at a freed name could match whoever registers it next.
- The plan role's permissions come from the API calls plans actually make. Before a provider upgrade, capture the new provider's calls (`TF_LOG=debug terraform plan`) and check them against the grants.
