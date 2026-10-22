# The Village brand

Source: the owners' brand pack on Google Drive (shared 21 Oct 2026). The brand guide is `brand-guide.jpg`.

## Logos (`logos/`, full size; `web/`, trimmed web sizes)

| File | What it is | Use it for |
|---|---|---|
| `wordmark-full-colour.png` | "the village." in forrest, sage, coral and rose | Main logo on linen or white: website header, login screen, emails |
| `wordmark-forrest.png`, `-sage`, `-coral`, `-sky` | One-colour wordmarks | Forrest on light backgrounds; sky on forrest |
| `badge-*.png` | Scalloped round badge with the wordmark | Social avatars, app header on small screens, stickers |
| `icon-house-linen-badge.png` | Linen badge with the stacked-block house | Home-screen icon (C9), favicon, staff app |

The Drive folder also has SVG versions of the one-colour wordmarks and the icon. We need SVGs of the **full-colour wordmark** and the **badges** for crisp web use. See questions below.

## Colours

The six brand colours are lovely as backgrounds, but most are too light to read as text. So the brand colours are used for backgrounds, logos and accents, and three darker shades of the same hues carry the text and buttons.

| Token | Hex | Role |
|---|---|---|
| `linen` | `#FFF4E6` | Page background |
| `sky` | `#E8E3C5` | Cards and panels on linen (named "Sky Blue" in the guide, but it's a warm beige) |
| `sage` | `#C3BF94` | Group-class colour; soft fills |
| `forrest` | `#868259` | Brand accent, large headings (24px+), borders, icons |
| `rose` | `#FFBEA1` | Open-play colour; highlights |
| `coral` | `#E88D6D` | Brand accent, illustrations, workshop colour |
| `ink` *(added)* | `#3B3A2A` | Body text: 10.6:1 on linen |
| `muted` *(added)* | `#66624A` | Secondary text: 5.7:1 on linen |
| `forrest-deep` *(added)* | `#5E5B3B` | Main buttons (linen text 6.4:1), links |
| `coral-deep` *(added)* | `#A44A2C` | Warnings, "pay on the day", cancel actions: 5.4:1 on linen |

Rules:
- Text on sage, rose or coral fills is always `ink`.
- Never use `forrest` or `coral` for small text on linen or white. They fail the readability minimum (3.6:1 and 2.3:1 against 4.5:1).
- Session types on the calendar: group class = sage, open play = rose, private hire = sky, workshop = coral. Each also has a text label, so it doesn't rely on colour alone.

## Type

- **Lexend Deca** for headings. In the guide headings are lowercase and lightly letter-spaced ("welcome to the family club").
- **Work Sans** for body text, buttons and forms.
- Both are free on Google Fonts and include Vietnamese characters (check the subset at build).

## Notes and questions for the owners

1. **Colour values differ slightly** between the brand guide and the logo files. For example, coral is `#E88D6D` in the guide but `#F68665` in the logos, and forrest is `#868259` versus `#868153`. We use the guide's values for the app. **Answered 22 Oct: the brand guide's values are the master.**
2. **The body text in the brand guide is template filler** ("Rimberio Coffee is a modern Filipino coffee brand…"). Worth replacing before the guide goes to anyone else.
3. **SVG files:** please add SVGs of the full-colour wordmark and the badges. The Primary SVG folder only has the one-colour versions.
4. The Drive also holds social files (`Social Media Set Up`: Instagram highlight covers, launch posts). We haven't copied these into the repo, since the booking system doesn't use them.
