Closes #

## Summary

What changed, in a sentence or two.

## Acceptance criteria

Copy the **Done when** list from the issue and tick what this pull request actually meets.

- [ ]

**Not met:** anything left unfinished, and why. Say so here rather than leaving a box unticked with no
explanation — a blocked item is useful information, a silent one isn't.

## Decisions and assumptions

Anything you had to decide that the issue didn't settle. If it's the kind of thing someone would later
ask "why is it like this?" about, also record it as a comment on the issue in the standard format, so it
can be lifted into the published documentation later.

## Checks

- [ ] `npm run lint` is clean
- [ ] `npm run build` is clean
- [ ] Every interactive element added has a unique `id`
- [ ] No tag label text is hardcoded in a component — it comes from `data/taxonomy.js`
- [ ] No deploy or publish step added, and no `[push]` section in `rbs.toml`

## Testing

Testing on this project is integration-only, by deliberate choice — Playwright driving a real browser
against a real backend. There is no unit-test framework, so don't add unit tests for new work.

- [ ] Existing end-to-end tests still pass, or there are none yet covering this area
