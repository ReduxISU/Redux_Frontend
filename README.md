# Redux Frontend

**An alternative frontend to the Redux computational complexity knowledgebase.**

This is a standalone Next.js web client for the [Redux backend](https://github.com/ReduxISU/Redux), independent of the existing [Redux_GUI](https://github.com/ReduxISU/Redux_GUI) — the same relationship [Redux_VR](https://github.com/ReduxISU/Redux_VR) already has to the backend. It's being built to match a new design (a faceted catalog/browse experience with a Home page and a Problem Detail page), with its own repo per director request rather than as an addition to `Redux_GUI`.

## Status: scaffolding in place — catalog UI not built yet

Next.js scaffolding is complete and verified working (`npm install`, `npm run build`, and `npm run lint` all pass) — but the actual catalog UI described below hasn't been built yet. `pages/index.js` is currently just a placeholder page. The plan is to build the visual/interaction shell next (layout, routing, components against placeholder data), then wire it up to the real Redux backend plus a small local overlay for the handful of tag categories the backend doesn't support yet.

## Planned Features

- **Home page** — browse the full problem catalog. A search bar filters by problem name (e.g. "3-SAT"), and a sidebar provides faceted filtering across **8** tag categories: Problem Type, Computational Model, Complexity Class, Quantum Complexity Class, Solver Type, Reduction Type, Reduction Cost, and Visualization Type. (Solver Complexity is tracked too, but as per-solver metadata on the Problem Detail page, not a sidebar facet — see below.) Selections combine with OR within a facet and AND across facets, with live per-value match counts and removable "active filter" chips.
- **Card grid** — each problem's name, complexity badges, solver-type badges, Problem Type tag, and a status icon at a glance, matching the approved design mockup.
- **Problem Detail page** (`/[problem]`) — five sections users can drag-reorder (by a grip handle) and independently collapse: **Overview** (Input:/Output: statement, source, contributors — no set-notation formal definitions), **Visualizations**, **Solvers** (paste-an-instance format + a list of implemented solvers, each tagged with its Solver Type and Solver Complexity), **Verifier** (certificate format + a checker, labeled generically "Default Verifier," not problem-prefixed), **Reductions** (reduces-to/reduces-from lists with cost badges, plus a rendering of the reduction diagram). A "Reset to default" control restores the standard order (Overview, Visualizations, Solvers, Verifier, Reductions).
- **Real backend data wherever the backend already supports it.** 4 of the 8 sidebar facets are backed by the real `Redux` API today (Complexity Class, Solver Type, Reduction Cost, Visualization Type); the other 4 (Problem Type, Computational Model, Quantum Complexity Class, Reduction Type) use a small local overlay designed to be phased out field-by-field as the backend adds native support. Solver Complexity (the per-solver field, not a sidebar facet) is also real-backend-driven, though the backend currently only supports 3 of the 8 ratified complexity buckets.
- **v1 scope note:** Visualizations, Solvers, Verifier, and Reductions all show real declared data, but their interactive pieces are static/canned rather than live for v1 — Solvers' "Run" and Verifier's "Verify" return fixed output rather than calling the backend, and Visualizations/Reductions render a static diagram rather than the mockup's live step-scrubber with draggable/editable nodes (Reductions is arguably the single most complex interactive piece in the whole design, so it's deliberately scoped down along with the others rather than assumed to be simpler). Wiring any of this up live is an explicit later phase, not blocking v1.
- **Site chrome** — top nav bar ("REDUX" wordmark, Home/Help/Contribute), a breadcrumb ("Home / {Problem}") on the detail page, a dynamic problem-count tagline on Home (e.g. "N catalogued problems across complexity classes, solvers, and visualizations"), and a `/` keyboard shortcut to focus the search bar. **Help and Contribute are chrome only for v1** — visible in the nav, but either linking out to `Redux_GUI`'s existing Help/Contribute pages or inert placeholders, not real content built fresh in this project.
- **Accessibility (explicit v1 requirement, not a later pass):** every interactive element gets a unique `id` — `Redux_GUI` has a known bug where all six of its dropdowns share `id="search-bar"`, breaking screen-reader labeling, and this project deliberately avoids repeating it. Drag-to-reorder on the detail page needs a keyboard-operable alternative, not just pointer/touch (`@dnd-kit`'s `KeyboardSensor`).
- **Responsive layout (required for v1).** The mockup itself is desktop-only — there's no mobile design to match. This means following standard responsive patterns (a collapsing sidebar, a card grid that reduces columns at narrower widths) and making reasonable layout calls where no mockup exists to check them against, rather than a pixel-accurate mobile translation of the desktop design. Touch-based drag-to-reorder is already covered by the ported `@dnd-kit` pointer+touch sensor pattern.

## Setup and Run

These instructions work today and will start a real dev server — but until the catalog UI is built, what you'll see is the placeholder page mentioned above, not the features described earlier in this README.

### Prerequisites

- [Node.js](https://nodejs.org/en/download) 24 or newer (Active LTS as of when this was set — see `package.json`'s `engines` field)
- The [Redux backend](https://github.com/ReduxISU/Redux) running, once you get to building against real data — the placeholder page doesn't call it yet

### Environment variables

The app needs one environment variable, `REDUX_BASE_URL`, telling it which Redux backend to talk to. **This applies no matter how you run the app** — local dev, a production build, or Docker all read the same value, just supplied a different way for each (see each section below). (Note: the code that actually reads this — the API proxy — hasn't been built yet, so setting this up won't change what the placeholder page shows today. Set it up now anyway; it's one less step later.)

For local dev and production builds, here's exactly how to set it up:

1. **Copy the example file** in the project root to create your own local copy:

   ```bash
   cp .env.example .env.local
   ```

   (On Windows PowerShell: `Copy-Item .env.example .env.local`)

2. **Open `.env.local`** in a text editor. You'll see two options, already explained in comments inside the file:
   - The **default** line points at the **live production Redux backend** — real data, and you don't need to run anything else. If you just want to see the app working, leave this as-is and skip to step 3.
   - A **commented-out local option** below it, for when you're also running the [Redux backend](https://github.com/ReduxISU/Redux) yourself (e.g. its devcontainer on port `27000`). Only use this if you know you need it — if you're not sure, use the default.

3. **Save the file.** Next.js automatically loads `.env.local` for both `npm run dev` and `npm run build`/`npm start` — no other configuration step is needed, and you don't need to restart anything except the dev server if it was already running when you created the file.

Docker doesn't use `.env.local` at all — it's passed in as a `-e` flag on `docker run` instead, shown in the Docker section below.

**Common mistakes to avoid:**
- The file must be named exactly `.env.local` (not `.env.example.local`, not `.env`) — Next.js only auto-loads specific filenames, and `.env.local` is the one meant for your own machine.
- `.env.local` is intentionally in `.gitignore` — it should never be committed. If `git status` shows it as a new file, something's wrong; stop and ask before committing it.
- Don't remove the trailing slash (`/`) at the end of the URL.
- If pages load but show no data, this is almost always the first thing to check: open `.env.local` and confirm `REDUX_BASE_URL` is set to one of the two provided values (uncommented, not both).

### Local development

Needs `REDUX_BASE_URL` set up per "Environment variables" above.

```bash
git clone https://github.com/ReduxISU/Redux_Frontend.git
cd Redux_Frontend
npm install
npm run dev
```

### Production build

Also needs `REDUX_BASE_URL` set up per "Environment variables" above.

```bash
npm run build
npm start
```

### Docker

`REDUX_BASE_URL` is supplied at container start, not via `.env.local`:

```bash
npm run build
docker build -t redux_frontend .
docker run -it --rm -p 3000:3000 -e REDUX_BASE_URL=https://redux.isu.edu/api/redux/ --name redux_frontend redux_frontend
```

## Related repositories

- **Backend API:** [Redux](https://github.com/ReduxISU/Redux)
- **Existing frontend:** [Redux_GUI](https://github.com/ReduxISU/Redux_GUI)
- **VR frontend:** [Redux_VR](https://github.com/ReduxISU/Redux_VR)
- **Quantum solver service:** [quantumsolver](https://github.com/ReduxISU/quantumsolver)
- **Build/CI tooling:** [Redux_Build_System](https://github.com/ReduxISU/Redux_Build_System)

## Technology (planned)

Next.js / React / MUI, matching `Redux_GUI`'s stack for consistency across the org's frontends.

## License

BSD 3-Clause — see [LICENSE](./LICENSE). See [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.
