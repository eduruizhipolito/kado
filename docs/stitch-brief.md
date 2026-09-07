# Prompts para Stitch — Kadó

Están en inglés porque Stitch responde mejor así, pero **todo el texto de
interfaz va en español** y está entre comillas para que lo copie literal. No
traduzcas esas cadenas.

Pega primero el prompt base. Después cada pantalla, una por una.

---

## Prompt base

```
Mobile app called Kadó. A person at an in-person tech meetup in Lima, Peru
scans a QR code or enters a code and receives two US dollars in digital money.
They have never used crypto. The whole app exists to support one single moment:
opening a gift.

Core design idea: THE SCREEN IS THE LID. There is no illustrated gift box in
the center. The closed state fills the entire screen in one saturated color,
with a thin horizontal seam line across it. When it opens, the two halves of
the lid part and a warm interior color floods the screen. The reveal is a
change of the whole color world, not a number appearing inside a card.

Color palette, use exactly these:
- #4B2FA3 saturated violet, the closed lid, full bleed edge to edge
- #FFF3E2 warm interior, appears only after opening
- #241C33 ink, used on the warm interior
- #FF6B4A coral, used ONLY for the single seam line
- #2E9E6B green, used ONLY for success confirmation

Typography: one single font family with a wide weight range. The money amount
uses the heaviest weight and is the only large element in the entire app.
Everything else is regular weight at modest size. No all-caps labels. No
typographic eyebrow labels above blocks.

Strict prohibitions: no illustrated gift boxes, no ribbons, no bows, no
confetti, no sparkles, no festive or holiday imagery. No decorative gradients.
No soft drop shadows under elements. No rounded identical cards. No crypto
iconography, no wallet icons, no coin icons. No logos. No navigation bar. No
tab bar. No onboarding carousel. Never ask for email, phone or registration.

Tone: calm and elegant, not festive. Spanish (Peru) copy, active voice, short
sentences.
```

---

## P1. Kadó cerrado

```
Mobile screen, portrait. Background is saturated violet #4B2FA3, full bleed,
edge to edge, no margins, no card, no container.

Across the screen at about one third from the top, a single thin horizontal
coral #FF6B4A line, suggesting a seam where something will open.

Centered below the seam, in regular weight at moderate size, white text:
"Un regalo de Stellar Perú"

Below that, smaller and dimmer:
"Ábrelo para ver qué hay dentro"

At the bottom, a wide full-width button with the label:
"Abrir"

No logo, no menu, no navigation bar, no illustration, no gift box, no icons.
```

---

## P2. Abriendo

```
Same as the closed screen: violet #4B2FA3 full bleed with the coral seam.

The coral seam has widened into a gap, and through the gap a narrow band of
warm cream #FFF3E2 is visible, as if light is coming through.

The button is gone. In its place, a single line of centered text in regular
weight:
"Preparando tu cuenta"

Include a thin linear progress indicator, not a circular spinner. No percentage
number.
```

---

## P3. Kadó abierto

```
Mobile screen, portrait. The violet lid has parted: a band of violet #4B2FA3
remains at the very top edge and another at the very bottom edge. Between them,
warm cream #FFF3E2 fills most of the screen.

Centered on the cream, a money amount in very large digits, heaviest available
weight, ink color #241C33:
"$2.00"

Directly below, regular weight, much smaller:
"Ya es tuyo"

At the very bottom, a small quiet text link:
"Ver comprobante"

The amount is the only large element. Everything else is quiet. No card around
the amount, no border, no shadow, no icons, no celebration graphics.
```

---

## P4. Tu saldo

```
Mobile screen, portrait. Warm cream #FFF3E2 fills the entire screen with no
violet bands: the lid is gone, this is now the person's own space.

Centered, the balance in ink #241C33, large but noticeably smaller than the
reveal screen:
"$2.00"

Below it, two plain text actions stacked, regular weight, no buttons with fills:
"Guardar mi acceso"
"Enviar a otro lado"

At the very bottom, one small line:
"Guarda este enlace para volver a entrar."

No charts, no transaction history, no cards, no icons, no navigation bar.
```

---

## P5. Estados especiales

Genera las tres como variantes de la pantalla cerrada.

```
Three variants of the closed violet screen #4B2FA3 full bleed, each with the
horizontal seam line but no button.

Variant 1, seam line in green #2E9E6B, centered text:
"Este Kadó ya fue abierto"

Variant 2, seam line in muted gray, centered text:
"Este Kadó venció"

Variant 3, no seam line at all, only centered text on the violet:
"Este código no existe"
and below it, smaller:
"Revisa el código impreso o pide uno nuevo en la mesa de entrada."

No apology text, no sad icons, no illustrations.
```

---

## P6. Panel del organizador

```
Desktop web screen, internal tool aesthetic. Light neutral background, ink
#241C33 text, violet #4B2FA3 used only in table headers. High information
density, minimal decoration.

Top row: four plain metrics with a number and a label underneath, no cards, no
borders, no icons. Labels in Spanish:
"Kadós generados"
"Kadós abiertos"
"Tasa de apertura"
"Tiempo mediano"

Below, a dense data table with these column headers in Spanish:
"Evento", "Fecha", "Generados", "Abiertos", "Tasa", "Tiempo mediano"

Fill with six plausible rows of Peruvian tech meetup names and dates.

Top right, one secondary button:
"Exportar"

No sidebar navigation, no charts, no dashboard widgets, no rounded cards.
```

---

## Si el resultado no convence

El parámetro que importa es **el contraste entre P1 y P3**. Si la apertura se
siente débil, no agregues elementos: haz el violeta más denso en P1 y deja P3
más vacío.

Si Stitch insiste en poner una cajita ilustrada, agrega al prompt de la pantalla:
`Absolutely no gift box illustration. The screen itself is the box.`
