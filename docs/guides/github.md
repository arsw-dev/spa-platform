# Setting up GitHub for your website

Your website's code lives in **your own** GitHub organization. You own it, and it keeps working whoever maintains the site. This guide takes about 10 minutes and uses GitHub's free plan.

## 1. Create a personal account (skip if you have one)

Go to [github.com/signup](https://github.com/signup) and sign up. Every organization needs at least one person as its owner, and that's you.

## 2. Create an organization

An organization is your business's space on GitHub, separate from any one person.

1. Open [github.com/organizations/plan](https://github.com/organizations/plan) and choose **Free**.
2. Name it after your business (for example `acme-co`) and give a contact email.
3. When asked, choose **My personal account** as the owner.

## 3. Create an empty repository

1. In your organization, choose **New repository**.
2. Name it (for example `website`) and choose **Public**. Your website's code holds no passwords or keys, and on GitHub's free plan only public repositories can have the protections that keep deployments safe. If it must be private, your organization needs GitHub's **Team** plan; ask arsw.dev.
3. **Don't** add a README, `.gitignore` or license. It must start empty.
4. Choose **Create repository**.

## 4. Invite arsw.dev

1. In the repository, open **Settings** → **Collaborators and teams** → **Add people**.
2. Search for **arsw-dev**, choose **Admin**, and send the invitation.

Send arsw.dev the repository's name (for example `acme-co/website`).

**What Admin allows:** arsw.dev can push code and set up the repository's automation and settings. You stay the organization's owner, and you can remove access at any time from the same **Collaborators and teams** page.
