# Deployment Guide

## GitHub Pages Setup

### Initial Setup

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/aussiedatagal/food_penalties.git
   git push -u origin main
   ```

2. Enable GitHub Pages:
   - Navigate to your repository on GitHub
   - Go to Settings → Pages
   - Under Source, select GitHub Actions
   - Save the settings

3. Verify repository name:
   - If your repository name differs from `food_penalties`, update the base path in `frontend/vite.config.js`:
     ```js
     base: '/your-repo-name/',
     ```

### Automatic Deployment

Once GitHub Pages is enabled with GitHub Actions as the source:

- Every push to the `main` branch triggers a build and deployment
- The workflow (`.github/workflows/deploy.yml`) will:
  1. Install Node.js dependencies
  2. Build the frontend application
  3. Deploy to GitHub Pages

### Manual Deployment

If you need to deploy manually:

```bash
cd frontend
npm install
npm run build
```

Then commit and push the `frontend/dist/` directory (not recommended - use GitHub Actions instead).

### Troubleshooting

- 404 errors: Check that the `base` path in `vite.config.js` matches your repository name
- Assets not loading: Ensure the base path is correct and includes trailing slash
- Build failures: Check GitHub Actions logs in the repository's Actions tab

