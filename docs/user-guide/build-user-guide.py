#!/usr/bin/env python3
"""
Builds the Talent Connect user guide PDF.

    pip install reportlab          # once (a venv is fine)
    python3 docs/user-guide/build-user-guide.py

Output: docs/Talent-Connect-User-Guide.pdf
The text lives in guide_content.py so the guide can be edited without touching the layout.
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

import guide_content as C

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'Talent-Connect-User-Guide.pdf'
FONTS = Path('/usr/share/fonts/truetype/dejavu')

# ── brand ────────────────────────────────────────────────────────────────────
INDIGO = colors.HexColor('#4F46E5')
INDIGO_DARK = colors.HexColor('#312E81')
INDIGO_LIGHT = colors.HexColor('#EEF2FF')
TEAL = colors.HexColor('#0D9488')
TEAL_LIGHT = colors.HexColor('#F0FDFA')
AMBER = colors.HexColor('#B45309')
AMBER_LIGHT = colors.HexColor('#FFFBEB')
SLATE = colors.HexColor('#0F172A')
MUTED = colors.HexColor('#475569')
LINE = colors.HexColor('#E2E8F0')
PANEL = colors.HexColor('#F8FAFC')
ROSE_LIGHT = colors.HexColor('#FEF2F2')
ROSE = colors.HexColor('#B91C1C')

CALLOUTS = {
    'info': (INDIGO, INDIGO_LIGHT, 'i'),
    'tip': (TEAL, TEAL_LIGHT, '+'),
    'warn': (AMBER, AMBER_LIGHT, '!'),
    'danger': (ROSE, ROSE_LIGHT, '!'),
}

# ── fonts ────────────────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont('Guide', str(FONTS / 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('Guide-Bold', str(FONTS / 'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Guide-Mono', str(FONTS / 'DejaVuSansMono.ttf')))
pdfmetrics.registerFont(TTFont('Guide-Mono-Bold', str(FONTS / 'DejaVuSansMono-Bold.ttf')))
pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='Guide-Bold', italic='Guide', boldItalic='Guide-Bold')
pdfmetrics.registerFontFamily('Guide-Mono', normal='Guide-Mono', bold='Guide-Mono-Bold', italic='Guide-Mono', boldItalic='Guide-Mono-Bold')

# ── styles ───────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()
BODY = ParagraphStyle('Body', parent=ss['BodyText'], fontName='Guide', fontSize=9.6, leading=14.6, textColor=SLATE, spaceAfter=6, alignment=TA_LEFT)
LEAD = ParagraphStyle('Lead', parent=BODY, fontSize=10.6, leading=16.4, textColor=MUTED, spaceAfter=9)
H1 = ParagraphStyle('H1', parent=ss['Heading1'], fontName='Guide-Bold', fontSize=19, leading=23, textColor=INDIGO_DARK, spaceBefore=2, spaceAfter=8)
H2 = ParagraphStyle('H2', parent=ss['Heading2'], fontName='Guide-Bold', fontSize=12.6, leading=16, textColor=INDIGO, spaceBefore=12, spaceAfter=5)
H3 = ParagraphStyle('H3', parent=ss['Heading3'], fontName='Guide-Bold', fontSize=10.6, leading=14, textColor=SLATE, spaceBefore=9, spaceAfter=4)
BULLET = ParagraphStyle('Bullet', parent=BODY, leftIndent=13, bulletIndent=3, spaceAfter=3.5)
STEP_TITLE = ParagraphStyle('StepTitle', parent=BODY, fontName='Guide-Bold', spaceAfter=1)
STEP_TEXT = ParagraphStyle('StepText', parent=BODY, spaceAfter=0, textColor=MUTED)
CELL = ParagraphStyle('Cell', parent=BODY, fontSize=8.9, leading=12.6, spaceAfter=0)
CELL_HEAD = ParagraphStyle('CellHead', parent=CELL, fontName='Guide-Bold', textColor=colors.white)
KV_KEY = ParagraphStyle('KvKey', parent=CELL, fontName='Guide-Bold')
CODE = ParagraphStyle('Code', parent=BODY, fontName='Guide-Mono', fontSize=8.6, leading=12.6, spaceAfter=0)
TOC1 = ParagraphStyle('TOC1', fontName='Guide-Bold', fontSize=10.4, leading=20, textColor=SLATE)
TOC2 = ParagraphStyle('TOC2', fontName='Guide', fontSize=9.4, leading=15, textColor=MUTED, leftIndent=14)
CANVAS_TITLE = 'Talent Connect — User Guide'


class Rule(Flowable):
    """Thin divider."""

    def __init__(self, width, color=LINE, thickness=0.7, space=5):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness
        self.space = space

    def wrap(self, aw, ah):
        self.width = aw
        return aw, self.thickness + self.space

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.space, self.width, self.space)


def bullets(items):
    return [Paragraph(t, BULLET, bulletText='•') for t in items]


def steps(items):
    rows = []
    for i, (title, detail) in enumerate(items, start=1):
        cell = [Paragraph(title, STEP_TITLE)]
        if detail:
            cell.append(Paragraph(detail, STEP_TEXT))
        rows.append([Paragraph(f'<font color="#4F46E5"><b>{i}</b></font>', ParagraphStyle('n', parent=BODY, alignment=TA_CENTER, spaceAfter=0)), cell])
    table = Table(rows, colWidths=[16, None], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (0, -1), 0),
        ('LEFTPADDING', (1, 0), (1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.6, LINE),
    ]))
    return [table, Spacer(1, 7)]


def data_table(head, rows, widths, width):
    col_widths = [width * w for w in widths]
    body = [[Paragraph(h, CELL_HEAD) for h in head]]
    body += [[Paragraph(c, CELL) for c in row] for row in rows]
    table = Table(body, colWidths=col_widths, repeatRows=1, hAlign='LEFT')
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), INDIGO),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, LINE),
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
    ]
    for i in range(1, len(body)):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0, i), (-1, i), PANEL))
    table.setStyle(TableStyle(style))
    return [table, Spacer(1, 8)]


def kv_table(pairs, width):
    rows = [[Paragraph(k, KV_KEY), Paragraph(v, CELL)] for k, v in pairs]
    table = Table(rows, colWidths=[width * 0.22, width * 0.78], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
        ('LEFTPADDING', (0, 0), (0, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE),
    ]))
    return [table, Spacer(1, 8)]


def callout(kind, title, text, width):
    accent, background, glyph = CALLOUTS.get(kind, CALLOUTS['info'])
    cell = [
        Paragraph(f'<font color="#{accent.hexval()[2:]}"><b>{glyph}&nbsp;&nbsp;{title}</b></font>', ParagraphStyle('ct', parent=BODY, spaceAfter=3)),
        Paragraph(text, ParagraphStyle('cb', parent=BODY, textColor=MUTED, spaceAfter=0)),
    ]
    table = Table([[cell]], colWidths=[width], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), background),
        ('LINEBEFORE', (0, 0), (0, -1), 2.6, accent),
        ('BOX', (0, 0), (-1, -1), 0.6, background),
        ('LEFTPADDING', (0, 0), (-1, -1), 11),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return [table, Spacer(1, 9)]


def code_block(text, width):
    cell = [Preformatted(text, CODE)]
    table = Table([[cell]], colWidths=[width], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PANEL),
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return [table, Spacer(1, 8)]


# ── document ─────────────────────────────────────────────────────────────────
class Guide(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, pagesize=A4, leftMargin=20 * mm, rightMargin=18 * mm, topMargin=20 * mm, bottomMargin=17 * mm, title=C.TITLE, author='Talent Connect', subject=f'{C.SUBTITLE} — {C.VERSION}', creator='Talent Connect', **kw)
        self.section = ''
        self.sections = {}
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='body')
        cover = Frame(0, 0, A4[0], A4[1], id='cover', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[cover], onPage=self.draw_cover),
            PageTemplate(id='body', frames=[frame], onPage=self.draw_frame),
        ])

    # section name for the header rule
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            text = flowable.getPlainText()
            if style == 'H1':
                self.section = text
                if text != 'Contents':
                    self.notify('TOCEntry', (0, text, self.page))
            elif style == 'H2':
                self.notify('TOCEntry', (1, text, self.page))
            self.sections[self.page] = self.section

    def draw_cover(self, canvas, doc):
        w, h = A4
        canvas.saveState()
        # top band
        canvas.setFillColor(INDIGO)
        canvas.rect(0, h - 300, w, 300, stroke=0, fill=1)
        canvas.setFillColor(colors.HexColor('#3730A3'))
        canvas.rect(0, h - 306, w, 6, stroke=0, fill=1)
        # band content
        canvas.setFillColor(colors.white)
        canvas.setFont('Guide-Bold', 11)
        canvas.drawString(24 * mm, h - 52, 'TALENT CONNECT')
        canvas.setFillColor(colors.HexColor('#C7D2FE'))
        canvas.setFont('Guide', 9.5)
        canvas.drawString(24 * mm, h - 70, 'The platform where Cameroonian talents and event promoters meet')
        canvas.setFillColor(colors.white)
        canvas.setFont('Guide-Bold', 33)
        canvas.drawString(24 * mm, h - 132, 'User Guide')
        canvas.setFont('Guide', 12.5)
        canvas.setFillColor(colors.HexColor('#E0E7FF'))
        canvas.drawString(24 * mm, h - 158, 'Cameroon edition — FCFA, MTN Mobile Money & Orange Money')
        canvas.drawString(24 * mm, h - 178, C.VERSION)
        canvas.setFont('Guide', 9.5)
        canvas.drawString(24 * mm, h - 205, C.DATE)
        # role chips
        chips = [('Talents', TEAL), ('Promoters', INDIGO), ('Administrators', AMBER)]
        x = 24 * mm
        y = h - 262
        for label, colour in chips:
            canvas.setFillColor(colour)
            canvas.roundRect(x, y, 92, 26, 6, stroke=0, fill=1)
            canvas.setFillColor(colors.white)
            canvas.setFont('Guide-Bold', 10)
            canvas.drawString(x + 12, y + 9, label)
            x += 102
        canvas.setFillColor(colors.HexColor('#E0E7FF'))
        canvas.setFont('Guide', 9)
        canvas.drawString(24 * mm, y - 18, 'Three roles, one platform: portfolio, events, contracts, licence fees and an AI assistant.')

        # what's inside
        y0 = h - 372
        canvas.setFillColor(SLATE)
        canvas.setFont('Guide-Bold', 13)
        canvas.drawString(24 * mm, y0, 'What is inside')
        entries = [
            ('1 · Getting started', 'Accounts, roles, the interface'),
            ('2 · Guide for talents', 'Profile, portfolio, events, contracts, ratings'),
            ('3 · The licence and the licence fee', 'Mobile Money step by step: *126# and #150#'),
            ('4 · Guide for promoters', 'Agency profile, events, hiring, ratings'),
            ('5 · Guide for administrators', 'Fee settings, confirmation queue, verification, reports'),
            ('6 · The AI assistant', 'What it does, who answers, privacy'),
            ('7 · Money in Cameroonian terms', 'FCFA, USSD codes, wallet numbers'),
            ('8 · Questions and troubleshooting', 'Every message the platform can show you'),
            ('9 · Quick reference', 'Demo accounts, checklists, where things are'),
        ]
        y = y0 - 28
        for title, sub in entries:
            canvas.setFillColor(INDIGO)
            canvas.circle(26 * mm, y + 3.6, 2.2, stroke=0, fill=1)
            canvas.setFillColor(SLATE)
            canvas.setFont('Guide-Bold', 10.8)
            canvas.drawString(33 * mm, y, title)
            canvas.setFillColor(MUTED)
            canvas.setFont('Guide', 9)
            canvas.drawString(33 * mm, y - 13, sub)
            y -= 36
        # footer note
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.8)
        canvas.line(24 * mm, 42, w - 24 * mm, 42)
        canvas.setFillColor(MUTED)
        canvas.setFont('Guide', 8.6)
        canvas.drawString(24 * mm, 28, f'{C.CONTACT["platform"]} · {C.CONTACT["support"]}')
        canvas.drawRightString(w - 24 * mm, 28, 'Talent Connect — User Guide')
        canvas.restoreState()

    def draw_frame(self, canvas, doc):
        w, h = A4
        canvas.saveState()
        # header
        canvas.setFillColor(INDIGO)
        canvas.rect(0, h - 14, w, 14, stroke=0, fill=1)
        canvas.setFillColor(MUTED)
        canvas.setFont('Guide', 8.4)
        canvas.drawString(20 * mm, h - 26, CANVAS_TITLE)
        page_section = self.section or self.sections.get(doc.page) or ''
        if page_section:
            canvas.drawRightString(w - 18 * mm, h - 26, page_section[:70])
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.7)
        canvas.line(20 * mm, h - 32, w - 18 * mm, h - 32)
        # footer
        canvas.setStrokeColor(LINE)
        canvas.line(20 * mm, 34, w - 18 * mm, 34)
        canvas.setFillColor(MUTED)
        canvas.setFont('Guide', 8.4)
        canvas.drawString(20 * mm, 23, 'Cameroon edition · FCFA · MTN MoMo *126# · Orange Money #150#')
        canvas.setFont('Guide-Bold', 9)
        canvas.setFillColor(INDIGO)
        canvas.drawRightString(w - 18 * mm, 23, str(doc.page))
        canvas.restoreState()


def build_story(width):
    story = [NextPageTemplate('body'), PageBreak()]
    # contents page
    story.append(Paragraph('Contents', H1))
    story.append(Paragraph('Read the sections that match your role — the licence-fee walkthrough in section 3 is the one every promoter needs.', LEAD))
    toc = TableOfContents()
    toc.levelStyles = [TOC1, TOC2]
    toc.dotsMinLevel = 1
    story += [toc, Spacer(1, 10)]
    story.append(Rule(width))
    story += callout('info', 'This edition', 'The licence fee is now managed by administrators and paid with Mobile Money — MTN MoMo (<b>*126#</b>) or '
                      'Orange Money (<b>#150#</b>) — in FCFA. The AI assistant runs on Groq when the server has a key, and falls back to a built-in '
                      'template writer when it does not.', width)
    story.append(PageBreak())

    for block in C.CONTENT:
        kind = block[0]
        if kind == 'pagebreak':
            # Start the next section on a fresh page, but only when the current one is
            # nearly full — that avoids leaving half-empty pages behind.
            story.append(CondPageBreak(120 * mm))
        elif kind == 'h1':
            if story and not isinstance(story[-1], PageBreak):
                story.append(Spacer(1, 4))
            story.append(Paragraph(block[1], H1))
            story.append(Rule(width, INDIGO, 1.6, 4))
        elif kind == 'h2':
            story.append(Paragraph(block[1], H2))
        elif kind == 'h3':
            story.append(Paragraph(block[1], H3))
        elif kind == 'p':
            story.append(Paragraph(block[1], BODY))
        elif kind == 'bullets':
            story += bullets(block[1])
            story.append(Spacer(1, 5))
        elif kind == 'steps':
            story += steps(block[1])
        elif kind == 'table':
            story += data_table(block[1], block[2], block[3], width)
        elif kind == 'kv':
            story += kv_table(block[1], width)
        elif kind == 'code':
            story += code_block(block[1], width)
        elif kind == 'callout':
            story += callout(block[1], block[2], block[3], width)
    return story


def main():
    doc = Guide(str(OUT))
    # two passes: the first collects heading page numbers for the contents
    doc.multiBuild(build_story(doc.width))
    print(f'Wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {doc.page} pages)')


if __name__ == '__main__':
    main()
