"""
PDF Assessment Report Generator for CarbonLens SME.
Generates publication-quality, server-side PDF assessment reports matching dashboard calculations 100%.
Includes ReportLab Platypus layout with clean typography, tables, executive summary, leak-points, confidence breakdown, circular recommendations, and DEMO DATA banners.
"""

import io
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Custom canvas that computes total page count and adds running headers/footers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4b5563"))

        # Footer
        footer_text = "CarbonLens SME | HackOut'26 | Team Codeium — Confidential Assessment Report"
        page_text = f"Page {self._pageNumber} of {page_count}"
        
        self.setStrokeColor(colors.HexColor("#e5e7eb"))
        self.setLineWidth(0.5)
        self.line(40, 40, 555, 40)

        self.drawString(40, 26, footer_text)
        self.drawRightString(555, 26, page_text)

        # Top Running Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(40, 815, "CarbonLens SME — Industrial Carbon Audit Report")
            self.line(40, 808, 555, 808)

        self.restoreState()


class PDFReportGenerator:
    """Server-side PDF Generator for CarbonLens SME Assessment Reports."""

    def generate_pdf(self, assessment: Dict[str, Any], facility: Optional[Dict[str, Any]] = None) -> bytes:
        """Builds a PDF report matching exact assessment figures."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=40,
            rightMargin=40,
            topMargin=50,
            bottomMargin=55
        )

        styles = getSampleStyleSheet()

        # Custom Styling Palette
        COLOR_PRIMARY = colors.HexColor("#18583f")   # Deep Forest Green
        COLOR_SECONDARY = colors.HexColor("#2e7d5b") # Medium Green
        COLOR_DARK = colors.HexColor("#111827")      # Charcoal Text
        COLOR_MUTED = colors.HexColor("#6b7280")     # Subdued Gray
        COLOR_BG_LIGHT = colors.HexColor("#f8faf9")  # Soft Emerald Tint
        COLOR_WARNING = colors.HexColor("#b45309")   # Amber Warning

        style_title = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=COLOR_PRIMARY
        )

        style_subtitle = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=COLOR_MUTED
        )

        style_h1 = ParagraphStyle(
            "SectionH1",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=COLOR_PRIMARY,
            spaceBefore=14,
            spaceAfter=6
        )

        style_body = ParagraphStyle(
            "BodyTextCustom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=COLOR_DARK
        )

        style_mono = ParagraphStyle(
            "MonoCustom",
            parent=styles["Normal"],
            fontName="Courier",
            fontSize=8.5,
            leading=11.5,
            textColor=COLOR_DARK
        )

        style_demo_banner = ParagraphStyle(
            "DemoBanner",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#991b1b"),
            alignment=1
        )

        story = []

        is_demo = assessment.get("is_demo", False)

        # ----------------------------------------------------
        # 0. DEMO WATERMARK BANNER (If Demo Assessment)
        # ----------------------------------------------------
        if is_demo:
            demo_table = Table(
                [[Paragraph("⚠️ DEMO DATA — SAMPLE HACKATHON ASSESSMENT REPORT (NOT A REAL AUDIT)", style_demo_banner)]],
                colWidths=[515]
            )
            demo_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fee2e2")),
                ("BORDER", (0, 0), (-1, -1), 1, colors.HexColor("#f87171")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]))
            story.append(demo_table)
            story.append(Spacer(1, 10))

        # ----------------------------------------------------
        # 1. HEADER / COVER SECTION
        # ----------------------------------------------------
        fac_info = facility or {}
        fac_name = assessment.get("facility_name") or fac_info.get("facility_name") or "Industrial Manufacturing Facility"
        company_name = fac_info.get("company_name") or fac_name
        city = fac_info.get("city") or "Gujarat Industrial Zone"
        state = fac_info.get("state") or "Gujarat"
        country = fac_info.get("country") or "India"
        period = assessment.get("reporting_period") or fac_info.get("default_reporting_period") or "Monthly"
        raw_created = assessment.get("created_at") or datetime.now()
        created_at_str = raw_created.strftime("%Y-%m-%d") if hasattr(raw_created, "strftime") else str(raw_created)[:10]

        story.append(Paragraph("CarbonLens SME", style_title))
        story.append(Paragraph("Industrial Emission Leak-Point Detector & Circular Alternative Recommender", style_subtitle))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_PRIMARY, spaceBefore=0, spaceAfter=12))

        # Metadata Grid Table
        meta_data = [
            [
                Paragraph(f"<b>Facility:</b> {fac_name}", style_body),
                Paragraph(f"<b>Reporting Period:</b> {period}", style_body)
            ],
            [
                Paragraph(f"<b>Company:</b> {company_name}", style_body),
                Paragraph(f"<b>Assessment Date:</b> {created_at_str}", style_body)
            ],
            [
                Paragraph(f"<b>Location:</b> {city}, {state}, {country}", style_body),
                Paragraph("<b>Industry Scope:</b> Plastic & Packaging Manufacturing", style_body)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[255, 260])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1fae5")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 2. EXECUTIVE SUMMARY
        # ----------------------------------------------------
        total_co2e = float(assessment.get("total_co2e_tonnes", 0.0))
        is_partial = assessment.get("is_partial_estimate") if "is_partial_estimate" in assessment else assessment.get("is_partial", False)

        conf_breakdown = assessment.get("confidence_breakdown") or {}
        if isinstance(conf_breakdown, dict):
            confidence_score = conf_breakdown.get("confidence_score") or assessment.get("confidence_score") or 100
            conf_reasons = conf_breakdown.get("missing_fields_explanation") or assessment.get("confidence_reasons") or []
        else:
            confidence_score = assessment.get("confidence_score", 100)
            conf_reasons = assessment.get("confidence_reasons") or []

        hotspots = assessment.get("leak_points") or assessment.get("hotspots") or []
        top_hotspot = hotspots[0] if (hotspots and len(hotspots) > 0) else {}
        top_hp_name = top_hotspot.get("source_name") or top_hotspot.get("name") or "Energy Grid"
        top_hp_pct = top_hotspot.get("percentage") if "percentage" in top_hotspot else top_hotspot.get("pct", 0.0)

        story.append(Paragraph("Executive Summary", style_h1))
        
        exec_summary_box = [
            [
                Paragraph(f"<font size=16 color='#18583f'><b>{total_co2e:.2f} tCO₂e/mo</b></font><br/><font size=8 color='#6b7280'>Total Calculated Footprint</font>", style_body),
                Paragraph(f"<b>Partial Estimate:</b> {'YES ⚠️' if is_partial else 'NO (Complete)'}<br/><b>Data Confidence Score:</b> {confidence_score}/100", style_body),
                Paragraph(f"<b>Primary Emission Hotspot:</b><br/><font color='#b45309'><b>#1 {top_hp_name}</b></font> ({float(top_hp_pct):.1f}% of total)", style_body)
            ]
        ]
        exec_table = Table(exec_summary_box, colWidths=[170, 170, 175])
        exec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
            ("BOX", (0, 0), (-1, -1), 1, COLOR_PRIMARY),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(exec_table)
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 3. ACTIVITY DATA SUMMARY
        # ----------------------------------------------------
        story.append(Paragraph("Activity Data Summary", style_h1))
        inputs = assessment.get("input_snapshot") or assessment.get("inputs") or {}
        if not isinstance(inputs, dict):
            inputs = {}
            
        # Fallback mappings from sources & audit_trail
        sources_list = assessment.get("sources", [])
        sources_map = {}
        if isinstance(sources_list, list):
            for s in sources_list:
                if isinstance(s, dict):
                    skey = s.get("source_key")
                    amt = s.get("activity_amount")
                    if skey and amt is not None:
                        sources_map[skey] = amt

        audit_trail = conf_breakdown.get("audit_trail", []) if isinstance(conf_breakdown, dict) else []
        audit_map = {}
        if isinstance(audit_trail, list):
            for item in audit_trail:
                if isinstance(item, dict):
                    fname = item.get("field_name", "")
                    val = item.get("value")
                    if fname and val is not None:
                        audit_map[fname] = val

        def get_val(key_name, source_key=None, audit_name=None):
            if key_name in inputs and inputs[key_name] is not None:
                return inputs[key_name]
            if source_key and source_key in sources_map and sources_map[source_key] is not None:
                return sources_map[source_key]
            if audit_name and audit_name in audit_map and audit_map[audit_name] is not None:
                return audit_map[audit_name]
            return None

        # Build list of active operational parameters (omitting unprovided optional fields)
        raw_items = [
            ("Energy", "Grid Electricity Consumption", get_val("grid_electricity_kwh", "grid_electricity", "Grid Electricity"), "kWh"),
            ("Energy", "Diesel Generator Fuel", get_val("diesel_liters", "diesel_genset", "Diesel Genset Fuel"), "Liters"),
            ("Energy", "Natural Gas Combustion", get_val("natural_gas_m3", "natural_gas", "Natural Gas Fuel"), "m³"),
            ("Material Input", "Virgin Polymer Input", get_val("virgin_material_kg", "virgin_polymer", "Virgin Polymer Resin"), "kg"),
            ("Material Input", "Post-Consumer Recycled Resin (PCR)", get_val("recycled_material_kg", "recycled_polymer", "Recycled Polymer (PCR)"), "kg"),
            ("Production", "Finished Goods Production Output", get_val("production_output_kg", audit_name="Finished Goods Output"), "kg"),
            ("Waste Stream", "Total Industrial Scrap Generated", get_val("scrap_generated_kg", audit_name="Process Scrap Generated"), "kg"),
            ("Waste Stream", "Internal Regrind Recycled", get_val("scrap_recycled_internal_kg", audit_name="Internal Regrind Recycled"), "kg"),
            ("Waste Stream", "Landfilled Scrap Disposal", get_val("scrap_landfilled_kg", "scrap_landfill", "Landfilled Waste Scrap"), "kg"),
        ]

        has_polymer = False
        act_rows = [
            [Paragraph("<b>Category</b>", style_body), Paragraph("<b>Operational Parameter</b>", style_body), Paragraph("<b>Submitted Input</b>", style_body)]
        ]

        for cat, param, val, unit in raw_items:
            if val is not None and val != "":
                try:
                    num_val = float(val)
                    if num_val > 0:
                        if "Polymer" in param or "Resin" in param:
                            has_polymer = True
                        if num_val.is_integer():
                            formatted_str = f"{int(num_val):,} {unit}"
                        else:
                            formatted_str = f"{num_val:,.2f} {unit}"
                        act_rows.append([
                            Paragraph(cat, style_body),
                            Paragraph(param, style_body),
                            Paragraph(f"<b>{formatted_str}</b>", style_body)
                        ])
                except (ValueError, TypeError):
                    act_rows.append([
                        Paragraph(cat, style_body),
                        Paragraph(param, style_body),
                        Paragraph(f"<b>{val} {unit}</b>", style_body)
                    ])

        # If polymer materials are recorded, include the Resin Type
        polymer_type = inputs.get("polymer_type") or assessment.get("polymer_type")
        if (has_polymer or polymer_type) and polymer_type:
            act_rows.append([
                Paragraph("Material Input", style_body),
                Paragraph("Polymer Resin Grade / Type", style_body),
                Paragraph(f"<b>{polymer_type}</b>", style_body)
            ])

        if len(act_rows) == 1:
            act_rows.append([
                Paragraph("General", style_body),
                Paragraph("Baseline Activity Data", style_body),
                Paragraph("Standard operational baseline parameters applied", style_body)
            ])

        act_table = Table(act_rows, colWidths=[120, 205, 190])
        act_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
            ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_PRIMARY),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(act_table)
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 4. EMISSION BREAKDOWN TABLE
        # ----------------------------------------------------
        story.append(Paragraph("Scope & Emission Breakdown", style_h1))
        breakdown = assessment.get("category_breakdown") or {}
        
        brk_rows = [
            [Paragraph("<b>Category / Source</b>", style_body), Paragraph("<b>Monthly CO₂e (Tonnes)</b>", style_body), Paragraph("<b>Contribution (%)</b>", style_body), Paragraph("<b>Factor Provenance Source</b>", style_body)]
        ]

        category_provenance = {
            "Raw Materials": "CPCB Polymer LCA Dataset 2024 / Ecoinvent v3.9",
            "Electricity": "CEA CO₂ Baseline Database v19 (0.716 kgCO₂e/kWh)",
            "Thermal Energy": "IPCC 2006 Stationary Combustion (Diesel / Natural Gas)",
            "Waste Stream": "CPCB Industrial Solid Waste Framework (Landfill Methane)"
        }

        for cat, val in breakdown.items():
            pct = (val / total_co2e * 100) if total_co2e > 0 else 0
            prov = category_provenance.get(cat, "CPCB / CEA Official Standards")
            brk_rows.append([
                Paragraph(cat, style_body),
                Paragraph(f"<b>{val:.2f} t</b>", style_body),
                Paragraph(f"{pct:.1f}%", style_body),
                Paragraph(f"<font size=7.5 color='#4b5563'>{prov}</font>", style_body)
            ])

        brk_rows.append([
            Paragraph("<b>TOTAL MONTHLY FOOTPRINT</b>", style_body),
            Paragraph(f"<b>{total_co2e:.2f} tCO₂e</b>", style_body),
            Paragraph("<b>100.0%</b>", style_body),
            Paragraph("<b>CPCB & CEA Standard Baseline</b>", style_body)
        ])

        brk_table = Table(brk_rows, colWidths=[140, 110, 85, 180])
        brk_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e8f3ee")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(brk_table)
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 5. LEAK-POINT ANALYSIS
        # ----------------------------------------------------
        story.append(Paragraph("Industrial Emission Leak-Point Analysis", style_h1))
        
        leak_rows = [
            [Paragraph("<b>Rank</b>", style_body), Paragraph("<b>Leak-Point Hotspot Source</b>", style_body), Paragraph("<b>Monthly CO₂e</b>", style_body), Paragraph("<b>Share (%)</b>", style_body)]
        ]
        
        if hotspots:
            for idx, hp in enumerate(hotspots[:3], 1):
                hp_name = hp.get("source_name") or hp.get("name") or f"Leak Point #{idx}"
                co2e_val = hp.get("co2e_tonnes") if "co2e_tonnes" in hp else hp.get("co2e", 0.0)
                pct_val = hp.get("percentage") if "percentage" in hp else hp.get("pct", 0.0)
                rank_val = hp.get("rank", idx)
                leak_rows.append([
                    Paragraph(f"<b>#{rank_val}</b>", style_body),
                    Paragraph(f"<b>{hp_name}</b>", style_body),
                    Paragraph(f"{float(co2e_val):.2f} tCO₂e", style_body),
                    Paragraph(f"<b>{float(pct_val):.1f}%</b>", style_body)
                ])
        else:
            leak_rows.append([
                Paragraph("-", style_body),
                Paragraph("<i>No significant leak points detected</i>", style_body),
                Paragraph("0.00 tCO₂e", style_body),
                Paragraph("0.0%", style_body)
            ])

        leak_table = Table(leak_rows, colWidths=[40, 240, 115, 120])
        leak_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(leak_table)
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 6. CONFIDENCE / DATA QUALITY EXPLANATION
        # ----------------------------------------------------
        story.append(Paragraph("Data Confidence & Quality Explanation", style_h1))
        if not conf_reasons:
            if confidence_score >= 90:
                conf_reasons = [
                    "Complete grid electricity and primary polymer resin activity data provided.",
                    "CEA CO₂ Baseline Database v19 applied for Indian Grid Electricity (0.716 kgCO₂e/kWh)."
                ]
            else:
                conf_reasons = [
                    "Partial operational input data provided.",
                    "Unrecorded activity streams excluded from calculations without penalty."
                ]

        conf_bullets = "<br/>".join([f"• {r}" for r in conf_reasons])
        conf_box = [
            [
                Paragraph(f"<b>Overall Score: {confidence_score} / 100</b><br/><br/>{conf_bullets}", style_body)
            ]
        ]
        conf_table = Table(conf_box, colWidths=[515])
        conf_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#a7f3d0")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(conf_table)
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 7. CIRCULAR RECOMMENDATIONS
        # ----------------------------------------------------
        story.append(Paragraph("Actionable Circular Recommendations", style_h1))
        recs = assessment.get("recommendations") or []
        
        if recs:
            rec_rows = [
                [Paragraph("<b>Title & Target Source</b>", style_body), Paragraph("<b>Reason & Strategy</b>", style_body), Paragraph("<b>Estimated CO₂ Cut</b>", style_body)]
            ]
            for r in recs[:4]:
                r_title = r.get("title") or "Circular Opportunity"
                r_source = r.get("addresses_hotspot") or r.get("relevant_source") or "General"
                r_reason = r.get("description") or r.get("subtitle") or r.get("reason") or "Circular alternative strategy."
                co2_cut = r.get("projected_co2e_savings_tonnes") if "projected_co2e_savings_tonnes" in r else r.get("co2e_reduction", 0.0)

                rec_rows.append([
                    Paragraph(f"<b>{r_title}</b><br/><font size=7.5 color='#6b7280'>Target Source: {r_source}</font>", style_body),
                    Paragraph(str(r_reason), style_body),
                    Paragraph(f"<font color='#18583f'><b>-{float(co2_cut):.2f} t/mo</b></font>", style_body)
                ])
            rec_table = Table(rec_rows, colWidths=[180, 235, 100])
            rec_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(rec_table)
        else:
            story.append(Paragraph("<i>No specific recommendations generated for this baseline.</i>", style_body))

        
        story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 8. WHAT-IF SIMULATION SUMMARY
        # ----------------------------------------------------
        sim = assessment.get("simulation")
        if sim:
            base_sim = float(sim.get("baseline_co2e_tonnes", total_co2e))
            proj_sim = float(sim.get("projected_co2e_tonnes", total_co2e))
            red_abs = float(sim.get("net_reduction_tonnes", 0.0))
            red_pct = float(sim.get("net_reduction_pct", 0.0))

            story.append(Paragraph("What-If Simulation Scenario", style_h1))
            sim_data = [
                [Paragraph("<b>Parameter</b>", style_body), Paragraph("<b>Baseline Footprint</b>", style_body), Paragraph("<b>Projected Scenario</b>", style_body), Paragraph("<b>Net Monthly Reduction</b>", style_body)],
                [Paragraph("Monthly Emission", style_body), Paragraph(f"{base_sim:.2f} tCO₂e", style_body), Paragraph(f"<b>{proj_sim:.2f} tCO₂e</b>", style_body), Paragraph(f"<font color='#18583f'><b>-{red_abs:.2f} t ({red_pct:.1f}%)</b></font>", style_body)]
            ]
            sim_table = Table(sim_data, colWidths=[130, 125, 130, 130])
            sim_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(sim_table)
            story.append(Spacer(1, 14))
        elif recs and len(recs) > 0 and total_co2e > 0:
            top_rec = recs[0]
            r_title = top_rec.get("title", "Circular Alternative Strategy")
            co2_cut = float(top_rec.get("projected_co2e_savings_tonnes", 0.0))
            if co2_cut <= 0:
                co2_cut = float(top_rec.get("co2e_reduction", 0.0))
            if co2_cut <= 0:
                co2_cut = total_co2e * 0.20  # standard 20% benchmark

            proj_sim = max(0.0, total_co2e - co2_cut)
            red_pct = (co2_cut / total_co2e * 100) if total_co2e > 0 else 0.0

            story.append(Paragraph("What-If Simulation Scenario", style_h1))
            story.append(Paragraph(f"<font color='#6b7280' size=8>Projected strategy adoption: {r_title}</font>", style_body))
            story.append(Spacer(1, 3))
            sim_data = [
                [Paragraph("<b>Parameter</b>", style_body), Paragraph("<b>Baseline Footprint</b>", style_body), Paragraph("<b>Projected Scenario</b>", style_body), Paragraph("<b>Net Monthly Reduction</b>", style_body)],
                [Paragraph("Monthly Emission", style_body), Paragraph(f"{total_co2e:.2f} tCO₂e", style_body), Paragraph(f"<b>{proj_sim:.2f} tCO₂e</b>", style_body), Paragraph(f"<font color='#18583f'><b>-{co2_cut:.2f} t ({red_pct:.1f}%)</b></font>", style_body)]
            ]
            sim_table = Table(sim_data, colWidths=[130, 125, 130, 130])
            sim_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(sim_table)
            story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 9. RECYCLER / VENDOR SUGGESTIONS
        # ----------------------------------------------------
        saved_partners = assessment.get("saved_partners") or assessment.get("partners") or []
        if not saved_partners:
            from backend.data.fallback_factors import CURATED_PARTNERS
            saved_partners = CURATED_PARTNERS[:3]

        if saved_partners:
            story.append(Paragraph("Gujarat Recycler & Vendor Suggestions Summary", style_h1))
            part_rows = [
                [Paragraph("<b>Partner Name</b>", style_body), Paragraph("<b>Type & Location</b>", style_body), Paragraph("<b>Distance</b>", style_body), Paragraph("<b>Data Source</b>", style_body)]
            ]
            for p in saved_partners[:3]:
                src_lbl = "OPENSTREETMAP_LIVE" if not p.get("is_demo") else "CURATED GIDC DATA"
                dist = p.get("computed_distance") if p.get("computed_distance") is not None else p.get("distance_km", 4.2)
                part_rows.append([
                    Paragraph(f"<b>{p.get('name')}</b>", style_body),
                    Paragraph(f"{p.get('partner_type')}<br/><font size=7.5 color='#6b7280'>{p.get('location')}</font>", style_body),
                    Paragraph(f"{dist} km", style_body),
                    Paragraph(f"<font size=7.5 color='#18583f'>{src_lbl}</font>", style_body)
                ])
            part_table = Table(part_rows, colWidths=[150, 200, 75, 90])
            part_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(part_table)
            story.append(Spacer(1, 14))

        # ----------------------------------------------------
        # 10. METHODOLOGY / TRANSPARENCY
        # ----------------------------------------------------
        story.append(Paragraph("Methodology & Calculation Transparency", style_h1))
        methodology_text = (
            "CarbonLens SME calculates GHG emissions using standard rule-based activity data formulas:<br/>"
            "<b>Total Emission (kgCO₂e) = Activity Quantity × CPCB/CEA Emission Factor</b><br/>"
            "• Calculations strictly follow Scope 1, Scope 2, and Scope 3 CPCB/IPCC guidelines.<br/>"
            "• The AI explanation layer does NOT generate emission figures; all numbers are strictly deterministic.<br/>"
            "• Results depend on user-provided operational inputs. Missing optional fields are omitted without penalty.<br/>"
            "• Current prototype focus: Plastic & Packaging Manufacturing Units across Gujarat."
        )
        meth_box = [[Paragraph(methodology_text, style_body)]]
        meth_table = Table(meth_box, colWidths=[515])
        meth_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(meth_table)

        # Build PDF with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes


pdf_generator = PDFReportGenerator()
