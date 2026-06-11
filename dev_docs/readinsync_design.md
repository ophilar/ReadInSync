# ReadInSync - Google Stitch Design System Specs

This document acts as the Google Stitch `DESIGN.md` specification for ReadInSync, defining the aesthetic tokens, layout rules, typography, and premium component specs to guarantee strict design consistency.

---

## 🎨 1. Color Palette Tokens (Semantic UI System)

ReadInSync uses a rich, dark-mode-first aesthetic with dynamic glassmorphism and subtle neon accents.

| Token | CSS Variable Value / HSL | Purpose | Visual Identity |
| :--- | :--- | :--- | :--- |
| `primary` | `#6366f1` / `hsl(239, 84%, 67%)` | Core Accent Theme | Indigo Neon Glow |
| `primary-hover` | `#4f46e5` / `hsl(243, 75%, 59%)` | Active States / Interactive Highlights | Deep Indigo |
| `background` | `#0f172a` / `hsl(222, 47%, 11%)` | Deepest Workspace Canvas | Slate Black |
| `background-gradient`| `linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)` | Main Backdrop Flow | Cosmic Twilight Glow |
| `surface` | `rgba(255, 255, 255, 0.03)` | Card Backgrounds / Input Wells | Soft Glass Overlay |
| `surface-border` | `rgba(255, 255, 255, 0.08)` | High Contrast Separators | Subtle Frosted Edge |
| `text-primary` | `#f1f5f9` / `hsl(210, 40%, 98%)` | High Visibility Text | Frosted White |
| `text-muted` | `#94a3b8` / `hsl(215, 16%, 65%)` | Captions / Metadata / Labels | Slate Gray |
| `status-active` | `#34d399` / `hsl(158, 64%, 52%)` | Dynamic Sync Active Status | Emerald Green |
| `status-error` | `#fca5a5` / `hsl(0, 93%, 84%)` | Input / Configuration Mismatches | Coral Red |

---

## ✍️ 2. Typography & Font Families

Modern, crisp, screen-optimized sans-serif fonts are mandatory. Avoid browser defaults.

- **Primary Sans Font**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (Inter / Outfit preferred where available).
- **Code & Numeric Font**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` (JetBrains Mono preferred).

### Typography Scale
- **Large Header**: `18px`, Bold (tracking `-0.5px`) — For main titles.
- **Section Title**: `14px`, Semi-Bold — For card headers.
- **Body Regular**: `12px`, Regular (line-height `1.5`) — For standard labels/inputs.
- **Caption / Label**: `10px`, Bold (tracking `0.5px`, uppercase) — For form headings.
- **Code Block**: `10px` or `11px`, Regular (line-height `1.6`) — For data/ciphertext dumps.

---

## 🧱 3. Layout, Spacings & Borders

Stitch requires a rigid grid spacing system to preserve cross-platform balance.

- **Workspace Padding**: `20px` uniformly around active body context.
- **Border Radii Scale**:
  - `card-radius`: `12px` (Frosted glass containers).
  - `element-radius`: `8px` (Buttons, inputs, badges).
  - `pill-radius`: `9999px` (Status badges).
- **Glassmorphic Attributes**:
  - `backdrop-filter`: `blur(10px)`
  - `box-shadow`: `0 8px 32px rgba(0, 0, 0, 0.2)`
- **Debounced Transitions**: All hover animations must execute under `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`.

---

## 📦 4. Component Visual Rules

### I. Glassmorphic Card Container
```css
.card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
```

### II. Interactive Input Fields
- Must feature a solid dark background `rgba(0, 0, 0, 0.2)`.
- Active focus must transition to `border-color: var(--accent)` accompanied by a subtle glow `box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25)`.

### III. Premium Navigation Headers
- Employs a crisp border divider `1px solid rgba(255, 255, 255, 0.08)`.
- Displays the iconic Indigo Neon logo (`#6366f1` base with `box-shadow: 0 0 12px rgba(99, 102, 241, 0.4)`).

### IV. Status Badges & Indicators
- Emerald badges use a faint background tint `rgba(16, 185, 129, 0.08)` and border `rgba(16, 185, 129, 0.15)` for premium contrast.
- Uses an active `pulse` micro-animation (fade between `0.4` and `1` opacity over `1.5s`) for dynamic feedback.
