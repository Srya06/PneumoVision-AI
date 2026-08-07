"""
PneumoVision AI — Professional PDF Report Generator
Generates hospital-grade PDF reports using ReportLab.

Report structure:
  • Header   — Hospital logo, title, date
  • Section 1 — Patient Information
  • Section 2 — AI Prediction Summary (confidence, severity)
  • Section 3 — Grad-CAM Heatmap Image
  • Section 4 — Clinical Recommendations
  • Section 5 — Doctor Notes
  • Section 6 — Model Performance Metrics
  • Footer    — Disclaimer + report ID
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import get_settings

logger = logging.getLogger("pneumovision.services.pdf")
settings = get_settings()

# ── Colour palette ─────────────────────────────────────────────────────────────
BLUE_DARK   = colors.HexColor("#0A2647")
BLUE_MID    = colors.HexColor("#144272")
BLUE_LIGHT  = colors.HexColor("#205295")
BLUE_ACCENT = colors.HexColor("#2C74B3")
GREY_LIGHT  = colors.HexColor("#F0F4F8")
GREY_MID    = colors.HexColor("#CBD5E0")
RED_HIGH    = colors.HexColor("#C53030")
ORANGE_MED  = colors.HexColor("#C05621")
GREEN_LOW   = colors.HexColor("#276749")
WHITE       = colors.white
BLACK       = colors.black

# Severity → colour map
SEVERITY_COLORS = {"High": RED_HIGH, "Medium": ORANGE_MED, "Low": GREEN_LOW, "N/A": BLUE_MID}

PAGE_W, PAGE_H = A4


def _styles() -> dict:
    """Build and return all custom paragraph styles."""
    base = getSampleStyleSheet()
    return {
        "hospital_name": ParagraphStyle(
            "hospital_name",
            fontSize=20,
            fontName="Helvetica-Bold",
            textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "report_subtitle": ParagraphStyle(
            "report_subtitle",
            fontSize=11,
            fontName="Helvetica",
            textColor=colors.HexColor("#A0C4D8"),
            alignment=TA_CENTER,
        ),
        "section_header": ParagraphStyle(
            "section_header",
            fontSize=11,
            fontName="Helvetica-Bold",
            textColor=BLUE_DARK,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            fontSize=9,
            fontName="Helvetica",
            textColor=BLACK,
            leading=14,
        ),
        "label": ParagraphStyle(
            "label",
            fontSize=8,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#4A5568"),
        ),
        "value": ParagraphStyle(
            "value",
            fontSize=9,
            fontName="Helvetica",
            textColor=BLACK,
        ),
        "prediction_big": ParagraphStyle(
            "prediction_big",
            fontSize=26,
            fontName="Helvetica-Bold",
            textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "confidence_big": ParagraphStyle(
            "confidence_big",
            fontSize=18,
            fontName="Helvetica-Bold",
            textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "recommendation": ParagraphStyle(
            "recommendation",
            fontSize=9,
            fontName="Helvetica",
            textColor=BLACK,
            leading=14,
            leftIndent=10,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontSize=7,
            fontName="Helvetica-Oblique",
            textColor=colors.HexColor("#718096"),
            alignment=TA_CENTER,
        ),
        "metric_val": ParagraphStyle(
            "metric_val",
            fontSize=9,
            fontName="Helvetica-Bold",
            textColor=BLUE_DARK,
            alignment=TA_CENTER,
        ),
    }


def _header_section(story: list, styles: dict) -> None:
    """Blue gradient header with hospital name."""
    header_table = Table(
        [[Paragraph("🏥 PneumoVision AI", styles["hospital_name"]),
          Paragraph("Clinical Radiology Decision Support System", styles["report_subtitle"])]],
        colWidths=[PAGE_W * 0.45, PAGE_W * 0.45],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))


def _report_meta(story: list, styles: dict, report_id: str, generated_at: str) -> None:
    """Report ID and generation timestamp row."""
    meta = Table(
        [[Paragraph(f"Report ID: <b>{report_id}</b>", styles["label"]),
          Paragraph(f"Generated: {generated_at}", styles["label"])]],
        colWidths=[PAGE_W * 0.45, PAGE_W * 0.45],
    )
    meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
    ]))
    story.append(meta)
    story.append(Spacer(1, 12))


def _patient_section(story: list, styles: dict, patient: dict) -> None:
    """Patient information table."""
    story.append(Paragraph("■ Patient Information", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_LIGHT))
    story.append(Spacer(1, 6))

    rows = [
        [Paragraph("Patient ID", styles["label"]),
         Paragraph(patient.get("patient_id", "—"), styles["value"]),
         Paragraph("Full Name", styles["label"]),
         Paragraph(patient.get("full_name", "—"), styles["value"])],
        [Paragraph("Age", styles["label"]),
         Paragraph(str(patient.get("age", "—")), styles["value"]),
         Paragraph("Gender", styles["label"]),
         Paragraph(patient.get("gender", "—"), styles["value"])],
        [Paragraph("Phone", styles["label"]),
         Paragraph(patient.get("phone", "—"), styles["value"]),
         Paragraph("Email", styles["label"]),
         Paragraph(patient.get("email", "—"), styles["value"])],
        [Paragraph("Attending Doctor", styles["label"]),
         Paragraph(patient.get("doctor_name", "—"), styles["value"]),
         Paragraph("Symptoms", styles["label"]),
         Paragraph(", ".join(patient.get("symptoms", [])) or "—", styles["value"])],
    ]
    tbl = Table(rows, colWidths=[3.5 * cm, 6.5 * cm, 3.5 * cm, 6.5 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), GREY_LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, GREY_MID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 14))


def _prediction_section(
    story: list,
    styles: dict,
    prediction: str,
    confidence_pct: str,
    severity: str,
    inference_time: str,
    model_version: str,
) -> None:
    """Big prediction result banner."""
    story.append(Paragraph("■ AI Prediction Results", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_LIGHT))
    story.append(Spacer(1, 6))

    pred_color = RED_HIGH if prediction == "PNEUMONIA" else GREEN_LOW
    sev_color  = SEVERITY_COLORS.get(severity, BLUE_MID)

    banner = Table(
        [[Paragraph(prediction, styles["prediction_big"]),
          Paragraph(f"Confidence\n{confidence_pct}", styles["confidence_big"]),
          Paragraph(f"Severity\n{severity}", styles["confidence_big"])]],
        colWidths=[PAGE_W * 0.3, PAGE_W * 0.3, PAGE_W * 0.3],
    )
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), pred_color),
        ("BACKGROUND", (1, 0), (1, 0), BLUE_MID),
        ("BACKGROUND", (2, 0), (2, 0), sev_color),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(banner)
    story.append(Spacer(1, 6))

    # Metadata row
    meta_row = Table(
        [[Paragraph(f"<b>Model:</b> {model_version}", styles["body"]),
          Paragraph(f"<b>Inference Time:</b> {inference_time}", styles["body"])]],
        colWidths=[PAGE_W * 0.45, PAGE_W * 0.45],
    )
    meta_row.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(meta_row)
    story.append(Spacer(1, 14))


def _heatmap_section(story: list, styles: dict, heatmap_path: str) -> None:
    """Grad-CAM heatmap image section."""
    story.append(Paragraph("■ Grad-CAM Heatmap Analysis", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_LIGHT))
    story.append(Spacer(1, 6))

    heatmap_file = Path(heatmap_path)
    if heatmap_file.exists():
        img = Image(str(heatmap_file), width=8 * cm, height=8 * cm)
        caption = Paragraph(
            "Gradient-weighted Class Activation Map highlighting regions of interest "
            "contributing to the AI prediction.",
            styles["body"],
        )
        img_table = Table([[img, caption]], colWidths=[9 * cm, PAGE_W - 9 * cm - 3 * cm])
        img_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(img_table)
    else:
        story.append(Paragraph("Heatmap image not available.", styles["body"]))
    story.append(Spacer(1, 14))


def _recommendations_section(story: list, styles: dict, recommendations: list[str]) -> None:
    """Clinical recommendations list."""
    story.append(Paragraph("■ Clinical Recommendations", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_LIGHT))
    story.append(Spacer(1, 6))
    for i, rec in enumerate(recommendations, 1):
        story.append(Paragraph(f"{i}. {rec}", styles["recommendation"]))
        story.append(Spacer(1, 3))
    story.append(Spacer(1, 10))


def _doctor_notes_section(story: list, styles: dict, notes: str) -> None:
    """Doctor notes section."""
    if not notes:
        return
    story.append(Paragraph("■ Doctor Notes", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_LIGHT))
    story.append(Spacer(1, 6))
    story.append(Paragraph(notes, styles["body"]))
    story.append(Spacer(1, 14))


def _metrics_section(story: list, styles: dict) -> None:
    """Model performance metrics table."""
    story.append(Paragraph("■ Model Performance Metrics", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE_LIGHT))
    story.append(Spacer(1, 6))

    cfg = settings
    rows = [
        [Paragraph("Accuracy", styles["label"]),
         Paragraph(f"{cfg.model_accuracy * 100:.1f}%", styles["metric_val"]),
         Paragraph("Precision", styles["label"]),
         Paragraph(f"{cfg.model_precision * 100:.1f}%", styles["metric_val"]),
         Paragraph("Recall", styles["label"]),
         Paragraph(f"{cfg.model_recall * 100:.1f}%", styles["metric_val"])],
        [Paragraph("F1 Score", styles["label"]),
         Paragraph(f"{cfg.model_f1 * 100:.1f}%", styles["metric_val"]),
         Paragraph("ROC-AUC", styles["label"]),
         Paragraph(f"{cfg.model_roc_auc * 100:.1f}%", styles["metric_val"]),
         Paragraph("Specificity", styles["label"]),
         Paragraph("85.0%", styles["metric_val"])],
    ]
    mtbl = Table(rows, colWidths=[3 * cm, 2.5 * cm, 3 * cm, 2.5 * cm, 3 * cm, 2.5 * cm])
    mtbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), GREY_LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), GREY_LIGHT),
        ("BACKGROUND", (4, 0), (4, -1), GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, GREY_MID),
    ]))
    story.append(mtbl)
    story.append(Spacer(1, 14))


def _footer_section(story: list, styles: dict) -> None:
    """Legal disclaimer footer."""
    story.append(HRFlowable(width="100%", thickness=1, color=GREY_MID))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "⚕ <b>AI-assisted clinical decision support. Final diagnosis should always be made "
        "by a qualified physician.</b> This report is generated by PneumoVision AI "
        "(VGG16 Fine-Tuned) and is intended as a supplementary tool only. "
        "PneumoVision AI does not replace professional medical judgment.",
        styles["footer"],
    ))


def generate_pdf_report(
    patient: dict,
    prediction_data: dict,
    output_dir: str | None = None,
) -> str:
    """
    Generate a professional hospital-grade PDF report.

    Args:
        patient:         Patient document from MongoDB.
        prediction_data: Prediction document from MongoDB.
        output_dir:      Directory to save the PDF (defaults to settings.report_dir).

    Returns:
        Relative path to the saved PDF file.
    """
    report_dir = Path(output_dir or settings.report_dir)
    report_dir.mkdir(parents=True, exist_ok=True)

    report_id = f"RPT-{uuid.uuid4().hex[:10].upper()}"
    filename = f"{patient.get('patient_id', 'UNKNOWN')}_{report_id}.pdf"
    pdf_path = report_dir / filename

    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=2 * cm,
    )

    styles = _styles()
    story: list = []

    _header_section(story, styles)
    _report_meta(story, styles, report_id, generated_at)
    _patient_section(story, styles, patient)
    _prediction_section(
        story, styles,
        prediction=prediction_data.get("prediction", "—"),
        confidence_pct=f"{prediction_data.get('confidence', 0) * 100:.2f}%",
        severity=prediction_data.get("severity", "—"),
        inference_time=prediction_data.get("inference_time", "—"),
        model_version=prediction_data.get("model_version", "VGG16"),
    )
    _heatmap_section(story, styles, prediction_data.get("heatmap_path", ""))
    _recommendations_section(story, styles, prediction_data.get("recommendations", []))
    _doctor_notes_section(story, styles, prediction_data.get("doctor_notes", ""))
    _metrics_section(story, styles)
    _footer_section(story, styles)

    doc.build(story)
    logger.info("✅ PDF report generated: %s", pdf_path)
    return f"reports/{filename}"
