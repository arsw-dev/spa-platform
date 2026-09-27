# Onboarding a client site

The contractor's checklist, from first conversation to a live site on the client's domain. The client owns every account; you get access they can revoke. The client-facing steps are in [`guides/`](guides), written for someone who has never used AWS, GitHub or Cloudflare.

## 0. Before your first client

Every client's contractor role trusts **your** AWS account, as long as the caller signed in with MFA recently. So your account has to make MFA unskippable. Otherwise a leaked long-term key could enroll a new MFA device and reach every client.

1. **Deny everything without MFA** for your IAM user, except minting an MFA session. Attach this as an inline policy (arsw-dev/portfolio manages it in `infra/bootstrap/`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "DenyAllWithoutMfa",
       "Effect": "Deny",
       "NotAction": ["sts:GetSessionToken"],
       "Resource": "*",
       "Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" } }
     }]
   }
   ```
   Don't exempt MFA-device management: that's exactly what a leaked key would use to enroll its own device.
2. **Work from a daily MFA session.** Set `mfa_serial` on the profile that holds your key (`aws configure set mfa_serial <arn>`). Then run `pnpm --filter contractor mfa-session` from this repository each day. It writes a 12-hour, MFA-backed `arsw-mfa` profile, taking the code from 1Password when `OP_MFA_ITEM` names the item and prompting otherwise. Everything else sources from `arsw-mfa`: your own account's Terraform and every client profile.

## 1. Gather

- The domain, its registrar, and who manages its DNS today.
- **Whether email runs on the domain.** If it does, ask for a screenshot or export of every current DNS record _before anything changes_. Cloudflare imports most of them, but not always all.
- Whether the client already has AWS, GitHub and Cloudflare accounts.
- **Whether the site's repository can be public.** It should be: it holds no secrets, and on GitHub's free plan a private repository can't have the protected `production` environment or the pull-request ruleset that deploys depend on. A client who needs it private must be on **GitHub Team**.

## 2. The client grants access

Send the guides in this order. Each ends with something they send back.

| Guide                                          | Client ends up with                                                      | They send you                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| [AWS](guides/aws.md)                           | An AWS account with root MFA, a spending alert, and your contractor role | Their 12-digit account ID                                 |
| [GitHub](guides/github.md)                     | A GitHub organization with an empty repository, you as an admin          | The repository name                                       |
| [Cloudflare](guides/cloudflare.md) (parts 1–2) | A Cloudflare account with the domain added and you as a member           | Confirmation, and the DNS screenshot if email is involved |

Before sending the AWS guide:

1. Generate the client's access code (external ID): `echo "<site>-$(openssl rand -hex 8)"`. The template only accepts that shape (`<site>-<16 hex>`).
2. Store it in your password manager with their account details. It isn't a password, but it must be unique to them.
3. Take the one-click link from the [latest release](https://github.com/arsw-dev/spa-platform/releases), replace `ACCESS_CODE` with their code, and send it with the guide.

## 3. Your access

1. **AWS CLI profile**, in `~/.aws/config`:
   ```ini
   [profile <site>]
   role_arn       = arn:aws:iam::<client account>:role/arsw-dev-contractor
   source_profile = arsw-mfa
   external_id    = <their access code>
   region         = us-east-1
   ```
   There's no `mfa_serial` here: the MFA comes from the `arsw-mfa` session (step 0), so neither the CLI nor Terraform prompts. Terraform can't answer an MFA prompt. Check the profile with `aws sts get-caller-identity --profile <site>`. Role sessions last an hour, so start a long apply (a new distribution) with a fresh one.
2. **Cloudflare:** create a personal API token with _Zone → DNS → Edit_, limited to their zone, for your workstation. It stops working when they remove you, as it should.

## 4. Create the repository

Follow [spa-template](https://github.com/arsw-dev/spa-template)'s README: clone it, run `node scripts/setup.ts`, `pnpm install`, commit, point `origin` at the client's repository, and push.

**Before that first push**, create the `production` environment with deployment branches limited to `main` (Settings → Environments). The push runs Deploy, and a job that names an environment creates it, unprotected, if it doesn't exist yet. CI's environment check would catch that, but it's simpler never to have it. That first Deploy still fails, because the environment has no variables until step 5: that's expected.

## 5. First-time setup

Follow **First-time setup** in the generated README, using `AWS_PROFILE=<site>`:

1. Account setup, including moving state into the new bucket.
2. The site on its preview address.
3. GitHub settings: the `production` environment and its variables, the ruleset, and SHA pinning.
4. The first deploy.

The CI token is the client's: [Cloudflare guide](guides/cloudflare.md), part 4. It's a read-only token they create and add to the repository themselves, so CI keeps working if you part ways.

Send the client the preview address (the `site_url` output) once the first deploy's smoke test passes.

## 6. The domain

1. The client changes nameservers: [Cloudflare guide](guides/cloudflare.md), part 3. Before that, compare the zone's imported records against their screenshot, especially email.
2. Once the zone is _Active_, work through the [onboarding pre-flight](runbook.md#onboard-a-domain-pre-flight): the site names must be free (or their records imported), and CAA must allow `amazon.com`.
3. Set `domains` in `infra/variables.tf`, apply, update the `SITE_URL` variable, and deploy.

## 7. Handing over or offboarding

The client already owns everything. To remove your access:

- they delete the `arsw-dev-contractor` CloudFormation stack;
- they remove you from the GitHub repository's collaborators and from the Cloudflare account.

Send them the [offboarding guide](offboarding.md), which walks through each step. It's kept out of `guides/` so new clients don't see it.

Their site keeps running and deploying. The repository contains everything, and it pins spa-platform, which is public.
