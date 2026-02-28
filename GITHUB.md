# Step-by-Step: Push Your Project to GitHub

Follow these steps in order. You can copy and paste the commands into your terminal (after adjusting anything in `YOUR_USERNAME` and `YOUR_REPO`).

---

## Step 1: Install Git (if you don’t have it)

**On Mac:**  
Open Terminal and run:

```bash
git --version
```

If you see a version number (e.g. `git version 2.39.0`), Git is installed. If you see “command not found,” install it:

```bash
xcode-select --install
```

(Click “Install” in the popup, then try `git --version` again.)

**On Windows:**  
Download and run the installer from [git-scm.com](https://git-scm.com/download/win), then open “Git Bash” or a new terminal.

---

## Step 2: Create a GitHub account

1. Go to [github.com](https://github.com).
2. Click **Sign up** and create an account (email, password, username).
3. Verify your email if GitHub asks you to.

You don’t need to create a repository yet; we’ll do that in Step 4.

---

## Step 3: Open your project in the terminal

1. Open the **Terminal** app (Mac) or **Git Bash** / **Command Prompt** (Windows).
2. Go into your project folder:

```bash
cd /Users/leoli/challenge-app
```

(On Windows, use the path where your project lives, e.g. `cd C:\Users\YourName\challenge-app`.)

---

## Step 4: Create a new repository on GitHub

1. Log in to [github.com](https://github.com).
2. Click the **+** icon (top right) → **New repository**.
3. Fill in:
   - **Repository name:** e.g. `challenge-app` (or any name you like).
   - **Description:** optional, e.g. “Challenge tracker app”.
   - **Public** is fine.
   - **Do not** check “Add a README” or “Add .gitignore” (your project already has files).
4. Click **Create repository**.

You’ll see a page that says “Quick setup” and shows a URL like:

`https://github.com/YOUR_USERNAME/challenge-app.git`

Keep this page open; you’ll need that URL in Step 7. Replace `YOUR_USERNAME` with your real GitHub username and `challenge-app` with your repo name if different.

---

## Step 5: Initialize Git in your project

In the same terminal (in `/Users/leoli/challenge-app`), run:

```bash
git init
```

This creates a hidden `.git` folder and makes your folder a Git repository.

---

## Step 6: Add and commit your files

**Tell Git who you are (only needed once per computer):**

```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

Use the email and name you want to show on GitHub.

**Stage all files:**

```bash
git add .
```

The `.` means “everything in this folder.” Your `.env.local` file will **not** be added because it’s in `.gitignore` (that’s correct—you never push secrets to GitHub).

**Save a snapshot (commit):**

```bash
git commit -m "Initial commit"
```

You should see a list of files created. That’s your first commit.

---

## Step 7: Connect to GitHub and push

**Add GitHub as the “remote” (use your real URL from Step 4):**

```bash
git remote add origin https://github.com/YOUR_USERNAME/challenge-app.git
```

Replace `YOUR_USERNAME` and `challenge-app` with your GitHub username and repository name.

**Rename the main branch to `main` (if needed):**

```bash
git branch -M main
```

**Push your code to GitHub:**

```bash
git push -u origin main
```

GitHub will **not** accept your normal account password. You must use a **Personal Access Token** (see below). When Git asks:

- **Username:** your GitHub username (e.g. `leolx90`)
- **Password:** paste your **Personal Access Token** (not your GitHub password)

When it finishes, you should see something like: `Branch 'main' set up to track remote branch 'main' from 'origin'.`

---

## If you see: "Password authentication is not supported" or "Invalid username or token"

GitHub no longer allows account passwords for Git. Use a **Personal Access Token** as your password.

### Create a token

1. On GitHub, click your **profile picture** (top right) → **Settings**.
2. In the left sidebar, scroll down and click **Developer settings**.
3. Click **Personal access tokens** → **Tokens (classic)**.
4. Click **Generate new token** → **Generate new token (classic)**.
5. Give it a name (e.g. `challenge-app push`).
6. Set **Expiration** (e.g. 90 days or No expiration).
7. Under **Scopes**, check **repo** (full control of private repositories).
8. Click **Generate token** at the bottom.
9. **Copy the token immediately** (it looks like `ghp_xxxxxxxxxxxx`). You won’t see it again.

### Use the token when you push

In the terminal, run again:

```bash
git push -u origin main
```

When prompted:

- **Username:** your GitHub username (e.g. `leolx90`)
- **Password:** paste the token you copied (you won’t see it as you paste—that’s normal)

Push should succeed.

### Save the token so you don’t type it every time (optional)

**Mac:** Store it in the keychain:

```bash
git config --global credential.helper osxkeychain
```

Next time you push, enter username and token once; Mac will remember it.

**Windows:** Use the Credential Manager:

```bash
git config --global credential.helper manager
```

After one successful push with your token, Windows will remember it.

---

## Step 8: Check that it worked

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/challenge-app`
2. You should see all your project files (e.g. `app/`, `lib/`, `package.json`, `README.md`).
3. You should **not** see `.env.local` (it’s correctly ignored).

---

## Summary of commands (copy-paste block)

After creating the repo on GitHub and with terminal in your project folder:

```bash
cd /Users/leoli/challenge-app

git init
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/challenge-app.git
git branch -M main
git push -u origin main
```

(Change `your-email@example.com`, `Your Name`, and the `origin` URL to your own.)

---

## Later: making more changes and pushing again

After you edit your code:

```bash
cd /Users/leoli/challenge-app
git add .
git commit -m "Short description of what you changed"
git push
```

You’re done. You can now use this repo with Vercel or any other host by following [DEPLOY.md](DEPLOY.md).
