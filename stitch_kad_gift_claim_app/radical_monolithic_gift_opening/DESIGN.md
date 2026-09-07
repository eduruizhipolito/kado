---
name: Radical Monolithic Gift Opening
colors:
  surface: '#170f26'
  surface-dim: '#170f26'
  surface-bright: '#3e354d'
  surface-container-lowest: '#120a20'
  surface-container-low: '#1f172e'
  surface-container: '#231c32'
  surface-container-high: '#2e263d'
  surface-container-highest: '#393149'
  on-surface: '#eaddfd'
  on-surface-variant: '#cac4d5'
  inverse-surface: '#eaddfd'
  inverse-on-surface: '#352c44'
  outline: '#938e9e'
  outline-variant: '#484553'
  surface-tint: '#ccbeff'
  primary: '#ccbeff'
  on-primary: '#340f8d'
  primary-container: '#4b2fa3'
  on-primary-container: '#baa8ff'
  inverse-primary: '#644abd'
  secondary: '#d0c5b5'
  on-secondary: '#363024'
  secondary-container: '#4f483c'
  on-secondary-container: '#c1b7a7'
  tertiary: '#ffb4a3'
  on-tertiary: '#630f00'
  tertiary-container: '#8b1900'
  on-tertiary-container: '#ff9a83'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#ccbeff'
  on-primary-fixed: '#1e0060'
  on-primary-fixed-variant: '#4b2fa3'
  secondary-fixed: '#ece1d0'
  secondary-fixed-dim: '#d0c5b5'
  on-secondary-fixed: '#201b11'
  on-secondary-fixed-variant: '#4d463a'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a3'
  on-tertiary-fixed: '#3d0600'
  on-tertiary-fixed-variant: '#8c1900'
  background: '#170f26'
  on-background: '#eaddfd'
  surface-variant: '#393149'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 60px
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.035em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.12em
  label-mono-equivalent:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.02em
spacing:
  zero: 0px
  hairline: 1px
  seam-line: 2px
  pad-xs: 0.25rem
  pad-sm: 0.5rem
  pad-md: 1rem
  pad-lg: 1.5rem
  pad-xl: 2rem
  pad-2xl: 3rem
  pad-3xl: 4rem
  gutter: 1.25rem
  margin-edge: 1.5rem
---

## Brand & Style

The design system embodies radical minimalism and physical metaphor without skeuomorphic clutter. Built specifically for attendees receiving digital funds via the Stellar network in Lima, the design deliberately rejects traditional celebratory clichés: no floating confetti, no illustrated ribbon bows, no layered cards, and zero drop shadows. 

Instead, the mobile device screen itself transforms directly into the physical lid of an unadorned, monolithic vessel. The psychological state is intimate, focused, ceremonial, and serene. The aesthetic combines pure planar fields of deep color with a singular tactile interaction—a clean horizontal razor-line seam that splits or slides away to reveal the warm, luminous chamber containing the balance. The tone balances cryptographic finality with high-end editorial calm.

## Colors

The palette operates around a binary state: Closed (Exterior) versus Revealed (Interior).

- **Primary / Lid Background (`#4B2FA3`)**: Saturated, rich violet. It fills the screen edge-to-edge as a full-bleed monolith representing the unopened gift vessel.
- **Interior / Revealed Background (`#FFF3E2`)**: Warm, papery cream. Revealed beneath the lid upon opening, hosting the monetary receipt and the personal message.
- **Ink / Revealed Text (`#241C33`)**: Deep obsidian ink. Used exclusively atop the `#FFF3E2` interior to provide stark, readable contrast without cold digital black.
- **Seam Accent Line (`#FF6B4A`)**: Vibrant coral line. Strictly reserved for the razor-thin interactive seam indicator where the physical lid uncouples.
- **Muted / Inactive Seam (`#7A6F8F`)**: Desaturated violet-slate. Indicates locked, pending network settlement, or unprimed states along the seam.
- **Success / Confirmation (`#2E9E6B`)**: Pure evergreen. Applied sparingly for successful ledger commits, cryptographic balance confirmations, and final settlement marks.

Never use gradients, blurred colored backdrops, or color overlays. Surfaces must remain uniform, solid, and flat.

## Typography

The typography system relies exclusively on a single geometric sans-serif typeface: **Plus Jakarta Sans**. Variation is achieved solely through stark scale and weight shifts.

- **The Numeric Amount (`display-hero` / `display-hero-mobile`)**: Rendered in ultra-heavy weight (`800`), commanding immediate visual mass on the interior surface. It treats currency as architectural form.
- **Narrative & Greetings (`body-lg`, `body-md`)**: Regular weight (`400`) set with generous line heights to evoke clean literary stationery.
- **System Metas & Stellar Public Keys (`label-caps`, `label-mono-equivalent`)**: Set with extended tracking to ground technical details without resorting to secondary monospace font families.

All letterforms are anti-aliased. No decorative font pairings or italics are permitted.

## Layout & Spacing

The layout is built entirely on edge-to-edge full-bleed containment. There are no inset floating containers, margins around structural panels, or floating modal sheets.

- **Form Factor Focus**: Primary focus is mobile viewport (360px–430px width).
- **The Monolithic Canvas**: 100vw × 100dvh viewport bounds. The primary background (`#4B2FA3`) coats the full viewport.
- **The Seam Anchor**: A horizontal demarcation placed strictly at 62% from the viewport top. The interactive slice gesture originates along this horizontal vector.
- **Interior Layout**: Once unlatched, the cream interior (`#FFF3E2`) occupies the bottom portion or takes over the full viewport through planar displacement. Content within uses generous vertical pacing (`pad-xl`, `pad-2xl`) and fixed horizontal margins (`margin-edge: 1.5rem`).
- **Vertical Rhythm**: Large spatial voids separate metadata, the primary amount, and actionable triggers, allowing negative space to build ceremony and tension.

## Elevation & Depth

Visual hierarchy is expressed purely through **planar juxtaposition and two-dimensional geometric splits**.

- **No Shadows**: Drop shadows, box shadows, and ambient tinted glows are forbidden.
- **No Skeuomorphic Gradients**: No light reflections, glossy bands, or convex bevels.
- **No Inset Borders**: Visual partitions are created solely where the edge of the violet `#4B2FA3` lid ends and the cream `#FFF3E2` interior begins.
- **The Seam Line**: A physical 2px stroke (`seam-line`) colored `#FF6B4A` acts as the sole demarcation element between the upper and lower halves of the unopened state.
- **Kinetic Depth**: Elevation is implied in motion only—when sliding open, panels move smoothly across an absolute axis like cut cardstock or lacquer sliding along a milled groove, with no blur or shadow underneath.

## Shapes

The shape system is strictly **Sharp (Level 0)**.

- All panels, buttons, tabs, split lines, and structural elements have an exact border-radius of `0px`.
- The screen boundary defines the visual edge.
- Interactive tap zones are rectangular geometries stretching flush edge-to-edge or defined by razor-straight rectilinear boundaries.
- No rounded pills, no soft corners, and no circular badges.

## Components

### 1. The Monolith Lid & Seam (Primary Vessel)
- **Visuals**: Full-bleed `#4B2FA3` surface split by a 2px horizontal line positioned at 62% viewport height.
- **States**:
  - *Inactive/Awaiting Transfer*: Seam is `#7A6F8F`.
  - *Ready to Open*: Seam lights up in `#FF6B4A`.
  - *Interaction*: Horizontal slide/swipe along the seam, sliding the top lid upward and bottom drawer downward to reveal `#FFF3E2`.

### 2. Buttons / Action Strips
- **Structure**: Zero radius, zero border, full-bleed width or flush block.
- **Closed State Action**: Solid block sitting flush at the bottom edge. Background `#FFF3E2`, text `#241C33`, uppercase, weight `600`.
- **Interior Action (Claim/Deposit to Stellar)**: Solid `#241C33` block, text `#FFF3E2`, 56px height, full width minus edge margins, weight `600`. Hover/active states simply lower font opacity to `80%` or invert background to `#2E9E6B` upon confirmation.

### 3. Display Balance & Gift Note (Interior Vessel)
- **Container**: Solid `#FFF3E2` sheet filling the revealed area.
- **Currency Format**: Ultra-heavy `display-hero` numerals in `#241C33`. Example: `150.00 USDC` or `S/. 500`.
- **Note Field**: Regular weight typography set flush left directly below the amount with a 32px vertical gap. No speech bubble or card enclosing it.

### 4. Chips / Meta Identifiers
- **Styling**: Naked typography with `label-caps` formatting.
- **Decoration**: No background pills or outlines. Prefixed solely with a static dot or separated by double spaces.
- **Stellar Transaction Hash**: Single-line truncated text string in `#7A6F8F` (on lid) or `#241C33` with 60% opacity (on interior).

### 5. Input Fields (PIN or Secret Passphrase)
- **Styling**: Single 2px bottom rule in `#FF6B4A` (on lid) or `#241C33` (on interior). No bounding box.
- **Caret**: Pure vertical bar, matching the rule color.
- **Typography**: Large, spaced characters (`headline-lg`), centered or left-aligned.

### 6. Strict Negations
- **Forbidden Elements**: Icons, SVG illustrations, decorative confetti, gift ribbons, box outlines, rounded containers, card wrappers, and skeuomorphic gradients. The typography, monolithic color planes, and tactile seam handle 100% of the UI function.