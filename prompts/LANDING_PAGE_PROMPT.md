# CareMate Landing Page — Master Prompt (copy-paste to AI)

You are a world-class product designer + frontend engineer. Build a **single marketing website / landing page** for **CareMate**.

This is NOT a dashboard. This is a branded, emotional, conversion-focused landing page for families in Bangladesh who need trusted caregivers for parents and loved ones.

---

## Product (use this positioning — do not invent other products)

**CareMate** helps families remotely arrange **verified caregivers** for hospital assistance and home care.

- **User app:** families book a caregiver, pay with bKash, track booking status, get push updates
- **Caregiver app:** verified caregivers accept jobs, start/complete service, earn to wallet
- Trust via **eKYC verification** + ratings + clear booking journey
- Focus market: **Bangladesh** (Bengali + English copy OK; default UI language English with optional Bangla section labels if elegant)

**Out of scope for this landing page (do NOT mention as available features):**
- Doctor appointments, medicine delivery, ambulance, diagnostics, SOS mega-platform claims
- Keep the story tight: **verified caregiver booking for family care**

One-line brand promise:
> “Trusted caregivers for your parents — book, pay, and stay informed.”

---

## Hard design rules (must follow)

1. **One composition:** The first viewport must read as one composition, not a dashboard.
2. **Brand first:** “CareMate” must be a hero-level signal — not tiny nav text. No headline should overpower the brand.
3. **Brand test:** If you remove the nav and the first viewport could belong to another brand, branding is too weak. Fix it.
4. **Typography:** Use expressive, purposeful fonts. Avoid Inter / Roboto / Arial / system-ui as the primary pair. Prefer a distinctive display + clean body (e.g. something like Fraunces/Cabinet/Sora/Manrope equivalents via Google Fonts — pick a fresh pair, not generic SaaS defaults).
5. **Background:** Do not rely on flat single-color. Use atmospheric gradients, soft light, subtle patterns, or photography — but keep it calm and trustworthy (healthcare-adjacent, not cold hospital sterile).
6. **Full-bleed hero:** Hero image/visual must be a dominant edge-to-edge plane or background. No inset hero cards, side-panel hero images, rounded media cards, tiled collages, or floating image blocks in the hero.
7. **Hero budget:** First viewport only:
   - Brand (CareMate)
   - One headline
   - One short supporting sentence
   - One CTA group (max 2 buttons)
   - One dominant visual
   - No stats strips, schedules, address blocks, promo chips, or secondary marketing in the first viewport
8. **No hero overlays:** No floating badges, stickers, info chips, or callout boxes on top of hero media.
9. **Cards:** Default = no cards. Never use cards in the hero. Cards only when they contain a real interaction. If removing border/shadow/radius doesn’t hurt understanding, don’t make it a card.
10. **One job per section:** Each section = one purpose, one headline, one short supporting line.
11. **Real visual anchor:** Use imagery that feels like family care / hospital escort / caring presence in Bangladesh context (tasteful stock or illustrated scenes). Decorative purple blobs alone are not enough.
12. **Reduce clutter:** No pill clusters, stat strip spam, icon rows of 8+, boxed promos.
13. **Motion:** Ship **at least 3 intentional motions** (e.g. hero fade/rise, scroll reveal of sections, subtle CTA hover / caregiver path animation). Motion creates presence — not noise. Prefer CSS / Framer Motion. Respect `prefers-reduced-motion`.
14. **Color & look — AVOID these AI clichés:**
    - Purple-on-white / purple-to-indigo SaaS gradients
    - Warm cream (#F4F1EA-ish) + terracotta + high-contrast serif “AI brochure” look
    - Broadsheet newspaper layout (hairline rules, zero radius, dense columns)
    - Default dark mode for the whole site
    - Glow effects, rounded-full pill spam, multi-layer shadows, emoji decoration
15. **Chosen visual direction:** Calm trust + warmth.
    - Deep teal / soft seafoam / warm off-white / charcoal text
    - Accent: soft coral OR sunflower gold (pick ONE accent, use sparingly)
    - Define CSS variables for colors, radius, spacing, shadows
16. **Responsive:** Beautiful on mobile and desktop. Mobile-first. Touch-friendly CTAs.
17. **Performance:** Optimize images, avoid huge JS. Fast LCP.

---

## Page structure (recommended)

### 1) Sticky minimal nav
- CareMate wordmark (strong)
- Links: How it works · For families · For caregivers · Trust · FAQ
- CTA: “Download / Get the app” (or “Book care” if no store links yet — use placeholder `#`)

### 2) Hero (first viewport only)
- Brand: CareMate
- Headline idea (rewrite better if needed): “Care for your parents, even when you can’t be there.”
- Support: “Book verified caregivers for hospital visits and home support. Pay with bKash. Stay updated every step.”
- CTAs: Primary “Get the User App” · Secondary “Become a Caregiver”
- Full-bleed atmospheric visual (family + caregiver / hospital escort vibe) — edge to edge

### 3) How it works (families) — 3 steps, not cards-as-boxes if avoidable
1. Choose a verified caregiver  
2. Book time & hospital / home care  
3. Pay with bKash · track status · get notifications  

### 4) Trust section
- Verified caregivers (eKYC)
- Ratings & reviews
- Clear booking timeline (assigned → accepted → paid → in progress → completed)
- Safe cancel / support tone (don’t overpromise legal guarantees)

### 5) For caregivers
- Earn with dignity
- Accept jobs that fit your weekly availability
- Wallet + withdrawals
- CTA to Caregiver app

### 6) App dual showcase
- Two phone mockups (User app + Caregiver app) with subtle parallax or scroll animation
- Short captions only

### 7) FAQ (accordion, accessible)
- Who is CareMate for?
- Are caregivers verified?
- How do I pay?
- What if a caregiver can’t accept?
- Is CareMate a hospital / doctor service? → No — caregiver assistance marketplace

### 8) Final CTA band
- Strong brand + one sentence + app buttons
- Footer: privacy, terms placeholders, contact email placeholder

---

## Copy tone
- Warm, clear, respectful — Bangladesh family care
- Short sentences
- No startup jargon (“synergy”, “revolutionize”, “AI-powered care OS”)
- No fake stats unless labeled as examples; prefer qualitative trust language over invented numbers

---

## Tech requirements
- Modern stack: **Next.js (App Router) + TypeScript + Tailwind CSS** OR clean HTML/CSS/JS if simpler — prefer Next.js if building a real site
- Semantic HTML, accessible (keyboard FAQ, focus states, alt text)
- SEO: title, meta description, Open Graph tags for CareMate
- Placeholder app store / Play Store links as `#` with TODO comments
- Single landing route `/`
- Smooth scroll for nav anchors
- No backend required

---

## Deliverables
1. Working landing page project
2. README with run instructions (`npm install` / `npm run dev`)
3. CSS variables for the design system
4. Notes on where to replace images / store links / contact email

---

## Acceptance checklist
- [ ] First viewport passes the brand test
- [ ] Hero is full-bleed, no overlay badges, no card collage
- [ ] No purple SaaS cliché / cream-terracotta cliché / newspaper cliché
- [ ] At least 3 intentional animations + reduced-motion support
- [ ] Mobile looks as intentional as desktop
- [ ] Product scope stays caregiver marketplace only
- [ ] CTAs for User app and Caregiver app are obvious
- [ ] Page feels trustworthy, calm, and premium — not busy

Build it now. Make it stunning.
