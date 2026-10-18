# Nvirya Portfolio (`https://nvirya.com/@me`)

Production-ready personal developer portfolio for **Nvirya** (`NVR://DIGITAL`), designed for deployment at `https://nvirya.com/@me`.

## Architecture & Highlights

- **Visual Direction**: Editorial minimalist Swiss grid with exposed 1px hairlines, crisp paper-white (`#FAFAFA`) and near-black (`#09090B`) surfaces, graphite/silver hierarchy, and zero decorative gradients or glassmorphism clutter.
- **Theme System**: Three-mode segmented controller (`System`, `Light`, `Dark`) with synchronous `<head>` initialization (preventing FOUC), `prefers-color-scheme` live OS event listener, and safe `localStorage` persistence (`nvirya_theme_pref`).
- **Three.js Computational Geometry Lattice**: Dynamically loaded (`r128`) geodesic/octahedral node lattice with orbital coordinate rings, pointer parallax, mobile touch support (`touch-action: pan-y`), `prefers-reduced-motion` compliance, `IntersectionObserver` & `visibilitychange` pause, WebGL context-loss recovery, GPU disposal, and immediate static SVG blueprint fallback.
- **Verified Project Content**:
  1. **Nvirya AdGuard (`v10.4.1.8`)** — [Greasy Fork](https://greasyfork.org/en/scripts/599226-nvirya-adguard) & [Version History](https://greasyfork.org/en/scripts/599226-nvirya-adguard/versions) + interactive runtime config simulator.
  2. **Elyriax & Nvirya AI Workspace** — [nvirya.com](https://nvirya.com/) + three-pane shell & reasoning trace diagram.
  3. **Nvirya API** — [api.nvirya.com](https://api.nvirya.com) gateway & userscript distribution topology.
  4. **Nvirya Translate (Sachitone Runtime)** — FastAPI + Uvicorn + Discord Gateway + SQLite (`translator.db`) architecture.
