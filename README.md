# Redux Frontend

**An alternative frontend to the Redux computational complexity knowledgebase.**

This is a standalone Next.js web client for the [Redux backend](https://github.com/ReduxISU/Redux), independent of the existing [Redux_GUI](https://github.com/ReduxISU/Redux_GUI) — the same relationship [Redux_VR](https://github.com/ReduxISU/Redux_VR) already has to the backend. It's being built to match a new design (a faceted catalog/browse experience with a Home page and a Problem Detail page), with its own repo per director request rather than as an addition to `Redux_GUI`.

## Status: planning

No application code has been written yet. Read these two documents first — they're the source of truth for what's being built and why:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — directory structure, what's being ported from `Redux_GUI` vs. built fresh, build sequencing, and open scaffolding decisions.
- **[TAXONOMY_REFERENCE.md](./TAXONOMY_REFERENCE.md)** — the full 9-facet tagging taxonomy this UI filters on, reconciled field-by-field against what the real `Redux` backend actually supports today, and what would need to be added to it.

## Related repositories

- **Backend API:** [Redux](https://github.com/ReduxISU/Redux)
- **Existing frontend:** [Redux_GUI](https://github.com/ReduxISU/Redux_GUI)
- **VR frontend:** [Redux_VR](https://github.com/ReduxISU/Redux_VR)
- **Quantum solver service:** [quantumsolver](https://github.com/ReduxISU/quantumsolver)
- **Build/CI tooling:** [Redux_Build_System](https://github.com/ReduxISU/Redux_Build_System)

## Technology (planned)

Next.js / React / MUI, matching `Redux_GUI`'s stack for consistency across the org's frontends — see `ARCHITECTURE.md` for the full breakdown of what's ported vs. new.
