# Graph Report - Anvesha-'26  (2026-08-10)

## Corpus Check
- 14 files · ~9,029 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 115 nodes · 125 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
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

## God Nodes (most connected - your core abstractions)
1. `../layouts/SiteLayout.astro` - 11 edges
2. `selectItem()` - 7 edges
3. `scripts` - 5 edges
4. `syncTree()` - 5 edges
5. `renderViews()` - 4 edges
6. `syncViews()` - 4 edges
7. `goView()` - 4 edges
8. `Astro Starter Kit: Basics` - 4 edges
9. `buildTree()` - 3 edges
10. `scrollCentre()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

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
Cohesion: 0.21
Nodes (13): animateSelect(), buildTree(), centreActive(), goView(), renderHero(), renderSizes(), renderViews(), revealActiveItem() (+5 more)

### Community 6 - "merch.astro"
Cohesion: 0.04
Nodes (42): lucide-static/icons/award.svg?raw, lucide-static/icons/book-open.svg?raw, lucide-static/icons/bookmark.svg?raw, lucide-static/icons/box.svg?raw, lucide-static/icons/chevron-left.svg?raw, lucide-static/icons/chevron-right.svg?raw, lucide-static/icons/circle-dot.svg?raw, lucide-static/icons/coffee.svg?raw (+34 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "../layouts/SiteLayout.astro"
Cohesion: 0.18
Nodes (10): lucide-static/icons/calendar-days.svg?raw, lucide-static/icons/flask-conical.svg?raw, lucide-static/icons/house.svg?raw, lucide-static/icons/mic-vocal.svg?raw, lucide-static/icons/shopping-bag.svg?raw, ./Layout.astro, ../layouts/SiteLayout.astro, NAV (+2 more)

## Knowledge Gaps
- **74 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../layouts/SiteLayout.astro` connect `../layouts/SiteLayout.astro` to `merch.astro`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `merch.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._