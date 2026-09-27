# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## 1.0.0-rc.1

### Added

- `modules/static-site`, `modules/cloudflare-dns`, `modules/account-bootstrap` and `tools/deploy`, extracted with their history from [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) (PRs #29–#44, including two adversarial review rounds).
- Reusable workflows `site-ci.yml` and `site-deploy.yml` for site repos. The deploy workflow runs `tools/deploy` from its own commit (`job.workflow_sha`) and refuses to run if that's unavailable.
- `cloudformation/contractor-role.yaml`: grants the contractor administrator access to a client account, requiring MFA and the client's access code (external ID). It's linted with `cfn-lint` in CI.
- `release.yml`: on a `v*` tag, publishes the template to S3 (never replacing an existing one) and creates the GitHub release with the one-click link.
- Documentation: `docs/onboarding.md` (contractor checklist), client guides for AWS, GitHub and Cloudflare, and `docs/runbook.md` (generic operations, including upgrading spa-platform).
- Standalone tooling: pnpm workspace, ESLint, CI (lint, deploy tool typecheck and tests, routing function tests, `terraform test` for every module, the certificate-validation dependency check, actionlint), module READMEs.
- `tools/contractor`: `pnpm --filter contractor mfa-session` mints the daily MFA session (`arsw-mfa` profile) that client profiles and Terraform source from.
- `site-ci.yml` checks that the deploy environment (input `deploy-environment`, default `production`) only allows deployments from `main`.
- Onboarding step 0: the contractor account must deny everything without MFA.

### Changed

- The contractor role requires an MFA sign-in from the last 12 hours, and the access code must look like `<site>-<16 hex>`.
- Client repositories are public by default; the guides say so, and why (GitHub Free can't protect private ones).
- `release.yml` only releases tags on `main`, and a re-run is safe: an identical published template is accepted, and an existing release is kept. The link placeholder is `ACCESS_CODE`.
- The deploy job no longer restores a dependency cache the site's build job could write.
- Plan checks out without persisted credentials, reads every PR comment, and removes its comment when a root's plan returns to "No changes.".
- CI typechecks and tests every package under `tools/`.
