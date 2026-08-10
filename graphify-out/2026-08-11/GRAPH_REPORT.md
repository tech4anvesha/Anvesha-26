# Graph Report - Anvesha-'26  (2026-08-11)

## Corpus Check
- 18 files · ~14,262 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 157 nodes · 190 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c16e0560`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- package.json
- Welcome.astro
- selectItem
- merch.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- ../layouts/SiteLayout.astro
- events.astro
- outreach.astro
- addToBag

## God Nodes (most connected - your core abstractions)
1. `../layouts/SiteLayout.astro` - 14 edges
2. `selectItem()` - 8 edges
3. `scripts` - 5 edges
4. `lucide-static/icons/arrow-right.svg?raw` - 5 edges
5. `syncTree()` - 5 edges
6. `renderViews()` - 4 edges
7. `syncViews()` - 4 edges
8. `goView()` - 4 edges
9. `renderMGrid()` - 4 edges
10. `Astro Starter Kit: Basics` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.18
Nodes (11): astro, lucide-static, dependencies, astro, gsap, lucide-static, tailwindcss, @tailwindcss/vite (+3 more)

### Community 2 - "package.json"
Cohesion: 0.18
Nodes (10): engines, node, name, scripts, astro, build, dev, preview (+2 more)

### Community 4 - "selectItem"
Cohesion: 0.18
Nodes (15): animateSelect(), buildTree(), goView(), openSheet(), renderHero(), renderMCats(), renderMGrid(), renderSizes() (+7 more)

### Community 6 - "merch.astro"
Cohesion: 0.04
Nodes (44): lucide-static/icons/award.svg?raw, lucide-static/icons/bookmark.svg?raw, lucide-static/icons/box.svg?raw, lucide-static/icons/chevron-left.svg?raw, lucide-static/icons/chevron-right.svg?raw, lucide-static/icons/circle-dot.svg?raw, lucide-static/icons/coffee.svg?raw, lucide-static/icons/droplets.svg?raw (+36 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "../layouts/SiteLayout.astro"
Cohesion: 0.27
Nodes (9): lucide-static/icons/calendar-days.svg?raw, lucide-static/icons/flask-conical.svg?raw, lucide-static/icons/handshake.svg?raw, lucide-static/icons/house.svg?raw, lucide-static/icons/megaphone.svg?raw, lucide-static/icons/shopping-bag.svg?raw, ./Layout.astro, ../layouts/SiteLayout.astro (+1 more)

### Community 11 - "events.astro"
Cohesion: 0.12
Nodes (16): lucide-static/icons/atom.svg?raw, lucide-static/icons/battery-charging.svg?raw, lucide-static/icons/bot.svg?raw, lucide-static/icons/brain.svg?raw, lucide-static/icons/clock.svg?raw, lucide-static/icons/code.svg?raw, lucide-static/icons/cpu.svg?raw, lucide-static/icons/dna.svg?raw (+8 more)

### Community 12 - "outreach.astro"
Cohesion: 0.12
Nodes (15): lucide-static/icons/arrow-right.svg?raw, lucide-static/icons/book-open.svg?raw, lucide-static/icons/bus.svg?raw, lucide-static/icons/camera.svg?raw, lucide-static/icons/check.svg?raw, lucide-static/icons/globe.svg?raw, lucide-static/icons/graduation-cap.svg?raw, lucide-static/icons/hand-heart.svg?raw (+7 more)

### Community 13 - "addToBag"
Cohesion: 0.67
Nodes (3): addToBag(), openCart(), renderCart()

## Knowledge Gaps
- **92 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../layouts/SiteLayout.astro` connect `../layouts/SiteLayout.astro` to `events.astro`, `outreach.astro`, `merch.astro`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Why does `lucide-static/icons/arrow-right.svg?raw` connect `outreach.astro` to `../layouts/SiteLayout.astro`, `events.astro`, `merch.astro`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `lucide-static/icons/map-pin.svg?raw` connect `events.astro` to `merch.astro`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `merch.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `events.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `outreach.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._