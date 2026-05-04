import {
  PetSpecies,
  type PetDto,
  type VaccineStatusDto,
  type WeightLogDto,
  type MedicalRecordDto,
  type TeletriageHistoryDto,
} from "../types/api";
import { getSpeciesEmoji } from "../screens/pets/MyPets/constants";
import { formatBreedForLanguage } from "../screens/pets/addPetHelpers";

interface HealthPassportParams {
  pet: PetDto;
  ownerName: string;
  ownerEmail?: string;
  vaccineStatuses: VaccineStatusDto[];
  weightHistory: WeightLogDto[];
  medicalRecords: MedicalRecordDto[];
  triageHistory: TeletriageHistoryDto[];
  language: "he" | "en";
}

const VACCINE_LABEL: Record<string | number, string> = {
  1: "Rabies", 2: "Parvo", 3: "Distemper", 4: "Hepatitis",
  5: "Leptospirosis", 6: "Bordetella", 7: "Lyme", 8: "Influenza",
  9: "Worms", 10: "Fleas", 11: "Ticks", 12: "FeLV", 13: "FIV", 99: "Other",
  Rabies: "Rabies", Parvo: "Parvo", Distemper: "Distemper", Hepatitis: "Hepatitis",
  Leptospirosis: "Leptospirosis", Bordetella: "Bordetella", Lyme: "Lyme",
  Influenza: "Influenza", Worms: "Worms", Fleas: "Fleas", Ticks: "Ticks",
  FeLV: "FeLV", FIV: "FIV", Other: "Other",
};

/** Matches `PetSpecies` (API: numeric 1–6 or string enum names). */
const SPECIES_LABEL_EN: Record<number, string> = {
  [PetSpecies.Dog]: "Dog",
  [PetSpecies.Cat]: "Cat",
  [PetSpecies.Bird]: "Bird",
  [PetSpecies.Rabbit]: "Rabbit",
  [PetSpecies.Reptile]: "Reptile",
  [PetSpecies.Other]: "Other",
};

function speciesLabelForPassport(
  species: PetSpecies | string | number | undefined | null,
): string {
  if (species === undefined || species === null || species === "") return "Pet";
  if (typeof species === "number") {
    return SPECIES_LABEL_EN[species] ?? "Pet";
  }
  const asNum = Number(species);
  if (!Number.isNaN(asNum) && SPECIES_LABEL_EN[asNum] !== undefined) {
    return SPECIES_LABEL_EN[asNum];
  }
  const normalized =
    typeof species === "string"
      ? species.trim().charAt(0).toUpperCase() +
        species.trim().slice(1).toLowerCase()
      : String(species);
  const byName: Record<string, string> = {
    Dog: "Dog",
    Cat: "Cat",
    Bird: "Bird",
    Rabbit: "Rabbit",
    Reptile: "Reptile",
    Other: "Other",
  };
  return byName[normalized] ?? "Pet";
}

const SEVERITY_COLOR: Record<string, string> = {
  Low: "#16a34a", Medium: "#d97706", High: "#ea580c", Critical: "#dc2626",
};

function esc(s?: string | null): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso.slice(0, 10); }
}

function statusBadge(status: string): string {
  const map: Record<string, { bg: string; fg: string }> = {
    "Up to Date": { bg: "#dcfce7", fg: "#166534" },
    "Due Soon": { bg: "#fef9c3", fg: "#854d0e" },
    "Overdue": { bg: "#fee2e2", fg: "#991b1b" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", fg: "#334155" };
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${s.bg};color:${s.fg}">${esc(status)}</span>`;
}

/** Split free-text lists into discrete items for pill badges (commas, semicolons, newlines, middle dots). */
function splitListForPills(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  const parts = raw.split(/\s*[,;]\s*|\s*\n\s*|\s+·\s+/).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [raw.trim()];
}

function pillsHtml(items: string[], bg: string, color: string, border?: string): string {
  if (!items.length) return "";
  const b = border ? `border:1px solid ${border};` : "";
  return items
    .map(
      t =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;background:${bg};color:${color};${b}">${esc(t)}</span>`,
    )
    .join("");
}

type PassportLabels = {
  docTitle: string;
  docTagline: string;
  logoPlaceholder: string;
  ownerContact: string;
  statusLabel: string;
  allergies: string;
  medicalConditions: string;
  medicalNotes: string;
  vaccinationRecord: string;
  noVaccinationRecords: string;
  medications: string;
  conditions: string;
  vetVisits: string;
  weightHistory: string;
  noWeightRecords: string;
  feedingSchedule: string;
  microchip: string;
  veterinarian: string;
  attachedDocument: string;
  vaccineCol: string;
  administeredCol: string;
  nextDueCol: string;
  statusCol: string;
  dateCol: string;
  weightKgCol: string;
  triageTitle: string;
  triageDisclaimer: string;
  symptoms: string;
  recommendations: string;
  age: string;
  neuteredYes: string;
  neuteredNo: string;
  species: string;
  breed: string;
  footerGenerated: (date: string) => string;
};

function labelsForLanguage(isRTL: boolean): PassportLabels {
  if (isRTL) {
    return {
      docTitle: "פרופיל רפואי",
      docTagline: "תיעוד בריאות דיגיטלי · PetOwner",
      logoPlaceholder: "מקום לוגו האפליקציה",
      statusLabel: "סטטוס",
      ownerContact: "פרטי בעלים",
      allergies: "אלרגיות",
      medicalConditions: "מצבים רפואיים",
      medicalNotes: "הערות רפואיות",
      vaccinationRecord: "חיסונים",
      noVaccinationRecords: "אין רשומות חיסון.",
      medications: "תרופות",
      conditions: "אבחנות / מצבים",
      vetVisits: "ביקורים וטרינריים",
      weightHistory: "היסטוריית משקל",
      noWeightRecords: "אין רשומות משקל.",
      feedingSchedule: "לוח הזנה",
      microchip: "שבב",
      veterinarian: "וטרינר",
      attachedDocument: "מסמך מצורף",
      vaccineCol: "חיסון",
      administeredCol: "ניתן בתאריך",
      nextDueCol: "מועד הבא",
      statusCol: "סטטוס",
      dateCol: "תאריך",
      weightKgCol: "משקל (ק״ג)",
      triageTitle: "הערכות תסמינים אחרונות (AI)",
      triageDisclaimer: "אלה הערכות שנוצרו על ידי בינה מלאכותית ואינן מחליפות ייעוץ וטרינרי.",
      symptoms: "תסמינים:",
      recommendations: "המלצות:",
      age: "גיל",
      neuteredYes: "מסורס/ת",
      neuteredNo: "לא מסורס/ת",
      species: "מין",
      breed: "גזע",
      footerGenerated: (date: string) => `נוצר בתאריך ${esc(date)} באמצעות אפליקציית PetOwner`,
    };
  }
  return {
    docTitle: "Pet Health Passport",
    docTagline: "Digital health record · PetOwner",
    logoPlaceholder: "App Logo Placeholder",
    statusLabel: "Status",
    ownerContact: "Owner contact",
    allergies: "Allergies",
    medicalConditions: "Medical conditions",
    medicalNotes: "Medical notes",
    vaccinationRecord: "Vaccination record",
    noVaccinationRecords: "No vaccination records.",
    medications: "Medications",
    conditions: "Conditions",
    vetVisits: "Vet visits",
    weightHistory: "Weight history",
    noWeightRecords: "No weight records.",
    feedingSchedule: "Feeding schedule",
    microchip: "Microchip",
    veterinarian: "Veterinarian",
    attachedDocument: "Attached document",
    vaccineCol: "Vaccine",
    administeredCol: "Administered",
    nextDueCol: "Next due",
    statusCol: "Status",
    dateCol: "Date",
    weightKgCol: "Weight (kg)",
    triageTitle: "Recent symptom assessments (AI)",
    triageDisclaimer: "These are AI-generated assessments and do not replace professional veterinary advice.",
    symptoms: "Symptoms:",
    recommendations: "Recommendations:",
    age: "Age",
    neuteredYes: "Neutered / spayed",
    neuteredNo: "Not neutered / spayed",
    species: "Species",
    breed: "Breed",
    footerGenerated: (date: string) => `Generated on ${esc(date)} via PetOwner App`,
  };
}

export function generateHealthPassportHtml(params: HealthPassportParams): string {
  const { pet, ownerName, ownerEmail, vaccineStatuses, weightHistory, medicalRecords, triageHistory, language } = params;
  const isRTL = language === "he";
  const dir = isRTL ? "rtl" : "ltr";
  const L = labelsForLanguage(isRTL);
  const locale = isRTL ? "he-IL" : "en-GB";
  const genDate = new Date().toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });

  const speciesLabel = speciesLabelForPassport(pet.species);
  const speciesEmoji = getSpeciesEmoji(pet.species);
  const breedDisplay = pet.breed ? esc(formatBreedForLanguage(pet.breed, language)) : "";
  const neuteredLabel = pet.isNeutered ? L.neuteredYes : L.neuteredNo;

  const petPhotoHtml = pet.imageUrl
    ? `<img src="${esc(pet.imageUrl)}" alt="" width="96" height="96" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.12);" />`
    : `<div style="width:96px;height:96px;border-radius:50%;background:#e4e4e7;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;font-size:40px;line-height:1;">${speciesEmoji}</div>`;

  const medications = medicalRecords.filter(r => r.type === "Medication");
  const conditions = medicalRecords.filter(r => r.type === "Condition");
  const vetVisits = medicalRecords.filter(r => r.type === "VetVisit");
  const last10Weights = weightHistory.slice(-10);
  const last3Triage = triageHistory.slice(0, 3);

  const allergyItems = splitListForPills((pet.allergies ?? "").trim() || undefined);
  const conditionItems = splitListForPills((pet.medicalConditions ?? "").trim() || undefined);
  const medicalNotesTrimmed = (pet.medicalNotes ?? "").trim();
  const noteItems = splitListForPills(medicalNotesTrimmed || undefined);

  const vaccinesTable =
    vaccineStatuses.length > 0
      ? `<table class="data-table" role="presentation">
      <thead>
        <tr>
          <th>${esc(L.vaccineCol)}</th>
          <th>${esc(L.administeredCol)}</th>
          <th>${esc(L.nextDueCol)}</th>
          <th>${esc(L.statusCol)}</th>
        </tr>
      </thead>
      <tbody>
        ${vaccineStatuses
          .map(
            v => `<tr>
          <td style="font-weight:600;">${esc(VACCINE_LABEL[v.vaccineName] ?? String(v.vaccineName))}</td>
          <td>${fmtDate(v.dateAdministered)}</td>
          <td>${fmtDate(v.nextDueDate)}</td>
          <td>${statusBadge(v.status)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`
      : `<p class="muted">${esc(L.noVaccinationRecords)}</p>`;

  const weightTable =
    last10Weights.length > 0
      ? `<table class="data-table" role="presentation">
      <thead>
        <tr>
          <th>${esc(L.dateCol)}</th>
          <th>${esc(L.weightKgCol)}</th>
        </tr>
      </thead>
      <tbody>
        ${last10Weights
          .map(
            w => `<tr>
          <td>${fmtDate(w.dateRecorded)}</td>
          <td style="font-weight:600;">${esc(String(w.weight))}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`
      : `<p class="muted">${esc(L.noWeightRecords)}</p>`;

  const medCards = medications
    .map(
      r => `<div class="card-block">
      <div class="card-head">
        <span class="card-title">${esc(r.title)}</span>
        <span class="card-meta">${fmtDate(r.date)}</span>
      </div>
      ${r.description ? `<p class="card-body">${esc(r.description)}</p>` : ""}
      ${r.documentUrl ? `<p class="card-link"><a href="${esc(r.documentUrl)}">${esc(L.attachedDocument)}</a></p>` : ""}
    </div>`,
    )
    .join("");

  const conditionCards = conditions
    .map(
      r => `<div class="card-block">
      <div class="card-head">
        <span class="card-title">${esc(r.title)}</span>
        <span class="card-meta">${fmtDate(r.date)}</span>
      </div>
      ${r.description ? `<p class="card-body">${esc(r.description)}</p>` : ""}
    </div>`,
    )
    .join("");

  const vetCards = vetVisits
    .map(
      r => `<div class="card-block">
      <div class="card-head">
        <span class="card-title">${esc(r.title)}</span>
        <span class="card-meta">${fmtDate(r.date)}</span>
      </div>
      ${r.description ? `<p class="card-body">${esc(r.description)}</p>` : ""}
      ${r.documentUrl ? `<p class="card-link"><a href="${esc(r.documentUrl)}">${esc(L.attachedDocument)}</a></p>` : ""}
    </div>`,
    )
    .join("");

  const idRowCells: string[] = [];
  if (pet.microchipNumber) {
    idRowCells.push(`<td class="id-cell">
      <div class="id-label">${esc(L.microchip)}</div>
      <div class="id-value mono">${esc(pet.microchipNumber)}</div>
    </td>`);
  }
  if (pet.vetName || pet.vetPhone) {
    idRowCells.push(`<td class="id-cell id-cell-accent">
      <div class="id-label">${esc(L.veterinarian)}</div>
      ${pet.vetName ? `<div class="id-value">${esc(pet.vetName)}</div>` : ""}
      ${pet.vetPhone ? `<div class="id-sub">${esc(pet.vetPhone)}</div>` : ""}
    </td>`);
  }
  const idTable =
    idRowCells.length > 0
      ? `<table class="id-grid" role="presentation"><tr>${idRowCells.join("")}</tr></table>`
      : "";

  const triageBlock =
    last3Triage.length > 0
      ? `<div class="section no-break">
    <h2 class="section-title">${esc(L.triageTitle)}</h2>
    <p class="section-note">${esc(L.triageDisclaimer)}</p>
    ${last3Triage
      .map(
        t => `<div class="card-block no-break">
      <div class="card-head">
        <span class="card-meta">${fmtDate(t.createdAt)}</span>
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;background:${SEVERITY_COLOR[t.severity] ?? "#64748b"}">${esc(t.severity)}</span>
      </div>
      <p class="card-body"><strong>${esc(L.symptoms)}</strong> ${esc(t.symptoms.length > 120 ? t.symptoms.slice(0, 120) + "…" : t.symptoms)}</p>
      <p class="card-body">${esc(t.assessment)}</p>
      ${t.recommendations ? `<p class="card-body"><strong>${esc(L.recommendations)}</strong> ${esc(t.recommendations)}</p>` : ""}
    </div>`,
      )
      .join("")}
  </div>`
      : "";

  const notesBlock =
    noteItems.length > 0
      ? noteItems.length > 1 || /[,;\n·]/.test(medicalNotesTrimmed)
        ? `<div class="pill-row">${pillsHtml(noteItems, "#e0e7ff", "#3730a3", "#a5b4fc")}</div>`
        : `<p class="notes-prose">${esc(medicalNotesTrimmed)}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(pet.name)} — ${esc(L.docTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    @media print {
      body { margin: 0; padding: 12mm; }
      .no-break { break-inside: avoid; page-break-inside: avoid; }
      .page-break { break-before: page; page-break-before: always; }
    }
    body {
      margin: 0;
      padding: 20px 16px 28px;
      background: #f4f4f5;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #18181b;
      font-size: 14px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e4e4e7;
      padding: 28px 24px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .doc-header {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 18px;
    }
    .doc-header td { vertical-align: middle; padding: 0 8px 0 0; }
    .doc-header td:last-child { padding-inline-end: 0; padding-inline-start: 8px; }
    .logo-slot {
      width: 88px;
      height: 88px;
      border: 2px dashed #d4d4d8;
      border-radius: 10px;
      background: #fafafa;
      font-size: 9px;
      line-height: 1.25;
      color: #71717a;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }
    .logo-slot img { display: none; width: 100%; height: 100%; object-fit: contain; }
    .doc-title-wrap { text-align: center; }
    .doc-title {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #18181b;
    }
    .doc-sub { margin: 6px 0 0; font-size: 11px; color: #71717a; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; }
    .identity-card {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      overflow: hidden;
    }
    .identity-card td { padding: 18px 16px; vertical-align: middle; }
    .identity-avatar { width: 112px; text-align: center; }
    .identity-avatar > * { margin: 0 auto; }
    .pet-name { margin: 0 0 6px; font-size: 24px; font-weight: 700; color: #09090b; }
    .meta-line { margin: 0 0 4px; font-size: 13px; color: #3f3f46; }
    .meta-line .label { color: #71717a; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-inline-end: 6px; }
    .meta-strong { font-weight: 600; color: #18181b; }
    .section { margin-bottom: 20px; }
    .section-title {
      margin: 0 0 10px;
      font-size: 15px;
      font-weight: 700;
      color: #27272a;
      padding-bottom: 8px;
      border-bottom: 2px solid #e4e4e7;
    }
    .section-note { margin: 0 0 10px; font-size: 11px; color: #71717a; font-style: italic; }
    .owner-box {
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .owner-box h3 { margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.06em; }
    .owner-box .name { margin: 0; font-size: 15px; font-weight: 700; color: #18181b; }
    .owner-box .email { margin: 4px 0 0; font-size: 13px; color: #52525b; }
    .data-block {
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 14px 16px 10px;
      margin-bottom: 12px;
      background: #ffffff;
    }
    .data-block h3 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #27272a; }
    .pill-row { margin: 0 -4px 0 0; }
    .muted { margin: 0; font-size: 13px; color: #a1a1aa; font-style: italic; }
    .notes-prose { margin: 0; font-size: 13px; color: #3f3f46; white-space: pre-wrap; }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      overflow: hidden;
    }
    table.data-table th {
      background: #e4e4e7;
      text-align: start;
      padding: 8px 12px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #3f3f46;
      border-bottom: 1px solid #d4d4d8;
    }
    table.data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e4e4e7;
      vertical-align: middle;
    }
    table.data-table tr:last-child td { border-bottom: none; }
    .card-block {
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 8px;
      background: #fafafa;
    }
    .card-head { width: 100%; display: table; }
    .card-title { display: table-cell; font-weight: 700; font-size: 13px; color: #18181b; }
    .card-meta { display: table-cell; text-align: end; font-size: 11px; color: #71717a; white-space: nowrap; width: 1%; }
    .card-body { margin: 8px 0 0; font-size: 12px; color: #52525b; }
    .card-link { margin: 6px 0 0; font-size: 11px; }
    .card-link a { color: #4f46e5; }
    .feed-box {
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .feed-box h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #166534; }
    .feed-box p { margin: 0; font-size: 13px; color: #15803d; }
    table.id-grid { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    table.id-grid td { width: 50%; vertical-align: top; padding: 0 6px 10px; }
    table.id-grid td:first-child { padding-inline-start: 0; }
    table.id-grid td:last-child { padding-inline-end: 0; }
    .id-cell {
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .id-cell-accent { background: #faf5ff; border-color: #e9d5ff; }
    .id-label { font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .id-value { font-size: 14px; font-weight: 700; color: #18181b; }
    .id-sub { font-size: 13px; color: #52525b; margin-top: 2px; }
    .mono { font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace; font-size: 13px; }
    .doc-footer {
      max-width: 720px;
      margin: 16px auto 0;
      text-align: center;
      font-size: 11px;
      color: #71717a;
      padding: 0 8px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="doc-header" role="presentation" dir="${dir}">
      <tr>
        <td style="width:100px;">
          <div class="logo-slot" aria-label="${esc(L.logoPlaceholder)}">${esc(L.logoPlaceholder)}</div>
        </td>
        <td class="doc-title-wrap">
          <h1 class="doc-title">${esc(L.docTitle)}</h1>
          <p class="doc-sub">${esc(L.docTagline)}</p>
        </td>
      </tr>
    </table>

    <table class="identity-card no-break" role="presentation" dir="${dir}">
      <tr>
        <td class="identity-avatar">${petPhotoHtml}</td>
        <td>
          <h2 class="pet-name">${esc(pet.name)}</h2>
          <p class="meta-line"><span class="label">${esc(L.species)}</span><span class="meta-strong">${esc(speciesLabel)}</span></p>
          ${breedDisplay ? `<p class="meta-line"><span class="label">${esc(L.breed)}</span><span class="meta-strong">${breedDisplay}</span></p>` : ""}
          <p class="meta-line"><span class="label">${esc(L.age)}</span><span class="meta-strong">${esc(String(pet.age))}</span>${pet.weight ? `<span style="color:#71717a;font-weight:600;"> · ${esc(String(pet.weight))} kg</span>` : ""}</p>
          <p class="meta-line"><span class="label">${esc(L.statusLabel)}</span><span class="meta-strong">${esc(neuteredLabel)}</span></p>
        </td>
      </tr>
    </table>

    <div class="owner-box no-break">
      <h3>${esc(L.ownerContact)}</h3>
      <p class="name">${esc(ownerName)}</p>
      ${ownerEmail ? `<p class="email">${esc(ownerEmail)}</p>` : ""}
    </div>

    ${allergyItems.length ? `<div class="data-block no-break" dir="auto">
      <h3>${esc(L.allergies)}</h3>
      <div class="pill-row">${pillsHtml(allergyItems, "#fee2e2", "#991b1b", "#fecaca")}</div>
    </div>` : ""}

    ${conditionItems.length ? `<div class="data-block no-break" dir="auto">
      <h3>${esc(L.medicalConditions)}</h3>
      <div class="pill-row">${pillsHtml(conditionItems, "#fef3c7", "#92400e", "#fde68a")}</div>
    </div>` : ""}

    ${medicalNotesTrimmed ? `<div class="data-block no-break" dir="auto">
      <h3>${esc(L.medicalNotes)}</h3>
      ${notesBlock}
    </div>` : ""}

    <div class="section no-break">
      <h2 class="section-title">${esc(L.vaccinationRecord)}</h2>
      ${vaccinesTable}
    </div>

    ${medications.length ? `<div class="section no-break">
      <h2 class="section-title">${esc(L.medications)}</h2>
      ${medCards}
    </div>` : ""}

    ${conditions.length ? `<div class="section no-break">
      <h2 class="section-title">${esc(L.conditions)}</h2>
      ${conditionCards}
    </div>` : ""}

    ${vetVisits.length ? `<div class="section no-break">
      <h2 class="section-title">${esc(L.vetVisits)}</h2>
      ${vetCards}
    </div>` : ""}

    <div class="section no-break">
      <h2 class="section-title">${esc(L.weightHistory)}</h2>
      ${weightTable}
    </div>

    ${pet.feedingSchedule ? `<div class="feed-box no-break" dir="auto">
      <h3>${esc(L.feedingSchedule)}</h3>
      <p>${esc(pet.feedingSchedule)}</p>
    </div>` : ""}

    ${idTable}

    ${triageBlock}
  </div>

  <div class="doc-footer">${L.footerGenerated(genDate)}</div>
</body>
</html>`;
}
