import type {
  PetDto,
  VaccineStatusDto,
  WeightLogDto,
  MedicalRecordDto,
  TeletriageHistoryDto,
} from "../types/api";

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

const SPECIES_LABEL: Record<number, string> = {
  0: "Dog", 1: "Cat", 2: "Bird", 3: "Rabbit", 4: "Reptile", 5: "Other",
};

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
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${s.bg};color:${s.fg}">${esc(status)}</span>`;
}

export function generateHealthPassportHtml(params: HealthPassportParams): string {
  const { pet, ownerName, ownerEmail, vaccineStatuses, weightHistory, medicalRecords, triageHistory, language } = params;
  const isRTL = language === "he";
  const dir = isRTL ? "rtl" : "ltr";
  const genDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const speciesLabel = SPECIES_LABEL[pet.species] ?? "Pet";
  const petPhotoHtml = pet.imageUrl
    ? `<img src="${esc(pet.imageUrl)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #e9d5ff" />`
    : `<div style="width:96px;height:96px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;font-size:40px">${speciesLabel === "Cat" ? "🐈" : speciesLabel === "Bird" ? "🐦" : "🐕"}</div>`;

  const medications = medicalRecords.filter(r => r.type === "Medication");
  const conditions = medicalRecords.filter(r => r.type === "Condition");
  const vetVisits = medicalRecords.filter(r => r.type === "VetVisit");
  const last10Weights = weightHistory.slice(-10);
  const last3Triage = triageHistory.slice(0, 3);

  return `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(pet.name)} — Health Passport</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { margin: 10mm; }
      .no-break { break-inside: avoid; }
      .page-break { break-before: page; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; }
  </style>
</head>
<body class="bg-white text-slate-800 max-w-3xl mx-auto p-6">

  <!-- Header -->
  <div class="text-center mb-6 no-break">
    <div style="display:flex;justify-content:center;margin-bottom:12px">${petPhotoHtml}</div>
    <h1 class="text-3xl font-bold text-purple-700 mb-1">${esc(pet.name)}</h1>
    <p class="text-sm text-slate-500">
      ${esc(speciesLabel)}${pet.breed ? ` · ${esc(pet.breed)}` : ""}
      · Age: ${pet.age}${pet.weight ? ` · ${pet.weight} kg` : ""}
      · ${pet.isNeutered ? "Neutered ✓" : "Not Neutered"}
    </p>
    <p class="text-xs text-slate-400 mt-1">Generated ${genDate}</p>
  </div>

  <!-- Owner Contact -->
  <div class="bg-slate-50 rounded-xl p-4 mb-4 no-break">
    <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Owner Contact</h3>
    <p class="text-sm font-semibold text-slate-700">${esc(ownerName)}</p>
    ${ownerEmail ? `<p class="text-sm text-slate-500">${esc(ownerEmail)}</p>` : ""}
  </div>

  <!-- Alert Cards -->
  ${pet.allergies ? `
  <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 no-break">
    <div class="flex items-center gap-2 mb-1">
      <span style="font-size:16px">⚠️</span>
      <h3 class="text-sm font-bold text-red-700">Allergies</h3>
    </div>
    <p class="text-sm text-red-600">${esc(pet.allergies)}</p>
  </div>` : ""}

  ${pet.medicalConditions ? `
  <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 no-break">
    <div class="flex items-center gap-2 mb-1">
      <span style="font-size:16px">🩺</span>
      <h3 class="text-sm font-bold text-amber-700">Medical Conditions</h3>
    </div>
    <p class="text-sm text-amber-600">${esc(pet.medicalConditions)}</p>
  </div>` : ""}

  ${pet.medicalNotes ? `
  <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3 no-break">
    <div class="flex items-center gap-2 mb-1">
      <span style="font-size:16px">📝</span>
      <h3 class="text-sm font-bold text-blue-700">Medical Notes</h3>
    </div>
    <p class="text-sm text-blue-600">${esc(pet.medicalNotes)}</p>
  </div>` : ""}

  <!-- Vaccination Record -->
  <div class="mb-6 no-break">
    <h2 class="text-lg font-bold text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">
      <span style="margin-${isRTL ? "left" : "right"}:6px">💉</span> Vaccination Record
    </h2>
    ${vaccineStatuses.length > 0 ? `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-slate-400 uppercase">
          <th class="pb-2 px-3">Vaccine</th>
          <th class="pb-2 px-3">Administered</th>
          <th class="pb-2 px-3">Next Due</th>
          <th class="pb-2 px-3">Status</th>
        </tr>
      </thead>
      <tbody>
        ${vaccineStatuses.map((v, i) => `
        <tr class="${i % 2 === 0 ? "bg-white" : "bg-slate-50"}">
          <td class="py-2 px-3 font-semibold">${esc(VACCINE_LABEL[v.vaccineName] ?? String(v.vaccineName))}</td>
          <td class="py-2 px-3">${fmtDate(v.dateAdministered)}</td>
          <td class="py-2 px-3">${fmtDate(v.nextDueDate)}</td>
          <td class="py-2 px-3">${statusBadge(v.status)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<p class="text-sm text-slate-400 italic">No vaccination records.</p>`}
  </div>

  <!-- Medical Records: Medications -->
  ${medications.length > 0 ? `
  <div class="mb-6 no-break">
    <h2 class="text-lg font-bold text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">
      <span style="margin-${isRTL ? "left" : "right"}:6px">💊</span> Medications
    </h2>
    ${medications.map(r => `
    <div class="bg-slate-50 rounded-lg p-3 mb-2">
      <div class="flex justify-between items-start">
        <p class="text-sm font-semibold text-slate-700">${esc(r.title)}</p>
        <span class="text-xs text-slate-400">${fmtDate(r.date)}</span>
      </div>
      ${r.description ? `<p class="text-xs text-slate-500 mt-1">${esc(r.description)}</p>` : ""}
      ${r.documentUrl ? `<a href="${esc(r.documentUrl)}" class="text-xs text-purple-600 mt-1 inline-block">📎 Attached document</a>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <!-- Medical Records: Conditions -->
  ${conditions.length > 0 ? `
  <div class="mb-6 no-break">
    <h2 class="text-lg font-bold text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">
      <span style="margin-${isRTL ? "left" : "right"}:6px">❤️</span> Conditions
    </h2>
    ${conditions.map(r => `
    <div class="bg-slate-50 rounded-lg p-3 mb-2">
      <div class="flex justify-between items-start">
        <p class="text-sm font-semibold text-slate-700">${esc(r.title)}</p>
        <span class="text-xs text-slate-400">${fmtDate(r.date)}</span>
      </div>
      ${r.description ? `<p class="text-xs text-slate-500 mt-1">${esc(r.description)}</p>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <!-- Medical Records: Vet Visits -->
  ${vetVisits.length > 0 ? `
  <div class="mb-6 no-break">
    <h2 class="text-lg font-bold text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">
      <span style="margin-${isRTL ? "left" : "right"}:6px">🏥</span> Vet Visits
    </h2>
    ${vetVisits.map(r => `
    <div class="bg-slate-50 rounded-lg p-3 mb-2">
      <div class="flex justify-between items-start">
        <p class="text-sm font-semibold text-slate-700">${esc(r.title)}</p>
        <span class="text-xs text-slate-400">${fmtDate(r.date)}</span>
      </div>
      ${r.description ? `<p class="text-xs text-slate-500 mt-1">${esc(r.description)}</p>` : ""}
      ${r.documentUrl ? `<a href="${esc(r.documentUrl)}" class="text-xs text-purple-600 mt-1 inline-block">📎 Attached document</a>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <!-- Weight History -->
  <div class="mb-6 no-break">
    <h2 class="text-lg font-bold text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">
      <span style="margin-${isRTL ? "left" : "right"}:6px">⚖️</span> Weight History
    </h2>
    ${last10Weights.length > 0 ? `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-slate-400 uppercase">
          <th class="pb-2 px-3">Date</th>
          <th class="pb-2 px-3">Weight (kg)</th>
        </tr>
      </thead>
      <tbody>
        ${last10Weights.map((w, i) => `
        <tr class="${i % 2 === 0 ? "bg-white" : "bg-slate-50"}">
          <td class="py-2 px-3">${fmtDate(w.dateRecorded)}</td>
          <td class="py-2 px-3 font-semibold">${w.weight}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<p class="text-sm text-slate-400 italic">No weight records.</p>`}
  </div>

  <!-- Feeding Schedule -->
  ${pet.feedingSchedule ? `
  <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 no-break">
    <h3 class="text-sm font-bold text-green-700 mb-1">🍽️ Feeding Schedule</h3>
    <p class="text-sm text-green-600">${esc(pet.feedingSchedule)}</p>
  </div>` : ""}

  <!-- Identification & Vet Info -->
  <div class="grid grid-cols-2 gap-3 mb-6">
    ${pet.microchipNumber ? `
    <div class="bg-slate-50 rounded-xl p-4 no-break">
      <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Microchip</h3>
      <p class="text-sm font-bold text-slate-700 font-mono">${esc(pet.microchipNumber)}</p>
    </div>` : ""}
    ${pet.vetName || pet.vetPhone ? `
    <div class="bg-purple-50 rounded-xl p-4 no-break">
      <h3 class="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Veterinarian</h3>
      ${pet.vetName ? `<p class="text-sm font-bold text-purple-700">${esc(pet.vetName)}</p>` : ""}
      ${pet.vetPhone ? `<p class="text-sm text-purple-600">${esc(pet.vetPhone)}</p>` : ""}
    </div>` : ""}
  </div>

  <!-- Appendix: AI Triage -->
  ${last3Triage.length > 0 ? `
  <div class="mt-8 pt-4 border-t-2 border-slate-200 no-break">
    <h2 class="text-lg font-bold text-slate-700 mb-1">
      <span style="margin-${isRTL ? "left" : "right"}:6px">🤖</span> Recent Symptom Assessments (AI)
    </h2>
    <p class="text-xs text-slate-400 italic mb-3">These are AI-generated assessments and do not replace professional veterinary advice.</p>
    ${last3Triage.map(t => `
    <div class="bg-slate-50 rounded-lg p-3 mb-2 no-break">
      <div class="flex justify-between items-center mb-1">
        <span class="text-xs text-slate-400">${fmtDate(t.createdAt)}</span>
        <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;color:white;background:${SEVERITY_COLOR[t.severity] ?? "#64748b"}">${esc(t.severity)}</span>
      </div>
      <p class="text-xs text-slate-500 mb-1"><strong>Symptoms:</strong> ${esc(t.symptoms.length > 120 ? t.symptoms.slice(0, 120) + "…" : t.symptoms)}</p>
      <p class="text-xs text-slate-600">${esc(t.assessment)}</p>
      ${t.recommendations ? `<p class="text-xs text-slate-500 mt-1"><strong>Recommendations:</strong> ${esc(t.recommendations)}</p>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <!-- Footer -->
  <div class="text-center mt-8 pt-4 border-t border-slate-100">
    <p class="text-xs text-slate-300">Generated on ${genDate} via PetOwner App</p>
  </div>

</body>
</html>`;
}
