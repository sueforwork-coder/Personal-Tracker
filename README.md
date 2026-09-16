# LifeSync Dashboard

A personal financial & calorie tracking dashboard with Google Sheets bi-directional synchronization.

## Why GitHub Pages Showed a Blank White Screen (Fixed)

By default, Vite compiles asset references with absolute paths (e.g. `/assets/index.js`). When deployed to GitHub Pages under a subpath like `https://username.github.io/repository-name/`, the browser attempts to fetch assets from `https://username.github.io/assets/...` which results in 404 errors and a blank white screen.

### Fixes Applied:
1. **Relative Asset Base (`vite.config.ts`)**:
   Configured `base: './'` so all script and stylesheet tags in `dist/index.html` resolve relatively (`./assets/...`), working in any subpath or custom domain.
2. **Automated GitHub Actions Deployment (`.github/workflows/deploy.yml`)**:
   Included an automated workflow that checks out code, runs `npm run build`, and publishes the compiled `dist/` folder to GitHub Pages.
3. **SPA Fallback (`public/404.html`)**:
   Prevents 404s when reloading or navigating subpages on GitHub Pages.
4. **React Error Boundary (`src/components/ErrorBoundary.tsx`)**:
   Prevents unhandled runtime exceptions from resulting in an unrecoverable blank white screen.

---

## How to Deploy to GitHub Pages (2 Minutes)

### Option 1: Automatic via GitHub Actions (Recommended)
1. Push this repository to GitHub (e.g., `main` branch).
2. In your GitHub repository, go to **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish your site whenever you push changes.

### Option 2: Deploy using the `gh-pages` branch
1. Build the production files:
   ```bash
   npm run build
   ```
2. Commit and push the contents of the `dist/` directory to the `gh-pages` branch.
3. In **Settings** > **Pages**, set **Source** to `Deploy from a branch` and select `gh-pages` / `/(root)`.
