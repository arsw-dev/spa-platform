# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## Unreleased

### Added

- `modules/static-site`, `modules/cloudflare-dns`, `modules/account-bootstrap` and `tools/deploy`, extracted with their history from [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) (PRs #29–#44, including two adversarial review rounds).
- Reusable workflows `site-ci.yml` and `site-deploy.yml` for site repos. The deploy workflow runs `tools/deploy` from its own commit (`job.workflow_sha`) and refuses to run if that's unavailable.
- `cloudformation/contractor-role.yaml`: grants the contractor administrator access to a client account, requiring MFA and the client's access code (external ID). It's linted with `cfn-lint` in CI.
- `release.yml`: on a `v*` tag, publishes the template to S3 (never replacing an existing one) and creates the GitHub release with the one-click link.
- Standalone tooling: pnpm workspace, ESLint, CI (lint, deploy tool typecheck and tests, routing function tests, `terraform test` for every module, the certificate-validation dependency check, actionlint), module READMEs.
