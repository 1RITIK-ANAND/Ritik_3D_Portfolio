# GitHub Pages deployment guide

## Ritik Anand 3D Portfolio

This guide publishes the existing HTML/CSS/JavaScript portfolio using the included
GitHub Actions workflow. No Node.js build, backend, or paid hosting is required.
Use a public repository for GitHub Pages on a free GitHub account.

**Important:** The current 3D model is approximately 85.4 MiB. GitHub's browser
upload limit is 25 MiB per file, so use VS Code Source Control or Git to push it.
The model is below GitHub's 100 MiB per-file Git limit. Do not convert it to a
Git LFS pointer for this workflow.

## 1. Prepare the local project

1. Open this project's folder in VS Code, not its parent folder.
2. Save all files with **File > Save All**.
3. Use Live Server to verify the page, 3D scene, navigation, and project links.
4. Confirm the repository root contains the following:
   - index.html
   - css/ and js/
   - assessts/Ot.glb (keep this exact spelling and uppercase O)
   - js/vendor/three.module.min.js
   - .github/workflows/deploy-pages.yml
   - .nojekyll and .gitignore
5. Install Git if VS Code says Git cannot be found, then restart VS Code.
6. Review your files for private information before publishing. Do not commit
   tokens, passwords, or environment secrets. The supplied ignore file excludes
   common local environment files.

## 2. Publish from VS Code (recommended)

1. Open **Source Control** using **Ctrl+Shift+G**.
2. If the folder is not a Git repository, select **Initialize Repository**.
3. Confirm that only this project's files appear. If unrelated parent-folder
   files appear, stop and reopen the correct project folder.
4. Select **Stage All Changes** using the plus button beside Changes. Include
   the real model file and the hidden .github folder and .nojekyll marker.
5. Enter a commit message such as **Prepare portfolio for GitHub Pages**.
6. Select **Commit**. If Git asks for your name and email, configure them using
   your own identity and retry. A GitHub-provided no-reply email is optional.
7. Select **Publish Branch** or **Publish to GitHub**. You can also find
   **GitHub: Publish to GitHub** in the Command Palette (**Ctrl+Shift+P**).
8. Complete GitHub sign-in directly in the browser. Never paste passwords or
   access tokens into chat or source files.
9. Choose your **1RITIK-ANAND** account and **public repository**.
10. Use **Ritik_3D_Portfolio** as the repository name, or choose another name.
    For a root profile website instead, name it **1RITIK-ANAND.github.io**.
11. Keep the default branch named **main** or **master**. The supplied workflow
    runs on pushes to these branches and deploys only the default branch.
12. Wait for the upload to finish; the model makes the first push large.
13. Open the repository on GitHub and verify index.html is at its root, not
    inside an extra nested project folder. Verify the model and workflow exist.

If the repository already has a GitHub remote, use **Push** or **Sync Changes**
instead of publishing another repository. Check the destination before syncing.

## 3. Enable GitHub Pages

1. Open your repository on GitHub.
2. Select **Settings > Pages** from the repository settings sidebar.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Do not create another Pages workflow; this project already includes one.
5. If Pages is unavailable, confirm repository visibility and your account plan,
   and confirm you have administrator permission for the repository.

## 4. Run the deployment

1. Open the repository's **Actions** tab.
2. If prompted, enable GitHub Actions for the repository.
3. Select **Deploy portfolio to GitHub Pages** in the workflow list.
4. Choose **Run workflow**, select your default branch, and confirm.
5. Wait for the deployment job to finish successfully. It checks out the code,
   prepares the static assets, uploads a Pages artifact, and publishes it.
6. If the first automatic run failed before Pages was enabled, run the workflow
   again after completing step 3 above.
7. Open the published URL in the job's **github-pages** environment or in
   **Settings > Pages**. Initial publication may take a few minutes.

## 5. Find and test your published site

- Project repository named Ritik_3D_Portfolio:
  https://1ritik-anand.github.io/Ritik_3D_Portfolio/
- Repository named 1RITIK-ANAND.github.io:
  https://1ritik-anand.github.io/
- A different repository name changes the project URL's final path segment.

Test the published website, not just Live Server:

1. Verify headings, neon styling, navigation, and mobile layout.
2. Allow the initial 85.4 MiB model download to finish. Test on a stable connection.
3. Scroll to verify camera movement, model animations, and nurse greeting.
4. Open both Render project demo links and your GitHub profile link.
5. Test the game. Contact submission opens the visitor's email application;
   GitHub Pages does not send emails or run a Python backend.
6. Google Fonts and the GLTF loader require access to their external HTTPS hosts.

## 6. Publish future changes

1. Edit and save the local project in VS Code.
2. Test with Live Server.
3. Open Source Control, review the changes, and stage them.
4. Enter a meaningful message and select **Commit**.
5. Select **Push** or **Sync Changes** to send the commit to GitHub.
6. Watch the new workflow run in **Actions**. It deploys automatically when
   the default branch is main or master.
7. Refresh the published site after the workflow succeeds. If necessary, use
   **Ctrl+Shift+R** for a cache-bypassing refresh.

Local Auto Save does not publish to GitHub. Live Server is a local preview only.
Each public update still needs a commit, a push, and a successful deployment.

## Troubleshooting

### The website returns 404
Confirm the workflow succeeded, Pages Source is GitHub Actions, index.html is at
the repository root, and the URL contains the exact repository name when needed.

### The model is missing
Check that assessts/Ot.glb exists in GitHub with the exact spelling and case.
Open the browser Network panel and inspect the model request. A 404 usually means
a path/case error; a text Git LFS pointer is not a usable model download.

### Upload fails because the file is too large
Use Git or VS Code Source Control instead of the browser uploader. If the model
grows beyond 100 MiB, optimize it or change the asset-hosting design before
pushing. Merely deleting an oversized file after committing it does not remove
it from Git history; resolve the rejected local commit before retrying.

### The workflow is missing or skipped
Check that .github/workflows/deploy-pages.yml was committed. Use main or master
as the repository's default branch. The workflow intentionally skips deployment
from a non-default branch.

### Pages deployment reports permissions or configuration errors
Enable Pages with GitHub Actions selected as the source, then rerun the workflow.
Keep its pages:write and id-token:write permissions. Organization policies or
environment approval rules may require a repository administrator's help.

### Updates do not appear online
Confirm the edit was committed and pushed to the default branch. Inspect the
latest workflow run and refresh only after it succeeds. Check you opened the
published GitHub URL, not a localhost tab or an older deployment link.

### First load is slow
The current model is large. Future optimization should reduce mesh complexity
and texture sizes, then validate the asset-specific procedural rig again.

## Final checklist

- Public repository under the correct account.
- Project files at repository root; model uploaded through Git.
- Default branch main or master.
- Pages Source set to GitHub Actions.
- Deployment workflow green.
- Published URL tested on desktop and mobile.
- No secrets or unintended private files committed.

No repository has been created or published by generating this guide.