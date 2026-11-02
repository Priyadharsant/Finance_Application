from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)

OUTPUT = r"C:\Projects\Projects\Finance_Application\output\pdf\Finance_Dashboard_Card_Reference.pdf"
FONT = r"C:\Windows\Fonts\DejaVuSans.ttf"
FONT_BOLD = r"C:\Windows\Fonts\DejaVuSans-Bold.ttf"

pdfmetrics.registerFont(TTFont("DejaVu", FONT))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_BOLD))

NAVY = colors.HexColor("#172554")
BLUE = colors.HexColor("#1D4ED8")
TEAL = colors.HexColor("#0F766E")
PALE = colors.HexColor("#EFF6FF")
PALE_TEAL = colors.HexColor("#F0FDFA")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#526176")
GRID = colors.HexColor("#D7E0EC")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="TitleCustom", fontName="DejaVu-Bold", fontSize=20, leading=25,
    textColor=NAVY, spaceAfter=5, alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    name="SubtitleCustom", fontName="DejaVu", fontSize=9, leading=13,
    textColor=MUTED, spaceAfter=9
))
styles.add(ParagraphStyle(
    name="SectionCustom", fontName="DejaVu-Bold", fontSize=12, leading=16,
    textColor=BLUE, spaceBefore=8, spaceAfter=6
))
styles.add(ParagraphStyle(
    name="BodyCustom", fontName="DejaVu", fontSize=8.5, leading=12,
    textColor=INK, spaceAfter=4
))
styles.add(ParagraphStyle(
    name="CellCustom", fontName="DejaVu", fontSize=7.45, leading=9.35,
    textColor=INK
))
styles.add(ParagraphStyle(
    name="CellBoldCustom", fontName="DejaVu-Bold", fontSize=7.5, leading=9.5,
    textColor=NAVY
))
styles.add(ParagraphStyle(
    name="TableHeadCustom", fontName="DejaVu-Bold", fontSize=7.5, leading=9,
    textColor=colors.white
))
styles.add(ParagraphStyle(
    name="CalloutCustom", fontName="DejaVu", fontSize=8.4, leading=12,
    textColor=INK
))

def P(text, style="CellCustom"):
    return Paragraph(text, styles[style])

def reference_table(headers, rows, widths, tint=PALE):
    data = [[P(h, "TableHeadCustom") for h in headers]]
    for row in rows:
        data.append([P(cell, "CellBoldCustom" if i == 0 else "CellCustom") for i, cell in enumerate(row)])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, tint]),
        ("GRID", (0, 0), (-1, -1), 0.45, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table

def callout(text, background=PALE_TEAL):
    table = Table([[P(text, "CalloutCustom")]], colWidths=[517])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table

def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(GRID)
    canvas.setLineWidth(0.5)
    canvas.line(39, height - 27, width - 39, height - 27)
    canvas.setFont("DejaVu", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(39, 17, "Finance Application | Dashboard reference")
    canvas.drawRightString(width - 39, 17, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=39, rightMargin=39, topMargin=38, bottomMargin=31,
    title="Finance Dashboard Card Reference",
    author="Finance Application",
)
story = []
usable_widths = [115, 207, 195]

# Page 1: Search guide plus monthly stats definitions.
story.extend([
    Paragraph("Dashboard &amp; Search Reference", styles["TitleCustom"]),
    Paragraph(
        "Definitions, formulas, periods, source records, and search fields for the finance dashboards. "
        "Dashboard cards show the current data loaded by the application; they do not change loan or payment records.",
        styles["SubtitleCustom"]
    ),
    Paragraph("Search fields by screen", styles["SectionCustom"]),
    reference_table(
        ["Screen", "Searchable fields"],
        [
            ("Auto Finance", "Borrower name, phone, customer code, loan ID/code, vehicle make/model, registration, chassis/engine numbers, dates, status, and other loan fields."),
            ("Daily Finance", "Customer name, phone, address, notes, finance/account ID, dates, amounts, interest details, repayment status, and payment fields."),
            ("Partners &amp; capital", "Partner name, phone, email, PAN, transaction date/type, amount, direction, reference, notes, and record IDs."),
            ("Expenses", "Description/reason, category, type, date, amount, linked borrower or vehicle, phone, and related record IDs."),
            ("Reports &amp; ledger", "Relevant fields available for the current report rows, including borrower/partner, phone, dates, IDs, vehicle, category, status, and amounts."),
            ("Table editor &amp; selectors", "All searchable scalar fields on each record; selectors also search all fields on each option."),
        ],
        [115, 402], tint=PALE
    ),
    Spacer(1, 5),
    callout(
        "Search matches partial text without case sensitivity. Phone searches also ignore spaces and punctuation, "
        "so the last digits can be entered. The search applies to the records loaded for the current screen and filters.",
        PALE
    ),
    Paragraph("Global Capital — Monthly Stats cards", styles["SectionCustom"]),
    reference_table(
        ["Card", "Meaning / formula", "Period / source"],
        [
            ("In-Hand Cash (Current)", "Closing cash: opening cash + total inflows − total outflows.", "Latest month shown; roll-forward across partner capital and Auto/Daily movements."),
            ("Auto — Amount Given Outside", "Prior outside balance + Auto disbursements − Auto collections.", "Cumulative through the latest month; Auto loan and payment records."),
            ("Daily — Amount Given Outside", "Prior outside balance + Daily disbursements − Daily collections.", "Cumulative through the latest month; Daily account and payment records."),
            ("Next Month Opening Balance", "The latest month closing cash carried to the next month opening.", "Month immediately after the latest month; monthly cash roll-forward."),
        ],
        usable_widths, tint=PALE_TEAL
    ),
    Spacer(1, 4),
    Paragraph(
        "The monthly list and summary use the latest month returned by the API. Month rows are ordered newest first.",
        styles["BodyCustom"]
    ),
    Paragraph("Global Capital — Ledger Overview cards", styles["SectionCustom"]),
    reference_table(
        ["Card", "Meaning / formula", "Period / source"],
        [
            ("Available Company Balance", "(Total ledger credits − total ledger debits) − recorded expenses.", "Lifetime summary; global_cash_ledger and expenses."),
            ("Interest &amp; Deduction Income", "Auto interest paid + Daily Finance upfront deductions.", "Lifetime summary; Auto payment interest and Daily account deductions."),
            ("Total Expenses", "Sum of recorded expenses across categories.", "Lifetime summary; expenses table."),
            ("Net Profit", "Auto interest paid + Daily deductions − recorded expenses.", "Lifetime summary; payment interest, Daily accounts, and expenses."),
            ("Total Ledger Credits", "Sum of all entries where direction is CREDIT; includes partner contributions and collections.", "Lifetime summary; global_cash_ledger."),
            ("Total Ledger Debits", "Sum of all entries where direction is DEBIT; may include loans, withdrawals, expenses, and profit payments.", "Lifetime summary; global_cash_ledger."),
        ],
        usable_widths, tint=PALE
    ),
    Spacer(1, 4),
    Paragraph(
        "When filters are changed, the Global Capital summary cards recalculate from matching ledger rows. The API currently loads the latest 100 ledger rows for this view, so filtered totals and searches are limited to those rows.",
        styles["BodyCustom"]
    ),
    PageBreak(),
])

# Page 2: Daily Finance definitions.
story.extend([
    Paragraph("Daily Finance Dashboard", styles["TitleCustom"]),
    Paragraph(
        "Hover over a card, or focus it with the keyboard, for three seconds to see its definition, formula, period, and source.",
        styles["SubtitleCustom"]
    ),
    Paragraph("Loan portfolio &amp; returns", styles["SectionCustom"]),
    reference_table(
        ["Card", "Meaning / formula", "Period / source"],
        [
            ("Total customers", "Count of loaded account records; falls back to the API account count.", "Current dashboard snapshot; customer and account tables."),
            ("Capital Invested (Principal)", "max(0, net amount disbursed − all collections).", "Lifetime, non-cancelled accounts; dashboard position."),
            ("Total Finance Given (Gross)", "Sum of gross finance amounts.", "Lifetime, non-cancelled accounts; Daily Finance accounts."),
            ("Interest", "Sum of upfront initial deductions.", "Lifetime, non-cancelled accounts; initial_deduction."),
            ("Amount Given", "Sum of gross finance amount − initial deduction.", "Lifetime, non-cancelled accounts; account gross amount and deduction."),
            ("Total Return", "Sum of agreed total payable.", "Lifetime, non-cancelled accounts; agreed_total_payable."),
            ("Profit", "Same total as the Interest card: sum of initial deductions.", "Lifetime, non-cancelled accounts; this card duplicates Interest."),
        ],
        usable_widths, tint=PALE
    ),
    Paragraph("Collections &amp; cash outlook", styles["SectionCustom"]),
    reference_table(
        ["Card", "Meaning / formula", "Period / source"],
        [
            ("Loan Balance Reductions", "Sum of payments excluding VOID records.", "All dates; Daily Finance payment records."),
            ("Remaining", "Agreed total payable − all non-void payments.", "Lifetime, non-cancelled accounts; accounts and payments."),
            ("Cash Received (Non-transfer)", "Payments whose method is not TRANSFER, excluding VOID records.", "All dates; amount and payment method on Daily Finance payments."),
            ("Next Month Projected Amount", "Cash received + round(remaining receivable × 50%).", "Next-month estimate from current totals; fixed-ratio estimate, not an EMI schedule."),
        ],
        usable_widths, tint=PALE_TEAL
    ),
    Spacer(1, 5),
    callout(
        "Interest and Profit currently display the same upfront deduction total. The projection uses a fixed 50% of remaining receivable; "
        "it is an estimate, not a promise of collections.", PALE
    ),
    PageBreak(),
])

# Page 3: Auto Finance definitions and requested loan-level interest card.
story.extend([
    Paragraph("Auto Finance Dashboard &amp; Loan Interest", styles["TitleCustom"]),
    Paragraph(
        "The dashboard cards describe the loans currently in view. Each individual loan also shows its scheduled interest amount in the loan details and reports.",
        styles["SubtitleCustom"]
    ),
    Paragraph("Auto Finance dashboard", styles["SectionCustom"]),
    reference_table(
        ["Card", "Meaning / formula", "Period / source"],
        [
            ("Principal Disbursed", "Sum of loan_amount for loans shown.", "Loans with pending installments after the current filters; Auto loan records."),
            ("Expected Return", "Sum of agreed total payable; otherwise principal + scheduled interest.", "Loans in the current dashboard view; loan records and non-cancelled EMI schedule."),
            ("EMI Collected", "Sum of total_paid. The small recovery rate is collections ÷ principal disbursed.", "Lifetime to date for loans in view; Auto payment records."),
            ("Principal Yet to Recover", "max(0, principal disbursed − total collected). Interest is excluded.", "Lifetime to date for loans in view; loan amount and payments."),
            ("Collections Carried", "Repeats the same lifetime collection sum as EMI Collected.", "Loans in view; Auto payment records. This is not total business cash."),
            ("Next Month Projected Amount", "Collected + one installment per active loan; uses 10% of principal if installment is missing.", "Next-month estimate from the current loan fields; not a confirmed collection."),
        ],
        usable_widths, tint=PALE
    ),
    Paragraph("New per-loan Interest amount", styles["SectionCustom"]),
    callout(
        "The Vehicle Loan Agreement &amp; Borrower Details now includes an Interest amount card beside the rate and tenure. "
        "It sums the interest component of every scheduled installment, excluding cancelled installments. "
        "The Auto Finance loan list, reports, and exports also include this per-loan amount.",
        PALE_TEAL
    ),
    Spacer(1, 7),
    reference_table(
        ["Interest calculation", "Meaning / formula", "Example / display"],
        [
            ("Scheduled total", "Sum interest_component across non-cancelled EMI schedules for one loan.", "The amount is derived from that loan's actual schedule, including reducing-balance schedules."),
            ("12% FLAT example", "For ₹1,00,000 principal and 12 months at 12% annual flat interest: principal × rate × months ÷ 12.", "₹12,000 interest amount, alongside the 12% rate."),
            ("10% example", "For ₹1,00,000 at 10% for 12 months, using the same flat annual-rate example.", "₹10,000 interest amount."),
        ],
        usable_widths, tint=PALE
    ),
    Spacer(1, 5),
    Paragraph(
        "For reducing-balance loans, the displayed amount is the sum in the scheduled EMI rows rather than a flat-rate estimate. "
        "The total collected, remaining balance, and installment statuses continue to come from their existing payment and schedule calculations.",
        styles["BodyCustom"]
    ),
])

doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
