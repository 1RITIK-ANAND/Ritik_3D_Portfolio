# Ritik Anand 3D Portfolio

A responsive HTML/CSS/JavaScript portfolio with a Three.js operating-room scene and the Zero-Defect Run mini-game.

## Deploy to GitHub Pages
This is a static site: no build step, backend, API keys, or npm installation is
required. All portfolio content and 3D animations are included in deployment.

1. Create a GitHub repository under **1RITIK-ANAND** and push this project's
	contents to its root using Git or VS Code Source Control, including the hidden
	`.github` folder and `.nojekyll`. The model is too large for browser uploads.
	 Keep the default branch named **main** or **master**.
2. In the repository, open **Settings → Pages → Build and deployment** and select
	 **GitHub Actions** as the source.
3. Open **Actions → Deploy portfolio to GitHub Pages → Run workflow** and select
	 the default branch. Future pushes to that branch deploy automatically.
4. Open the published URL shown by the deployment. For a project repository it
	 will be `https://1ritik-anand.github.io/<repository-name>/`. A repository named
	 `1RITIK-ANAND.github.io` publishes at `https://1ritik-anand.github.io/`.

The workflow publishes only `index.html`, `css`, `js`, `assessts`, and `.nojekyll`.
Development settings, tests, and documentation are not included in the Pages
artifact. Keep the existing spelling and case of **assessts/Ot.glb**: GitHub Pages
paths are case-sensitive. Relative asset paths support project-repository URLs.

### Deployment notes
- Upload the actual GLB model, not a Git LFS pointer. GitHub rejects individual
	Git files larger than 100 MiB, and browser uploads have a 25 MiB per-file limit.
	The current `assessts/Ot.glb` is 89,560,436 bytes (about 85.4 MiB), so push it
	using Git or VS Code Source Control, not the browser upload interface. Its size
	may slow the first 3D load; optimizing the model is recommended for mobile use.
- Google Fonts and the Three.js GLTF loader are fetched over HTTPS from external
	services. The user's browser must be able to reach them.
- Contact submission opens the visitor's email application; Pages does not run
	a mail server. Project demos remain hosted at their supplied Render URLs.
- If a deployment fails, inspect the failed step in **Actions** and verify Pages
	is enabled with **GitHub Actions** selected as its source.

## Run locally
Because the 3D scene uses JavaScript modules, serve the folder through a local HTTP server.

### Python
```bash
python -m http.server 8000
```
Open `http://localhost:8000`.

### VS Code
Install the Live Server extension, right-click `index.html`, and choose **Open with Live Server**.

## Structure
- `index.html`: page content
- `css/style.css`: responsive styling
- `js/main.js`: interactions and navigation
- `js/robot.js`: Three.js 3D surgical scene
- `js/nurse.js`: proximity-triggered nurse head tracking, blinking, and articulated greeting
- `js/game.js`: mini-game
- `js/vendor/three.module.min.js`: local Three.js dependency

## Nurse greeting
Scroll toward the scene to trigger a single three-cycle greeting. The original
nurse head turns toward the camera while the right shoulder, elbow, wrist, and
five three-joint fingers animate. The original torso and tablet remain stable.
The arm settles after greeting; moving the camera away smoothly restores the
head's idle pose and rearms the next greeting.

The trigger uses actual camera distance (enter below 2.15 model radii, exit above
2.42), with hysteresis to avoid repeated triggers near the boundary. Eye blinking
uses the original cyan eye texture with a procedural vertical shutter. Reduced
motion disables greeting, head tracking, and blinking.

The head skin weights and eye region are fitted to the current OT asset. Retune
these landmarks if replacing the model. The source GLB is not modified.

Browser-side deterministic checks live in `tests/nurse-greeting.test.js`; import
that module in the running portfolio and call its `runNurseGreetingChecks()`
export to verify articulation, triggers, three-cycle completion, idle return,
torso stability, and reduced-motion behavior.
