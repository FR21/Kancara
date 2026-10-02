# Kancara

Kancara is a multi-agent travel companion for groups with different needs, from planning all the way to the trip home. It keeps working offline and makes sure no member of the group gets sacrificed.

Status: **initial setup**. The repo currently contains only the Next.js frontend. The Python part has not been added yet.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- TypeScript
- Tailwind CSS 4
- ESLint 9 (`eslint-config-next`)
- Python — _not set up yet_

## Prerequisites

Make sure you have these installed:

| Tool    | Minimum version  | Check version      |
| ------- | ---------------- | ------------------ |
| Git     | —                | `git --version`    |
| Node.js | 20.9             | `node -v`          |
| npm     | bundled with Node| `npm -v`           |
| Python  | 3.x _(later)_    | `python --version` |

## Getting Started

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd kancara
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the project root. No variables are required yet. Once there are, they will be listed in `.env.example`, and you can copy it:

   ```bash
   cp .env.example .env
   ```

   > Never commit `.env` (it is already in `.gitignore`).

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The page reloads automatically when you edit files.

## Scripts

| Command         | What it does                         |
| --------------- | ------------------------------------ |
| `npm run dev`   | Starts the development server        |
| `npm run build` | Builds the app for production        |
| `npm run start` | Runs the production build            |
| `npm run lint`  | Checks the code with ESLint          |

Run `npm run lint` before pushing.

## Folder Structure

```
kancara/
├── app/                 # Pages & layouts (Next.js App Router)
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page (/)
│   └── globals.css      # Global styles + Tailwind
├── public/              # Static assets (images, icons)
├── eslint.config.mjs    # ESLint config
├── next.config.ts       # Next.js config
├── postcss.config.mjs   # PostCSS config (Tailwind)
├── tsconfig.json        # TypeScript config
└── package.json
```

## Git Workflow

- Main branch: `main`
- Create a new branch for each task, e.g. `feature/TC001-setup-project`
- Keep commits small and clear, then open a Pull Request to `main`

## Notes

This project uses Next.js 16, which has some breaking changes compared to older versions. If you're unsure about an API or convention, check the docs in `node_modules/next/dist/docs/` or at [nextjs.org/docs](https://nextjs.org/docs).
