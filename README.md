# My Web App

A web app built with Next.js and Supabase, deployed on Vercel.

**Live site:** [ADD YOUR VERCEL WEB ADDRESS HERE](https://ADD-YOUR-VERCEL-WEB-ADDRESS-HERE)

## Where does your code live?

The code lives in this GitHub repository, [Vchor-0232/nextjs-with-supabase](https://github.com/Vchor-0232/nextjs-with-supabase). It's a Next.js app written in TypeScript and styled with Tailwind CSS. The pages are in the `app` folder, the reusable pieces (like the sign-up and login forms) are in `components`, and the code that connects to Supabase is in `lib/supabase`. GitHub is the single source of truth: Claude Code works on a copy of this repo, and Vercel builds the live site from it.

## Where does your data live, and what is stored there right now?

The data lives in a Supabase project, which gives the app a Postgres database and a ready-made login system. Right now the only data stored is user accounts. When someone signs up on the site, Supabase saves their email, an encrypted version of their password, and when they signed up and last logged in, under Authentication > Users. The app doesn't have any tables of its own yet, so there's no other data stored.

## How does a change get from Claude Code to the live site?

1. I tell Claude Code what I want changed, for example "make the main color blue."
2. Claude Code copies (clones) this repo from GitHub and edits the files on a new branch.
3. Claude Code saves the change as a commit and pushes the branch up to GitHub.
4. Claude Code opens a pull request, so I can see exactly what changed before it goes anywhere.
5. I review the pull request and merge it into the `main` branch.
6. Vercel sees the new commit on `main`, builds the app, and deploys it.
7. When Vercel shows the deployment as Ready, the change is live on the site.

## What will you need to add to turn this into your team's app?

> ADD YOUR PRODUCT MANAGER'S FEATURE LIST HERE. For each feature, write a sentence or two about what you'd need to build.

The starter already handles signing up, logging in, logging out, and resetting a password, so those don't need to be built from scratch. For most features we'll need to add new tables in Supabase to store the team's data, turn on row level security so each user can only see and edit their own data, and build new pages and forms in Next.js that read and write that data. We'll also replace the leftover starter content, like the tutorial steps on the home page and the user details on the protected page, with our own screens.

## Screenshots

### Sign-up page on the live site
![Sign up page](screenshots/signup.png)

### After logging in on the live site
![Logged in page](screenshots/logged-in.png)

### New user in Supabase (Authentication > Users)
![New user in Supabase](screenshots/supabase-user.png)

### Vercel deployment is Ready
![Vercel deployment Ready](screenshots/vercel-ready.png)

### Live site before the Claude Code change
![Before the change](screenshots/before.png)

### Live site after the Claude Code change
![After the change](screenshots/after.png)
