# CarbonLens SME

**Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

*Built for HackOut'26 at DA-IICT under the "Circular Carbon Ecosystem" theme.*

---

## 🌐 LIVE DEMO & LOCAL ACCESS

- **Live Deployment**: Access the hosted web app instantly at your Vercel deployment URL.
- **Local Application URL**: `http://127.0.0.1:8000` (when running locally)

> [!IMPORTANT]
> **Do NOT open `frontend/index.html` directly via double-click (`file://` path)**.
> CarbonLens SME relies on the FastAPI Python backend to perform carbon calculations, serve static assets, and issue API responses. Always start the backend and navigate to `http://127.0.0.1:8000`.

---

## ⚡ RUN LOCALLY (1-CLICK WINDOWS SETUP)

If you extracted this project from a ZIP file on a Windows laptop, follow these simple steps:

```
Extract ZIP  --->  Configure .env (Optional)  --->  Double-Click `start.bat`  --->  Browser opens http://127.0.0.1:8000
```

### Quick Steps:
1. **Extract the ZIP file** to any folder on your computer.
2. (Optional) Copy `.env.example` to `.env` if configuring a custom Supabase database. If skipped, CarbonLens operates automatically in local file-backed persistence mode.
3. **Double-click `start.bat`**.
   - `start.bat` will check Python installation, auto-install missing packages from `requirements.txt`, launch the FastAPI server, and open `http://127.0.0.1:8000` in your web browser.

---

## 🛠️ MANUAL LOCAL SETUP (ANY OS)

### 1. Prerequisites
- **Python 3.10+** (Python 3.14 fully supported)
- `pip` package manager

### 2. Configure Environment
```bash
# Copy example environment file
copy .env.example .env   # (On Linux/macOS: cp .env.example .env)
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run FastAPI Backend & Frontend Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Once started, open your browser and navigate to:
👉 **`http://127.0.0.1:8000`**

---

## 🌟 Executive Summary

Small and medium-sized manufacturing enterprises (SMEs) contribute significantly to industrial carbon emissions through grid electricity, virgin polymer feedstock, fossil heating fuels, and unrecovered process scrap. Standard carbon accounting software only provides an opaque headline number (*"You emitted 120 tonnes of CO₂e"*), leaving factory operators without actionable insight on:

1. **Where do emissions originate?** (Ranked "Leak Points")
2. **What practical circular alternative will fix it?**
3. **What is the projected carbon reduction if implemented?**

CarbonLens SME closes this gap with a 5-stage product journey:
$$\text{MEASURE} \longrightarrow \text{FIND LEAK-POINT} \longrightarrow \text{RECOMMEND} \longrightarrow \text{SIMULATE} \longrightarrow \text{ACT}$$

Phase-1 Focus: **Plastic & Packaging Manufacturing**.

---

## ⚙️ Architecture & Tech Stack

```
Frontend (HTML5 / CSS3 / Modular JS)
       ↓
FastAPI Python REST API
       ↓
Rule-Based Business Calculation Engine
       ↓
Supabase PostgreSQL / Local File Cache Persistence
```

- **Frontend**: HTML5, CSS3 (Arenius-inspired visual design system), Vanilla JavaScript (`app.js`, `api.js`, `charts.js`, `assessment.js`, `simulator.js`), Chart.js, Lucide Icons.
- **Backend Business Engine**: Python FastAPI, Pydantic data schemas. All carbon accounting, confidence scoring, leak-point ranking, circular recommendations, and what-if simulation calculations take place exclusively in Python.
- **Database**: Supabase PostgreSQL schema (`database/schema.sql` and `database/seed.sql`) with automatic local JSON file caching (`database/assessments_cache.json`, `database/users_cache.json`) when operating offline.
- **Traceable Standards**: Central Electricity Authority (CEA) India CO₂ Baseline Database v19 ($0.716\text{ kgCO}_2\text{e/kWh}$), CPCB Polymer LCA Guidelines, IPCC 2006 Guidelines for National GHG Inventories, Ecoinvent 3.9.

---

## 🚀 Key Features & Methodologies

### 1. Transparent Rule-Based Calculation Engine
- Core Formula:
  $$\text{CO}_2\text{e (kg)} = \text{Activity Data} \times \text{Emission Factor}$$
- Converted to metric tonnes ($\text{tCO}_2\text{e} = \text{kgCO}_2\text{e} / 1000$).
- Every calculated source includes factor value, unit, source organization, document reference, reference year, and audit formula.

### 2. Incomplete Data & Data-Quality Confidence Score (0–100%)
- Calculates ONLY user-supplied activity streams without fabricating missing categories.
- Self-reported inputs without third-party utility bill verification are capped at 88% max confidence (12% margin reserved for meter verification).
- If expected fields are omitted, marks assessment as **PARTIAL ESTIMATE** and scales down confidence score.

### 3. Priority Leak-Point Detection
- Ranks top 1 to 3 emission contributors descending by $\text{tCO}_2\text{e}$ share.
- Severity classification: **High Priority** ($\ge 35\%$), **Medium Priority** ($\ge 15\%$), **Low Priority** ($<15\%$) with root-cause diagnostic explanations.

### 4. Circular Recommendations
- Maps detected leak points to report-aligned recommendation categories:
  - *Increase recycled material content*
  - *Improve internal production scrap recovery*
  - *Improve energy efficiency*
  - *Evaluate renewable electricity / rooftop solar*
  - *Improve recycling / closed-loop recovery*
- Displays financial impact text ONLY if explicit cost parameters were supplied by the user; otherwise shows *"Financial estimate unavailable (additional cost data required)"*.

### 5. Interactive "What-If" Simulator
- Recalculates projected footprint using explicit mathematical formulas:
  - **PCR Blend Ratio**: Shifts material volume from virgin factor to PCR factor.
  - **In-House Regrind**: Shifts scrap from landfill factor ($1.45\text{ kgCO}_2\text{e/kg}$) to closed-loop regrind.
  - **Renewable Solar Share**: Replaces grid power ($0.716\text{ kgCO}_2\text{e/kWh}$) with clean generation.
- Generates side-by-side comparison, percentage reduction, and action roadmap.

### 6. Recycler & Vendor Suggestions
- Curated sample dataset of recyclers across Vatva GIDC, Naroda GIDC, Sanand GIDC, and Changodar.
- Prominently labeled as **DEMO / SAMPLE PARTNER DATA**.

### 7. 1-Click Hackathon Demo Mode
- Loads realistic complete test facility (*Vatva Polymer Pack Ltd*).
- Feeds demo input directly into the SAME Python calculation engine as normal assessments.

---

## 🧪 Testing

Run full automated unit test suite:
```bash
python backend/tests/run_tests.py
```

---

## 📌 Troubleshooting & FAQs

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `python: command not found` | Python not in PATH | Install Python 3.10+ and check "Add Python to PATH" during installation. |
| `Failed to fetch` error in browser | Accessing `file://` directly | Do NOT double click `index.html`. Launch `start.bat` and open `http://127.0.0.1:8000`. |
| Port 8000 already in use | Another process running on port 8000 | Close conflicting application or run `python -m uvicorn backend.main:app --port 8001`. |

---

## 📌 Prototype Limitations
- Phase-1 focuses specifically on Plastic & Packaging manufacturing.
- Calculates only activities with configured traceable emission factors.
- Recycler dataset represents curated demonstration data for Gujarat MSMEs.
- Financial impact estimates require explicit tariff and purchase cost inputs.
