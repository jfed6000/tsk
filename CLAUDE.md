# Texas Shitkickers

A Final Fight-style brawler for the Wildbits F256 (NitrOS-9 Level 2, 6809), designed first as a browser prototype
in `game/` that obeys the F256 display rules.

- **Start here:** `game/docs/status.md` (the handoff), then `game/docs/story.md` and `game/docs/f256-plan.md`.
- **Hardware rules:** `game/port-guide.md` (the user's F256 porting guide). Check any new visual feature against
  its section 6 (sprites 32×32, ≤128 records, 4 CLUTs, no flip/rotate/blend, 3 layers).
- **Project tracking: PPM project `texas-shitkickers` (id 658)**, via the ppm MCP server.
  - At the end of each session or major coding sprint, add a **journal entry** saying where things stand.
  - Anything the user needs to do becomes a **task assigned to jfed**, with a kill date on the day it's created and
    due two days later. Claude's tasks are assigned to `claude` with no dates.
  - Tasks link (`affects`) to the Components deliverables they change. Complete them in PPM when done.
- Test headless with Chromium and the URL flags (`?ff`, `?bot`, `?god`, `?debug`, `?sheet`); see `game/README.md`.
- Commit when work is done (branch main; no remote yet).
