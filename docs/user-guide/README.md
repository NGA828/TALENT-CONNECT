# Talent Connect user guide (PDF)

`../Talent-Connect-User-Guide.pdf` is the printable user guide shipped with the platform: a Cameroon edition
covering the three roles, the Mobile Money licence fee (MTN MoMo `*126#` / Orange Money `#150#`), the
administrator fee console, the Groq-powered AI assistant, troubleshooting and a quick-reference section.

| File | What it is |
| --- | --- |
| `../Talent-Connect-User-Guide.pdf` | The guide itself (A4, cover, contents, 18 pages). Generated — commit the rebuilt file with your content change. |
| `guide_content.py` | All of the text, as plain blocks (headings, paragraphs, steps, tables, callouts). **Edit this for wording changes.** |
| `build-user-guide.py` | The layout: brand colours, fonts, cover, running header/footer, tables, callouts, contents. |

## Rebuild it

```bash
pip install reportlab          # once (a virtualenv is fine)
python3 docs/user-guide/build-user-guide.py
# → wrote docs/Talent-Connect-User-Guide.pdf (18 pages)
```

The script needs the DejaVu fonts that ship with most Linux distributions
(`/usr/share/fonts/truetype/dejavu`). To use another font family, change the
`FONTS` path and the four `registerFont` calls at the top of the builder.

## Editing rules

- Text lives only in `guide_content.py`. The builder never hard-codes a sentence except the cover chrome,
  so a wording change is a one-line edit plus a rebuild.
- Inline markup is ReportLab's mini-HTML: `<b>bold</b>`, `<i>italic</i>`, `<font color="#4F46E5">colour</font>`,
  `<font face="Guide-Mono">monospace</font>`.
- Section content is separated with `("pagebreak",)`; the builder only breaks when the current page is nearly
  full, so you never get half-empty pages after a small edit.
- The contents page is generated from the `h1` / `h2` headings, so a new section needs no index edit.

## Keeping it honest

The guide describes this installation. If you change the licence-fee defaults, the demo wallets, the AI
provider or the upload limits in code, update the matching block in `guide_content.py` in the same pull
request — the numbers in sections 3, 7 and 9 must stay true to what the platform actually does.
