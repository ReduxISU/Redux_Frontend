# Redux Frontend

**An alternative frontend to the Redux computational complexity knowledgebase.**

This is a standalone Next.js web client for the [Redux backend](https://github.com/ReduxISU/Redux), independent of the existing [Redux_GUI](https://github.com/ReduxISU/Redux_GUI) — the same relationship [Redux_VR](https://github.com/ReduxISU/Redux_VR) already has to the backend. It's being built to match a new design (a faceted catalog/browse experience with a Home page and a Problem Detail page), with its own repo per director request rather than as an addition to `Redux_GUI`.

## Status: planning — no application code yet

This repo currently has no `package.json` and no Next.js scaffolding. The plan is to build the visual/interaction shell first (layout, routing, components against placeholder data), then wire it up to the real Redux backend plus a small local overlay for the handful of tag categories the backend doesn't support yet.

## Planned Features

- **Home page** — browse the full problem catalog with faceted sidebar filtering across 9 tag categories: Problem Type, Computational Model, Complexity Class, Quantum Complexity Class, Solver Type, Solver Complexity, Reduction Type, Reduction Cost, and Visualization Type. Selections combine with OR within a facet and AND across facets, with live per-value match counts and removable "active filter" chips.
- **Card grid** — each problem's name, complexity class, solver types, and problem type at a glance, matching the approved design mockup.
- **Problem Detail page** (`/[problem]`) — five sections users can drag-reorder (by a grip handle) and independently collapse: **Overview** (Input:/Output: statement, source, contributors — no set-notation formal definitions), **Visualizations**, **Solvers** (paste-an-instance format + a list of implemented solvers), **Verifier** (certificate format + a checker), **Reductions** (step-through visualization of a reduction to another problem, plus reduces-to/reduces-from lists). A "Reset to default" control restores the standard order (Overview, Visualizations, Solvers, Verifier, Reductions).
- **Real backend data wherever the backend already supports it.** 5 of the 9 facets are backed by the real `Redux` API today (Complexity Class, Solver Type, Solver Complexity, Reduction Cost, Visualization Type); the other 4 use a small local overlay designed to be phased out field-by-field as the backend adds native support.
- **v1 scope note:** Solvers and Verifier show real declared data (names, types, formats) but "Run"/"Verify" return canned output rather than calling the backend live — wiring those up is an explicit later phase, not blocking v1.

## Setup and Run

**Not yet functional.** The instructions below describe the intended setup once scaffolding lands, mirroring `Redux_GUI`'s conventions for consistency across the org's frontends.

### Prerequisites

- [Node.js](https://nodejs.org/en/download) (matching `Redux_GUI`'s requirement, currently Node 26+)
- The [Redux backend](https://github.com/ReduxISU/Redux) running — this frontend has no data of its own

### Local development

```bash
git clone https://github.com/ReduxISU/Redux_Frontend.git
cd Redux_Frontend
npm install
npm run dev
```

The app will need a `REDUX_BASE_URL` environment variable pointing at a running Redux backend instance (see `.env.example`, once added).

### Production build

```bash
npm run build
npm start
```

### Docker

```bash
npm run build
docker build -t redux_frontend .
docker run -it --rm -p 3000:3000 --name redux_frontend redux_frontend
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
