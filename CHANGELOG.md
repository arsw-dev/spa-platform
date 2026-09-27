# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## Unreleased

### Added

- `modules/static-site`, `modules/cloudflare-dns`, `modules/account-bootstrap` and `tools/deploy`, extracted with their history from [arsw-dev/portfolio](https://github.com/arsw-dev/portfolio) (PRs #29–#44, including two adversarial review rounds).
- Standalone tooling: pnpm workspace, ESLint, CI (lint, deploy tool typecheck and tests, routing function tests, `terraform test` for every module, the certificate-validation dependency check, actionlint), module READMEs.
