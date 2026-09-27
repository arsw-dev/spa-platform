# Setting up Cloudflare for your domain

Cloudflare runs your domain's DNS: the directory that tells the internet where your website and email live. You keep your domain registered where it is today; only its DNS moves to Cloudflare, on their free plan. Parts 1 and 2 take about 10 minutes. Part 3 happens when arsw.dev says it's time.

## 1. Add your domain

1. Sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Choose **Add a domain**, enter your domain (for example `acme.com`), and pick the **Free** plan.
3. Cloudflare copies your existing DNS records. **Don't change anything yet**: arsw.dev will check them against your current provider's records first, especially the ones your email depends on.

## 2. Invite arsw.dev

1. Open **Manage Account** → **Members** → **Invite**.
2. Enter the email arsw.dev gave you, choose the role arsw.dev asks for (access to your domain's DNS is enough), and send the invitation.

## 3. Switch your nameservers (when arsw.dev says it's ready)

This moves your domain's DNS to Cloudflare. Do it only after arsw.dev confirms the copied records are complete. If your email runs on this domain, a missing record would stop it.

1. In Cloudflare, open your domain's **Overview**. It shows **two nameservers**, for example `ada.ns.cloudflare.com`.
2. Sign in where your domain is registered (GoDaddy, Namecheap, Squarespace, your registered agent…) and find the domain's **Nameservers** setting. It's often under _DNS_, _Domain settings_ or _Advanced_.
3. Choose **custom nameservers**, replace the existing ones with Cloudflare's two, and save.

The switch usually takes minutes, occasionally up to a day. Cloudflare emails you when your domain is **Active**.

## 4. Create the read-only token for your website's automation

Your website's code checks your DNS setup automatically (it never changes it), so it needs a read-only key that belongs to you:

1. Open **Manage Account** → **Account API Tokens** → **Create Token** → **Create Custom Token**. If your account doesn't show _Account API Tokens_, use **My Profile** → **API Tokens** instead.
2. Name it `website-ci`. Under **Permissions** choose **Zone** → **DNS** → **Read**. Under **Zone Resources** choose **Include** → **Specific zone** → your domain.
3. Choose **Continue to summary** → **Create Token**, and copy the token. It's shown only once.
4. In GitHub, open your website's repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name it `CLOUDFLARE_API_TOKEN`, paste the token, and save.

Don't send the token to anyone, arsw.dev included; it goes straight into GitHub.

## Removing access

Remove arsw.dev under **Manage Account** → **Members**. Your DNS and website keep working.
