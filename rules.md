
**General Rules**

1. This web app must have a great User Interface (UI) and User Experience (UX).
2. This web app must be responsive on all screen sizes from 360px width, using breakpoints sm 640px, md 768px, lg 1024px, xl 1280px, and support the latest 2 versions of Chrome, Safari, Firefox, and Edge.
3. The app must follow mobile-first design principles.
4. The design must follow UX principles such as clarity, consistency, and accessibility.
5. This web app must be very easy to use: a new customer must be able to send their first brief in under 2 minutes without help, and every main action must be reachable in 3 taps or fewer.
6. All sizing, padding, margins, and font sizes must use multiples of 4px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 128, etc). Exceptions: 1px borders, hairlines, and line-height.
7. The app must have one design system: color tokens, typography scale, spacing scale, radius, and shadows defined in one place and used across all pages.
8. The app must support light and dark mode with consistent styling, using the same design tokens.
9. All text and icons must meet WCAG AA contrast ratios.
10. The app must be fully usable by keyboard, with visible focus states, alt text for images, and proper ARIA labels.
11. The UI must include interactive feedback: hover, focus, active, disabled, loading, success, and error states.
12. Handle all states gracefully: loading (skeletons), empty states with a clear next action, and error messages that explain what to do.
13. Forms and inputs must include labels, placeholders, inline validation, and clear error messages.
14. The layout must remain stable, with no content shift (CLS) when loading.
15. All animations must be smooth, minimal, not distracting, and respect prefers-reduced-motion.
16. The default language is Bahasa Indonesia, with all UI text stored in translation files (not hardcoded) so English can be added. Currency uses Rupiah format and time uses WIB by default.
17. The web app must meet performance targets: LCP under 2.5s, INP under 200ms, CLS under 0.1 on mid-range mobile over 4G.
18. Images must be optimized (.webp or .avif), use next/image, and be lazy-loaded when below the fold.
19. Use Next.js dynamic imports for large modules, and prefer Server Components by default, using Client Components only when interaction is needed.
20. Public pages must have proper SEO: metadata, Open Graph tags, sitemap, and semantic HTML.
21. Use TypeScript in strict mode for type safety. The any type is not allowed.
22. Naming must follow the Next.js + TypeScript convention (PascalCase for components, camelCase for variables/functions, kebab-case for files/folders) and be descriptive.
23. The code must avoid shorthand that reduces readability: no nested ternaries, no single-letter variable names (except loop index), no abbreviations, no clever one-liners.
24. Comments must be clear, concise, and explain why, not just what.
25. The code must be clean, following SOLID, DRY, KISS, and the Return Early Pattern.
26. The code must be scalable, maintainable, and not redundant.
27. Each file must have one clear purpose (Single Responsibility).
28. Use 2-space indentation, enforced by a formatter and linter with the Next.js recommended config.
29. Every component must be reusable and placed in /components, grouped by type (ui for basic elements, features for feature-specific components, layout for page layouts).
30. All assets (images, icons, fonts) must be stored in an organized /public directory.
31. API calls must use reusable utilities in /lib (example: /lib/api.ts), never inline in components.
32. Use one data fetching and caching library (SWR or React Query) across the whole app, chosen once in the Techstack.
33. State management must be simple: useState, useReducer, and Context first, before any heavy library.
34. Errors must be logged with enough context (user action, page, request ID) to a central error monitoring tool chosen in the Techstack, and users must see a friendly message instead of technical details.
35. Every feature must include tests: unit tests for logic, and end-to-end tests for main flows (send brief, approve, pay, download).
36. Linting, type check, and tests must pass in CI before any merge to the main branch.
37. Use a Git workflow with feature branches, pull requests, code review, and Conventional Commits.
38. A feature is done only when it meets these rules, passes tests, works on mobile and desktop, and has no known critical bugs.
39. Every project must have a README with setup steps, environment variables, and main commands.

**AI Rules**

1. AI prompts must be versioned in the repository, not written inline in code.
2. AI outputs must use structured schemas (JSON) and be validated before use.
3. Every AI and generation call must have a timeout, retry limit, cost limit, and fallback.
4. AI agents can only use tools allowed for their role, and can only access data of the current project and workspace.
5. Customer input and uploaded file content must be treated as data, never as instructions to AI agents, to prevent prompt injection.
6. Every AI call must be traced with agent name, prompt version, tokens, cost, latency, and project ID.
7. Model providers must be behind an adapter layer so they can be swapped without changing agent logic.
8. Changes to prompts or models must be tested against a fixed set of example briefs before release.

**Security Rules**

1. All traffic must use HTTPS with HSTS enabled. No HTTP endpoints in production.
2. Login must use a secure method: OTP via WhatsApp or email, or OAuth (Google). If passwords are used, they must be hashed with a strong algorithm (Argon2 or bcrypt), never stored in plain text.
3. Sessions must use httpOnly, Secure, and SameSite cookies. Tokens must never be stored in localStorage.
4. Admin accounts must use multi-factor authentication (MFA).
5. Authentication and authorization must be checked on the server for every protected route and API, including ownership checks, so a user can never access another workspace's projects, files, or data by changing an ID.
6. Every user, service, and AI agent must have the least privilege needed for its task.
7. All user input must be validated on the server with a schema validation library (not only on the client), all output must be escaped to prevent XSS, and all database queries must use parameterized queries or the ORM to prevent SQL injection.
8. Forms and state-changing requests must be protected against CSRF.
9. Security headers must be set: Content Security Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
10. Login, OTP, free trial, and public APIs must have rate limiting and brute-force protection.
11. File uploads must be checked by real file type (not only extension), have size limits, be scanned for malware, stored privately, never executed, and accessed only through signed expiring URLs.
12. Environment variables must be managed in .env.local, never hardcoded, never committed, and validated at startup. Production secrets must be stored in a secret manager and rotated periodically or immediately after a leak.
13. Payment and WhatsApp webhooks must verify signatures and be idempotent (the same event processed twice must not charge or deliver twice).
14. Dependencies must be locked (lockfile), scanned for known vulnerabilities in CI, and updated regularly.
15. AI usage must have cost limits per project and per user to prevent abuse.
16. Sensitive actions (payment, delete project, change role, delete account) must require confirmation and be recorded in an audit log.
17. Secrets, tokens, OTPs, full payment data, and unnecessary personal data must never appear in logs, URLs, or client-side code.
18. The admin panel must be separated from the customer app, protected with MFA, and every admin action must be logged.
19. Personal data must be handled according to UU PDP: collect only what is needed, store it securely, and allow users to delete their account and data.
20. There must be an incident response plan, including notifying affected users and authorities within the time required by UU PDP if a data breach happens.
21. A security review (and penetration test when budget allows) must be done before launch and after major changes.

**Database Rules**

1. The database must follow code-first: schema defined in code, changed only through versioned migrations that are reviewed and run by CI/CD, using one ORM chosen in the Techstack.
2. Migrations must be backward compatible so deploys do not break running code (add first, remove later).
3. No manual changes to the production database. Emergency fixes must be written as migrations afterwards.
4. Tables and columns must use snake_case, tables in plural (customers, projects, credit_ledgers), and names must be descriptive without abbreviations.
5. Primary keys must be named after the table in singular form plus _id (example: customers.customer_id, projects.project_id, workspaces.workspace_id). A column named only id is not allowed.
6. Foreign keys must use exactly the same name as the primary key they reference (example: projects.customer_id references customers.customer_id).
7. If one table references the same table twice, add a descriptive prefix (example: created_by_user_id, approved_by_user_id).
8. Primary keys must use UUID or ULID, not sequential numbers, so IDs cannot be guessed.
9. Every table must have created_at and updated_at. All times are stored in UTC and converted to WIB only when displayed.
10. Money and credits must be stored as integers (Rupiah, credits), never as float.
11. Use constraints to protect data: foreign keys, NOT NULL, UNIQUE, and CHECK where needed.
12. Every tenant table must have workspace_id, and every query must filter by it to keep customer data isolated.
13. Use relational tables for data that is queried or filtered. JSONB is only for flexible data such as the project document.
14. Multi-step writes (reserve credit, create project, record payment) must run inside a transaction.
15. The credit ledger and project document history must be append-only: records are never edited or deleted, only new records added.
16. Add indexes based on real query patterns, avoid N+1 queries, and every list endpoint must use pagination.
17. Queries must have a timeout, and the app must use connection pooling.
18. Use soft delete (deleted_at) for normal deletion, and hard delete for data deletion requests under UU PDP.
19. The app must connect with a database user that has only read and write rights. Only the migration process can change the schema.
20. The frontend must never connect to the database directly. All access goes through the API.
21. Data must be encrypted at rest, and sensitive columns (phone number, tokens) must be encrypted at column level where possible.
22. Backups must run daily with point-in-time recovery, be encrypted, and be restore-tested at least once a month.
23. Development, staging, and production must use separate databases. Production data must never be copied to development without anonymization.
24. Seed data for development and testing must be created through scripts, not by hand.
25. There must be a data retention policy: how long references, outputs, and logs are kept, and when they are deleted automatically.
