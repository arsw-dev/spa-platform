# Setting up AWS for your website

Your website runs in **your own** Amazon Web Services (AWS) account. You own everything in it and pay AWS directly, and for a site like yours that's usually a few cents a month or nothing at all. This guide takes about 15 minutes.

## 1. Create an account (skip if you already have one)

1. Go to [aws.amazon.com](https://aws.amazon.com) and choose **Create an AWS Account**.
2. Use an email address your business will keep, ideally a shared one such as `admin@yourbusiness.com` rather than one person's inbox.
3. Choose the **Basic (free)** support plan when asked.

## 2. Protect the account

The email and password you signed up with are the account's **root user**, the master key. Protect it with a second factor:

1. Sign in, open the account menu (top right) → **Security credentials**.
2. Under **Multi-factor authentication (MFA)**, choose **Assign MFA device** and follow the steps with an authenticator app on your phone.

Keep the root password and MFA device safe. You won't need them day to day.

## 3. Get a spending alert

So a surprise bill can never happen:

1. Search for **Budgets** in the top search bar and open it.
2. Choose **Create budget** → **Use a template** → **Monthly cost budget**.
3. Set an amount (for example $10) and your email address, then **Create budget**.

AWS emails you if the month's costs are heading past that amount.

## 4. Give arsw.dev access

arsw.dev will send you a link and an access code. The link opens AWS with everything filled in:

1. Sign in to your AWS account, then open the link.
2. You'll see **Quick create stack**. Check that **Access code from arsw.dev** matches the code you were sent. Leave everything under _Advanced_ as it is.
3. At the bottom, tick **I acknowledge that AWS CloudFormation might create IAM resources with custom names**. (The "resource" is the access role for arsw.dev.)
4. Choose **Create stack** and wait a minute until it shows **CREATE_COMPLETE**.
5. Open the **Outputs** tab and send arsw.dev the **AccountId** shown there.

**What this allows:** arsw.dev can manage the AWS resources that host your website.

- It can only sign in with a recent multi-factor sign-in and your access code.
- AWS records its actions in your account's CloudTrail event history (the last 90 days), which you can review at any time.
- It can't see your password.

## Removing access

Whenever you want, for example between projects:

1. Search for **CloudFormation** and open it.
2. Select the stack named **arsw-dev-contractor** and choose **Delete**.

arsw.dev's access through this role ends immediately. Your website keeps running: the roles it uses to plan and deploy stay, and only your website's own GitHub repository can use them. To give access again later, open the same link.
