# Removing arsw.dev's access

You own every account your website uses, and you can remove arsw.dev's access to any of them at any time, for example between projects. Your website keeps running and deploying afterwards: its code, automation and settings all stay in your accounts.

## AWS

1. Sign in to your AWS account, search for **CloudFormation** and open it.
2. Select the stack named **arsw-dev-contractor** and choose **Delete**.

arsw.dev's access through this role ends immediately. Your website keeps running: the roles it uses to plan and deploy stay, and only your website's own GitHub repository can use them. To give access again later, open the same link arsw.dev sent you when you first set up AWS.

## GitHub

1. In your website's repository, open **Settings** → **Collaborators and teams**.
2. Find **arsw-dev** and choose **Remove**.

You stay the organization's owner, and the repository keeps everything.

## Cloudflare

Open **Manage Account** → **Members** and remove arsw.dev. Your DNS and website keep working.
