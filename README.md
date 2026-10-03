<div align="center">

<img src="public/images/logo/kancara_full_logo.png" alt="Kancara mascot and logo" width="220" />

# Kancara

**Your inclusive group travel planner.**

A multi-agent travel companion for groups whose members have different needs,
from planning all the way to the trip home, even offline.

![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## The problem

Group trips usually get planned around whoever speaks up the most. The member who
uses a wheelchair, the parent with a toddler, the friend on a tight budget, or
the one with dietary restrictions ends up compromising, or stays home.

## What Kancara does

| | |
| --- | --- |
| 👥 **Built for the whole group** | Takes every member's needs into account, so nobody gets sacrificed. |
| 🧭 **From planning to the trip home** | One companion for the entire journey, not just the planning stage. |
| 📶 **Works offline** | The itinerary and key info stay available without a signal. |

## Project status

> 🚧 **Early stage.** This repo currently contains the Next.js frontend. The
> Python multi-agent backend has not been added yet.

**Done so far**

- [x] Design system: brand colors, typography, and light/dark tokens
- [x] Responsive navbar with mobile menu
- [x] Language switcher (Bahasa Indonesia / English)
- [x] Light/dark theme toggle that follows the OS by default
- [ ] Trip planning flow
- [ ] Multi-agent backend (Python)
- [ ] Offline support

---

## Getting started

### Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 20.9 or newer | `node -v` |
| npm | comes with Node | `npm -v` |
| Git | any | `git --version` |

### Run it locally

```bash
git clone https://github.com/FR21/Kancara.git
cd Kancara
npm install
npm run dev
```

Then open **http://localhost:3000**.

Fonts load automatically through `next/font`, so there is nothing extra to install.
No environment variables are needed yet. When they are, they will be listed in
`.env.example`. Copy it to `.env`, and never commit `.env`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Check the code with ESLint (run this before pushing) |

---

## Tech stack

- **Framework:** [Next.js](https://nextjs.org) 16 (App Router) and React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4, with design tokens in `app/globals.css`
- **Icons:** [Lucide](https://lucide.dev/icons) (`lucide-react`)
- **Fonts:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) for headings, [Montserrat](https://fonts.google.com/specimen/Montserrat) for body text
- **Backend:** Python, coming soon

## Project structure

```
Kancara/
├── app/                    # Pages and layouts (App Router)
│   ├── layout.tsx          # Root layout: fonts, theme and locale scripts, navbar
│   ├── page.tsx            # Home (/)
│   ├── plan/ trips/ about/ # Placeholder pages
│   └── globals.css         # Design tokens and Tailwind setup
├── components/
│   ├── navbar/             # Navbar, LanguageToggle, ThemeToggle
│   └── placeholder/        # Temporary page for routes not built yet
├── lib/                    # Locale, theme, and translation helpers
├── messages/               # UI text, one JSON file per feature
│   ├── id/                 # Bahasa Indonesia (default)
│   └── en/                 # English
└── public/images/logo/     # Logos
```

## Contributing

### Adding UI text in both languages

Text lives in `messages/<locale>/<feature>.json`, for example `messages/id/navbar.json`.

1. Create `messages/id/<feature>.json` and `messages/en/<feature>.json` with the same keys.
2. Register both files in `lib/messages.ts`.
3. Read the text in a client component with `useMessages("<feature>")`.

The Indonesian files define the expected keys, so a missing key in an English
file shows up as a TypeScript error.

### Styling rules

Use the design tokens (`bg-primary`, `text-text-muted`, `border-border`,
`text-h2`, …) instead of hardcoded hex colors or pixel font sizes. Light and dark
mode then work automatically. See the comments at the top of `app/globals.css`.

### Git workflow

- The main branch is `master`.
- Create one branch per task, for example `feature/TC006-trip-form`.
- Prefix commit messages with the task ID, for example `feat(TC003): add navbar`.
- Keep commits small, then open a pull request to `master`.

> **Heads-up:** Next.js 16 has breaking changes compared to older versions. If
> you're unsure about an API, check `node_modules/next/dist/docs/` or
> [nextjs.org/docs](https://nextjs.org/docs).
