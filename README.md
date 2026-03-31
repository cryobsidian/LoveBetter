# Love Better

Love Better is a lightweight self-check web app for people in relationships to reflect on how well they know their partner.

This MVP is built with Expo and React Native for Web. Questions and session progress are stored locally. There is no backend dependency.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app locally:

```bash
npm run web
```

Typecheck the project:

```bash
npm run typecheck
```

Export a production web build:

```bash
npm run export:web
```

## GitHub Pages Deployment

This repo is configured to deploy to GitHub Pages using GitHub Actions.

### How it works

- The workflow file is [.github/workflows/deploy-pages.yml](/d:/PROJECTS/CoupleQuestion/.github/workflows/deploy-pages.yml)
- Expo uses [app.config.ts](/d:/PROJECTS/CoupleQuestion/app.config.ts) to set the correct base URL for GitHub Pages
- The build output is exported to `dist`

### First-time setup

1. Push the repository to GitHub.
2. Open the repository on GitHub.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Push to the `main` branch, or run the `Deploy GitHub Pages` workflow manually from the `Actions` tab.

### Published URL

If your repository is a normal project repo, the app will publish at:

```text
https://<your-username>.github.io/<repo-name>/
```

Example:

```text
https://yourname.github.io/CoupleQuestion/
```

If your repository is named `<your-username>.github.io`, then it will publish at the root domain:

```text
https://<your-username>.github.io/
```

## Project Structure

- [App.tsx](/d:/PROJECTS/CoupleQuestion/App.tsx): main UI flow and screens
- [src/types.ts](/d:/PROJECTS/CoupleQuestion/src/types.ts): shared TypeScript types
- [src/data/questionBank.ts](/d:/PROJECTS/CoupleQuestion/src/data/questionBank.ts): local question data shaping and feedback mapping
- [src/lib/session.ts](/d:/PROJECTS/CoupleQuestion/src/lib/session.ts): session creation and summary logic
- [src/lib/storage.ts](/d:/PROJECTS/CoupleQuestion/src/lib/storage.ts): local session persistence
