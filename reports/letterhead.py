#!/usr/bin/env python3
"""
EOCNS Report Letterhead & Design System
Eastern Oak College of Nursing Sciences — Quality Assurance Department

Colours match the college brand and the existing QA analysers:
  Navy #1B3A6B · Gold #B8860B · Light blue #D6E4F0
"""
from __future__ import annotations
import io
from pathlib import Path
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether, Flowable,
)
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor as HC

# ── Brand ─────────────────────────────────────────────────
NAVY   = HC("#1B3A6B")
GOLD   = HC("#B8860B")
LBLUE  = HC("#D6E4F0")
LIGHT  = HC("#F0F4FA")
WHITE  = colors.white
GREEN  = HC("#1B7A3D")
RED    = HC("#B91C1C")
LGREEN = HC("#D1FAE5")
LRED   = HC("#FEE2E2")
AMBER  = HC("#FEF3C7")
MUTED  = HC("#64748B")
DARK   = HC("#0F172A")
BORDER = HC("#CBD5E1")

PAGE_W, PAGE_H = A4
MARGIN = 1.6 * cm
CONTENT_W = PAGE_W - 2 * MARGIN

SCHOOL = {
    "name": "Eastern Oak College of Nursing Sciences",
    "short": "EOCNS",
    "address": "12 Udensi Ugorji Street, Aguogboriga, Abakaliki, Ebonyi State, Nigeria",
    "phones": "0810 082 8004 · 0903 082 9076",
    "email": "info@easternoak.org",
    "web": "www.easternoak.org",
    "motto": "Knowledge, Integrity & Compassion",
    "dept": "QUALITY ASSURANCE DEPARTMENT",
}

LOGO_CANDIDATES = [
    Path(__file__).resolve().parent.parent / "assets" / "eocns-logo.png",
    Path(__file__).resolve().parent / "eocns-logo.png",
]

def find_logo():
    for p in LOGO_CANDIDATES:
        if p.is_file():
            return str(p)
    return None


def style(**kw):
    base = dict(fontName="Helvetica", fontSize=9.5, leading=13, textColor=DARK)
    base.update(kw)
    return ParagraphStyle("_s", **base)


def spacer(h=6):
    return Spacer(1, h)


def gold_rule(thickness=1.2):
    return HRFlowable(width="100%", thickness=thickness, color=GOLD, spaceBefore=2, spaceAfter=2)


def navy_rule(thickness=2.0):
    return HRFlowable(width="100%", thickness=thickness, color=NAVY, spaceBefore=2, spaceAfter=4)


def section_bar(text: str):
    """Navy left accent + light-blue band section title."""
    tbl = Table(
        [[Paragraph(f"<b>{text.upper()}</b>", style(fontName="Helvetica-Bold", fontSize=9, textColor=NAVY))]],
        colWidths=[CONTENT_W],
    )
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LBLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBEFORE", (0, 0), (0, -1), 4, NAVY),
    ]))
    return tbl


def kpi_row(cells):
    """
    cells: list of (label, value, value_color)
    """
    n = max(len(cells), 1)
    col_w = CONTENT_W / n
    header = []
    values = []
    for label, value, color in cells:
        header.append(Paragraph(f"<b>{label}</b>", style(fontName="Helvetica-Bold", fontSize=8, alignment=TA_CENTER, textColor=NAVY)))
        values.append(Paragraph(f"<b>{value}</b>", style(fontName="Helvetica-Bold", fontSize=16, alignment=TA_CENTER, textColor=color)))
    data = [header, values]
    tbl = Table(data, colWidths=[col_w] * n)
    style_cmds = [
        ("BOX", (0, 0), (-1, -1), 1, NAVY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    for i, (_, _, color) in enumerate(cells):
        if color == GREEN:
            style_cmds.append(("BACKGROUND", (i, 1), (i, 1), LGREEN))
        elif color == RED:
            style_cmds.append(("BACKGROUND", (i, 1), (i, 1), LRED))
        elif color == GOLD:
            style_cmds.append(("BACKGROUND", (i, 1), (i, 1), AMBER))
    tbl.setStyle(TableStyle(style_cmds))
    return tbl


def meta_grid(pairs, cols=2):
    """pairs: list of (label, value)"""
    rows = []
    row = []
    label_w = 3.4 * cm
    val_w = (CONTENT_W / cols) - label_w
    for i, (lab, val) in enumerate(pairs):
        row.extend([
            Paragraph(f"<b>{lab}</b>", style(fontName="Helvetica-Bold", fontSize=9, textColor=NAVY)),
            Paragraph(str(val or "—"), style(fontSize=9)),
        ])
        if len(row) == cols * 2:
            rows.append(row)
            row = []
    if row:
        while len(row) < cols * 2:
            row.extend(["", ""])
        rows.append(row)
    if not rows:
        return spacer(1)
    col_widths = []
    for _ in range(cols):
        col_widths.extend([label_w, val_w])
    tbl = Table(rows, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def data_table(headers, rows, col_widths=None, emphasize_first=False):
    head = [Paragraph(f"<b>{h}</b>", style(fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_CENTER)) for h in headers]
    body = [head]
    for r in rows:
        cells = []
        for j, c in enumerate(r):
            align = TA_CENTER if j == 0 or (isinstance(c, (int, float))) else TA_LEFT
            cells.append(Paragraph(str(c), style(fontSize=8, alignment=align)))
        body.append(cells)
    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)
    tbl = Table(body, colWidths=col_widths, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 1, NAVY),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(body)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), LIGHT))
    if emphasize_first and len(body) > 1:
        cmds.append(("BACKGROUND", (0, 0), (0, -1), NAVY))  # already header
    tbl.setStyle(TableStyle(cmds))
    return tbl


def absent_table(rows):
    """rows: list of (serial, name) — red header band like sample, refined."""
    head = [
        Paragraph("<b>S/N</b>", style(fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
        Paragraph("<b>Full Name</b>", style(fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
    ]
    body = [head]
    for sn, name in rows:
        body.append([
            Paragraph(str(sn), style(fontSize=8, alignment=TA_CENTER, textColor=RED, fontName="Helvetica-Bold")),
            Paragraph(str(name), style(fontSize=8.5)),
        ])
    tbl = Table(body, colWidths=[2.2 * cm, CONTENT_W - 2.2 * cm], repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), RED),
        ("BOX", (0, 0), (-1, -1), 1, RED),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, HC("#FECACA")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(body)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), HC("#FEF2F2")))
    tbl.setStyle(TableStyle(cmds))
    return tbl


class FooterCanvas(canvas.Canvas):
    """Page number + confidential footer on every page."""
    def __init__(self, *args, officer_name="", report_title="", **kwargs):
        self.officer_name = officer_name or "—"
        self.report_title = report_title or "QA Report"
        super().__init__(*args, **kwargs)

    def showPage(self):
        self._draw_footer()
        super().showPage()

    def save(self):
        self._draw_footer()
        super().save()

    def _draw_footer(self):
        self.saveState()
        self.setStrokeColor(GOLD)
        self.setLineWidth(0.8)
        y = 1.15 * cm
        self.line(MARGIN, y + 0.55 * cm, PAGE_W - MARGIN, y + 0.55 * cm)
        self.setFont("Helvetica", 7)
        self.setFillColor(MUTED)
        self.drawString(MARGIN, y, f"{SCHOOL['short']} · {SCHOOL['dept']} · Confidential")
        self.drawRightString(PAGE_W - MARGIN, y, f"Page {self._pageNumber}")
        self.setFont("Helvetica", 6.5)
        # officer line sits above the main footer line
        self.drawCentredString(PAGE_W / 2, y + 0.28 * cm, f"Released by: {self.officer_name}")
        self.restoreState()


def build_letterhead(story, report_title: str, subtitle: str = "", period_line: str = ""):
    """Push institutional header into story."""
    logo_path = find_logo()
    logo_cell = ""
    if logo_path:
        try:
            logo_cell = Image(logo_path, width=2.1 * cm, height=2.1 * cm)
        except Exception:
            logo_cell = Paragraph(f"<b>{SCHOOL['short']}</b>", style(fontName="Helvetica-Bold", fontSize=14, textColor=NAVY, alignment=TA_CENTER))
    else:
        logo_cell = Paragraph(f"<b>{SCHOOL['short']}</b>", style(fontName="Helvetica-Bold", fontSize=14, textColor=NAVY, alignment=TA_CENTER))

    text_block = [
        Paragraph(f"<b>{SCHOOL['name'].upper()}</b>", style(fontName="Helvetica-Bold", fontSize=11, textColor=NAVY, alignment=TA_CENTER, leading=14)),
        Paragraph(SCHOOL["address"], style(fontSize=7.5, textColor=MUTED, alignment=TA_CENTER, leading=10)),
        Paragraph(f"{SCHOOL['phones']}  ·  {SCHOOL['email']}", style(fontSize=7.5, textColor=MUTED, alignment=TA_CENTER, leading=10)),
        Paragraph(f"<i>{SCHOOL['motto']}</i>", style(fontSize=7.5, textColor=GOLD, alignment=TA_CENTER, leading=10)),
    ]
    # nested table for text
    text_tbl = Table([[x] for x in text_block], colWidths=[CONTENT_W - 2.6 * cm])
    text_tbl.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))

    head = Table([[logo_cell, text_tbl]], colWidths=[2.4 * cm, CONTENT_W - 2.4 * cm])
    head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(head)
    story.append(spacer(4))
    story.append(navy_rule(2.2))
    story.append(Paragraph(f"<b>{SCHOOL['dept']}</b>", style(fontName="Helvetica-Bold", fontSize=10, textColor=GOLD, alignment=TA_CENTER)))
    story.append(spacer(6))
    story.append(Paragraph(f"<b>{report_title.upper()}</b>", style(fontName="Helvetica-Bold", fontSize=16, textColor=NAVY, alignment=TA_CENTER, leading=20)))
    if subtitle:
        story.append(Paragraph(subtitle, style(fontSize=10, textColor=GOLD, alignment=TA_CENTER)))
    if period_line:
        story.append(spacer(3))
        story.append(Paragraph(period_line, style(fontSize=9, textColor=MUTED, alignment=TA_CENTER)))
    story.append(spacer(4))
    story.append(gold_rule(1.0))
    story.append(spacer(8))


def signature_block(officer_name: str, role: str = "Quality Assurance Officer"):
    gen = datetime.now().strftime("%d %B %Y, %I:%M %p")
    left = [
        Paragraph("<b>Prepared &amp; Released by</b>", style(fontName="Helvetica-Bold", fontSize=8, textColor=MUTED)),
        spacer(18),
        Paragraph("_______________________________", style(fontSize=9, textColor=DARK)),
        Paragraph(f"<b>{officer_name or '—'}</b>", style(fontName="Helvetica-Bold", fontSize=10, textColor=NAVY)),
        Paragraph(role, style(fontSize=8, textColor=MUTED)),
        Paragraph(f"Generated: {gen}", style(fontSize=7.5, textColor=MUTED)),
    ]
    right = [
        Paragraph("<b>For official use</b>", style(fontName="Helvetica-Bold", fontSize=8, textColor=MUTED)),
        spacer(18),
        Paragraph("_______________________________", style(fontSize=9, textColor=DARK)),
        Paragraph("<b>Head, Quality Assurance</b>", style(fontName="Helvetica-Bold", fontSize=9, textColor=NAVY)),
        Paragraph("Date / Stamp", style(fontSize=8, textColor=MUTED)),
    ]
    left_t = Table([[x] for x in left], colWidths=[CONTENT_W * 0.48])
    right_t = Table([[x] for x in right], colWidths=[CONTENT_W * 0.48])
    left_t.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    right_t.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    outer = Table([[left_t, right_t]], colWidths=[CONTENT_W * 0.5, CONTENT_W * 0.5])
    outer.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return outer


def make_doc(buffer, officer_name: str, report_title: str):
    def canvas_factory(*args, **kwargs):
        return FooterCanvas(*args, officer_name=officer_name, report_title=report_title, **kwargs)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=1.4 * cm,
        bottomMargin=1.8 * cm,
        title=report_title,
        author=SCHOOL["dept"],
    )
    return doc, canvas_factory
