# Runbook

How to operate a site built on spa-platform when something goes wrong or needs changing. It assumes the layout of [spa-template](https://github.com/arsw-dev/spa-template): `infra/bootstrap/` (account setup) and `infra/` (the site).

Commands run from the site repo's root, with AWS credentials that have admin rights on the site's account. For `infra/`, also set `CLOUDFLARE_API_TOKEN` to a DNS:Edit token for the zone.

Names come from Terraform. `terraform -chdir=infra output` gives the site bucket (`s3_bucket`) and distribution (`cloudfront_distribution_id`). `terraform -chdir=infra/bootstrap output` gives the state bucket (`state_bucket_name`). The examples use shell variables for them:

```sh
SITE_BUCKET=$(terraform -chdir=infra output -raw s3_bucket)
DISTRIBUTION=$(terraform -chdir=infra output -raw cloudfront_distribution_id)
STATE_BUCKET=$(terraform -chdir=infra/bootstrap output -raw state_bucket_name)
```

## Roll back a bad deploy

**Preferred: revert and merge.** Revert the bad change on a branch (`git revert <sha>`), open a PR, and merge once CI Result is green. The merge deploys the reverted code, and the smoke test confirms it's live.

**Faster: re-run an earlier Deploy.** In GitHub → Actions → Deploy, open the last good run and choose _Re-run all jobs_. It rebuilds and deploys _that run's commit_, with _that commit's_ workflow and spa-platform version. So only do this for recent runs, which use the current spa-platform version. The next merge to `main` deploys `main` again, so follow up with a revert anyway.

Either way, the previous build's hashed assets are still in the bucket (pruning keeps the last 3 builds and anything replaced within 7 days), so tabs open on any recent build keep working.

## Recover an overwritten or deleted file

The site bucket is versioned; old versions are kept for 7 days.

```sh
aws s3api list-object-versions --bucket "$SITE_BUCKET" --prefix index.html \
  --query '{versions: Versions[].[VersionId, LastModified, IsLatest], deleted: DeleteMarkers[].[VersionId, LastModified]}'

# Restore a version by copying it over the current one
aws s3api copy-object --bucket "$SITE_BUCKET" --key index.html --copy-source "$SITE_BUCKET/index.html?versionId=<VersionId>"

# Make CloudFront pick it up (root files revalidate anyway; this is belt and braces)
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*"
```

A file restored this way is replaced again by the next deploy if the build still contains a different version of it.

## Terraform says the state is locked

Terraform locks state with a file next to it (`<state key>.tflock`). A crashed or killed run can leave it behind, and every later plan or apply fails with "Error acquiring the state lock". CI plans run with `-lock=false` and can't write lock files, so a stuck lock comes from a workstation run.

1. See who holds it. The state key is in the root's `backend "s3"` block, for example `site/terraform.tfstate`:
   ```sh
   aws s3 cp "s3://$STATE_BUCKET/site/terraform.tfstate.tflock" - | jq '{ID, Operation, Who, Created}'
   ```
2. Make sure that run is really over: check no `terraform` is still running on the machine in `Who`.
3. Remove it from the root that owns that state:
   ```sh
   cd infra            # or infra/bootstrap for bootstrap/terraform.tfstate
   terraform force-unlock <ID>
   ```

Never force-unlock a lock whose run might still be going. Two runs writing the same state can corrupt it.

## CI Plan fails on Cloudflare

- _"CLOUDFLARE_API_TOKEN is empty"_: the token must be a **repository** secret (Settings → Secrets and variables → Actions → Repository secrets). The Plan job doesn't run in the `production` environment, so environment secrets never reach it.
- _"Missing X-Auth-Key, X-Auth-Email or Authorization headers"_ locally: your shell doesn't have `CLOUDFLARE_API_TOKEN`. Open a new terminal or load it again.
- _Authentication errors with a token set_: the token may have expired or been rolled. CI's token needs DNS:Read on the zone; the local one needs DNS:Edit.

## Onboard a domain (pre-flight)

The one-apply Cloudflare flow requests the certificate, creates its validation records, waits for issuance, creates the distribution, then points the domains at it. Check these first, or that apply fails partway:

1. **The zone is active.** In Cloudflare the zone shows _Active_, meaning the nameservers have switched. On a _pending_ zone, records exist but aren't served, so validation waits until it times out (75 minutes).
2. **The site names are free.** There's no A, AAAA or CNAME record at the apex or `www` (or whichever names the site uses). Cloudflare won't create a second one, so the apply fails after the certificate and distribution are made. If the domain already hosts a website, choose one:
   - Import the existing records into the site's DNS module (`import { to = module.site_dns.cloudflare_dns_record.this["<domain>"], id = "<zone id>/<record id>" }`), so the apply updates them in place and switches over with no gap.
   - Or delete them just before the apply, accepting a short outage.
3. **CAA allows Amazon.** If the zone has CAA records, one must allow `amazon.com` (for example `0 issue "amazon.com"`). Otherwise ACM can't issue and validation waits until it times out.
4. **Other records are yours to keep.** Email (MX, SPF, DKIM) and anything else stay untouched. Terraform only manages the records the site's DNS modules create or import.

With DNS managed elsewhere, use `attach_domains = false` first. The apply requests the certificate and outputs `certificate_validation_records`. Add those records, and the `domain_records` CNAMEs once you're ready to switch, then set `attach_domains = true` and apply again.

## Upgrade spa-platform

A site pins spa-platform in two places:

- **Modules:** the `?ref=` of every module `source` in `infra/`, set to the release tag (`?ref=v1.0.0`). Release tags are immutable (a ruleset forbids moving or deleting them).
- **Workflows:** `.github/workflows/ci.yml` and `deploy.yml` call the reusable workflows at the release's commit SHA, with the tag as a comment (`@<sha> # v1.0.0`). GitHub requires actions and reusable workflows to be pinned by SHA.

Keep both on the same release. Dependabot only proposes the workflow pin, so treat its PR as the reminder to move the module refs in the same PR. A short-lived mismatch still works, but nothing tests the pairing.

1. Read the [CHANGELOG](../CHANGELOG.md) between the two versions. A major version bump means breaking changes, with migration notes.
2. Update both pins to the release.
3. `terraform init` in each root (the module source changed), then plan both. Apply if the plan is what the changelog describes.
4. Open a PR. CI runs the new workflows, and merging deploys with the new deploy tool.

## Pull requests from forks

Site repos are public, so anyone can open a PR from a fork. GitHub gives fork PRs no OIDC token and no secrets, so the Plan job can't run and **CI Result fails**. That's deliberate: it fails closed. To take an outside change, push it to a branch in the repository and open the PR from there, after reading it: the Plan job runs the branch's Terraform with the plan role.

## Add another Terraform root

The CI plan role can only read state files it's told about.

1. Pick the new root's backend key (for example `staging/terraform.tfstate`).
2. Add it to `state_keys` in `infra/bootstrap/main.tf` and apply `infra/bootstrap`.
3. If the root manages a site, pass `plan_role_name` to `static-site` so the plan role can read that site's resources.
4. Add the root to `terraform-roots` in the site's `ci.yml`.

Missing any of these shows up as `AccessDenied` in the PR's Plan job.

## Renaming or moving the GitHub repository

AWS trusts GitHub Actions by the repository's **name**: the roles accept tokens for `repo:<owner>/<repo>:pull_request` (plan) and `repo:<owner>/<repo>:environment:production` (deploy).

- **Rename or transfer:** GitHub redirects git traffic, but workflow tokens carry the new name, so both roles reject them. Update `github_repo` in `infra/main.tf` and `infra/bootstrap/main.tf` and apply both roots. Until then, CI plans and deploys fail with "Not authorized to perform sts:AssumeRoleWithWebIdentity".
- **Don't leave a trust pointing at a name you've given up.** If the old owner or repo name is freed and someone else registers it, their workflows would match the old trust. Update the trust as part of the rename, and never delete a GitHub org or account while AWS roles still trust its repos.
- **Custom OIDC subject claims:** if the org or repo customizes the OIDC `sub` claim template, token subjects change format and both trusts stop matching. Keep GitHub's default, or update the trust conditions to match.

## Upgrade Terraform

CI pins an exact Terraform version (`terraform-version`, default `1.15.6` in `site-ci.yml`) that must match the version used for local applies. Upgrade locally, then set `terraform-version` in the site's `ci.yml` (or move to a spa-platform release whose default matches).

## What's in the bucket

| Prefix          | What                                                                                                                 | Managed by                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `assets/`       | Build output. Files Vite emitted (its manifest) are cached for a year; files copied from `public/assets/` revalidate | Deploys upload; pruning deletes builds outside the last 3 that were replaced over 7 days ago             |
| `_deploys/`     | One record per deploy listing every file it uploaded; never served (404)                                             | Deploys write them; kept as deploy history                                                               |
| everything else | `index.html` and files from `public/`, revalidated on every request                                                  | Deploys upload; a file is deleted only if the previous deploy uploaded it and this build doesn't have it |

`assets/` is reserved for build output: pruning deletes any file there that no recent build lists, including one placed by hand. Outside `assets/`, files you place in the bucket by hand are never deleted by a deploy.

The smoke test after each deploy checks that:

- the live site is the new build;
- every referenced asset and `.well-known` file is served correctly;
- missing files return 404;
- build records aren't served.

### Known edges

- **Build records** are answered with 404 by the routing function, and CloudFront is also denied `_deploys/*` in the bucket policy, so encoded paths like `/%5Fdeploys/…` don't reach them either.
- **Racing deploys.** Only one Deploy workflow runs at a time. A deploy run from a workstation _at the same moment_ could prune an asset the other deploy skipped as already uploaded, breaking the site until the next deploy. Don't deploy by hand while a Deploy workflow is running.
- **Failed deploys leave files.** A deploy that fails after uploading some root files, but before writing its record, leaves those files unowned: no later deploy deletes them. They're harmless. Delete them by hand if they bother you.

## What CI Result guarantees

`CI Result` is the only required check, and it comes from the PR's own `.github/workflows/ci.yml`. A PR that edits that file can make it pass, so **review workflow changes before merging**. Dependabot PRs skip the Plan job (they get no AWS credentials), so an action bump inside Plan first runs on the next human PR.
