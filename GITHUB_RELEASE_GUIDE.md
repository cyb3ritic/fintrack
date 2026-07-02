# FinTrack - GitHub Repository & Release Setup Guide

This guide details how to set up Git, link your code to GitHub, configure your personal access token, and deploy standalone installer releases.

---

## 🛠️ Step 1: Initialize Git and Commit the Codebase

First, initialize Git locally and commit the codebase. The [.gitignore](file:///d:/Github/expense_tracker/.gitignore) file we set up will prevent your local configurations, cache, databases, and packaged installers from being tracked.

Run these commands in your project root (`d:\Github\expense_tracker`):

```bash
# 1. Initialize local git repository
git init

# 2. Add all source files to staging
git add .

# 3. Create the initial commit
git commit -m "Initial commit: FinTrack v1.0.0 clean setup"
```

---

## 🌐 Step 2: Create and Link Your GitHub Repository

1. Go to [GitHub](https://github.com/) and log in.
2. Click **New** to create a new repository.
3. Set the repository name to: `fintrack`
4. Set the visibility to **Public** (required for the updater to fetch release data seamlessly).
5. Leave "Add a README", "Add .gitignore", and "Choose a license" **unchecked** (since we already have these files locally).
6. Click **Create repository**.
7. Link your local repo to the remote GitHub repo and push the code:

```bash
# Link local git to your remote GitHub repo
git remote add origin https://github.com/cyb3ritic/fintrack.git

# Rename default branch to main
git branch -M main

# Push the codebase to GitHub
git push -u origin main
```

Now, your entire codebase is securely backed up and tracked on GitHub!

---

## 🔑 Step 3: Create a GitHub Personal Access Token (PAT)

To allow the `electron-builder` command line tool to upload compiled installers directly to your repository's releases page, you need a Personal Access Token:

1. In GitHub, click your profile picture in the top-right corner and select **Settings**.
2. Scroll down the left sidebar and click **Developer settings**.
3. Select **Personal access tokens** -> **Tokens (classic)**.
4. Click **Generate new token** -> **Generate new token (classic)**.
5. Provide a note (e.g., `FinTrack Release Token`).
6. Set the **Expiration** (e.g., 90 days or No expiration).
7. Check the **`repo`** scope checkbox (this grants write access to upload binaries).
8. Scroll to the bottom and click **Generate token**.
9. **CRITICAL**: Copy the token string immediately. You will not be able to see it again.

---

## 🚀 Step 4: Publish Your First Release (v1.0.0)

With the token generated, you can build and publish the installer.

1. Open your terminal in the project root.
2. Set the `GH_TOKEN` environment variable in your terminal session and run the distribution command:
   
   **In PowerShell**:
   ```powershell
   $env:GH_TOKEN="your_copied_personal_access_token_here"
   npm run dist
   ```

   **In Command Prompt (cmd)**:
   ```cmd
   set GH_TOKEN=your_copied_personal_access_token_here
   npm run dist
   ```

3. The compiler will run and `electron-builder` will compile the installer. It will connect to GitHub, create a **Draft Release** tagged `v1.0.0`, and upload the setup executable (`FinTrack Setup 1.0.0.exe`) and `latest.yml` metadata files to it.
4. Go to `https://github.com/cyb3ritic/fintrack/releases`.
5. You will see a draft tag `v1.0.0`. Click **Edit**.
6. Set the Release Title to `v1.0.0` (or `FinTrack Release 1.0.0`).
7. Click **Publish release**.

---

## 🔄 Step 5: How to Deploy Future Updates (e.g., v2.0.0)

When you make updates, change code, fix layout, or add features, follow this workflow to release a new version:

### 1. Track Changes in Git
Commit and push your source updates so they are tracked on GitHub:
```bash
git add .
git commit -m "Update dashboard charts and add custom filters"
git push origin main
```

### 2. Increment Version
Open [package.json](file:///d:/Github/expense_tracker/package.json) and change the version field:
```json
  "version": "2.0.0",
```

### 3. Build & Publish the v2.0.0 Update
Run the distributor with the access token:
```powershell
$env:GH_TOKEN="your_personal_access_token_here"
npm run dist
```
`electron-builder` will compile the code and create a new **Draft Release** tagged `v2.0.0` on GitHub.

### 4. Publish Draft Release on GitHub
Go to your releases page on GitHub, click **Edit** on the `v2.0.0` draft, and click **Publish release**.

### 5. Auto-Updater Check
- Existing users running version `1.0.0` will click **Check for Updates** in their Settings page.
- The app fetches `latest.yml` from GitHub and sees that version `2.0.0` is active.
- It downloads the installer, updates status text, and lights up the **Restart to Install** button.
- The user clicks the button, and the app seamlessly upgrades to version `2.0.0`!
