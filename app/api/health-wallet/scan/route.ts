import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SectionKey = "medications" | "insurance" | "allergies" | "diagnoses" | "doctors" | "pharmacies" | "emergency" | "vaccinations" | "surgeries";

const SECTION_PROMPTS: Record<SectionKey, string> = {
  insurance: `You are looking at a photo of a health insurance card (US). Your job: read EVERY piece of text and number on the card - this is critical.

Step 1: First, mentally scan the ENTIRE card - top to bottom, left to right. Look at logos, headers, labels, and ALL numbers (big or small).

Step 2: Extract these fields. Be aggressive - if you see a number or name that could reasonably be the field, use it. Don't leave fields empty unless truly nothing is there.

Common card examples:
- LA Care Medi-Cal: has a CIN (9-digit Client Index Number), Member name, Date of Birth
- Medicare: has Medicare Number (11-char alphanumeric like 1AB2-C34-DE56), Part A/B info
- Private insurance (Blue Shield, Anthem, Kaiser, Aetna, Humana, UnitedHealthcare): has Member ID (often 9-12 digits/chars), Group # (4-8 digits), Rx BIN/PCN

Return ONLY this JSON (no other text, no markdown):
{"carrier": "insurance company/plan name exactly as printed", "plan_name": "specific plan name/type (HMO, PPO, EPO, Medi-Cal, etc.) if listed separately", "member_id": "the member/subscriber/CIN/ID number - ANY prominent ID number on the card", "group_number": "group number if any", "policy_holder": "patient/member full name printed on card"}

If a field truly is not visible after careful reading, use empty string "".`,

  medications: `Look very carefully at this photo of a medication bottle, pill box, or prescription label. Read ALL visible text including small print on labels. Extract these fields as JSON:
{"name": "medication/drug name (brand or generic)", "dosage": "strength with units (e.g. '10mg', '500mg', '25 mcg')", "frequency": "how often to take (e.g. 'once daily', 'twice daily', 'every 8 hours')", "purpose": "what it treats if visible (e.g. 'blood pressure', 'diabetes')", "prescriber": "doctor/prescriber name", "pharmacy": "pharmacy name if visible"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  allergies: `Read this photo of medical paperwork about allergies. Extract as JSON:
{"allergen": "what causes the allergy (e.g. Penicillin, peanuts, latex)", "type": "one of: drug, food, environmental, other", "reaction": "what reaction occurs (e.g. rash, anaphylaxis, swelling)", "severity": "one of: mild, moderate, severe"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  diagnoses: `Read this photo of a medical document. Extract the diagnosis information as JSON:
{"name": "diagnosis/condition name (e.g. Hypertension, Type 2 Diabetes)", "icd_code": "ICD-10 code if visible (e.g. I10, E11.9)"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  doctors: `Read this doctor's business card or medical office information photo. Extract as JSON:
{"name": "doctor's full name with title (e.g. 'Dr. John Smith, MD')", "specialty": "medical specialty (e.g. Cardiology, Internal Medicine, Family Practice)", "clinic_name": "clinic, hospital, or practice name", "phone": "phone number", "address": "full address"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  pharmacies: `Read this photo of a pharmacy receipt, label, or business card. Extract as JSON:
{"name": "pharmacy name (e.g. CVS, Walgreens, Rite Aid)", "phone": "phone number", "address": "full address"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  emergency: `Read this photo showing emergency contact information. Extract as JSON:
{"name": "person's full name", "relationship": "relationship (e.g. son, daughter, spouse, friend)", "phone": "phone number"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  vaccinations: `Read this photo of a vaccination record or card. Extract as JSON:
{"vaccine_name": "vaccine name (e.g. COVID-19, Influenza/Flu, Pneumonia, Shingles/Zoster, Tdap)", "administered_by": "who administered it (clinician or clinic name)", "location": "where it was given (clinic/pharmacy name)"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  surgeries: `Read this photo of a medical document about a surgery or procedure. Extract as JSON:
{"procedure_name": "surgery or procedure name", "surgeon": "surgeon's name", "hospital": "hospital or facility name"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { section, image } = body as { section: SectionKey; image: string };

    if (!section || !SECTION_PROMPTS[section]) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const base64 = image.includes(",") ? image.split(",")[1] : image;
    const mediaType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: SECTION_PROMPTS[section] },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[scan] Claude API error:", err);
      return NextResponse.json({ error: "Vision API failed" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse response", raw: text }, { status: 422 });
    }

    const fields = JSON.parse(jsonMatch[0]);
    console.log(`[scan] ${section} extracted:`, JSON.stringify(fields));

    return NextResponse.json({ fields });
  } catch (e) {
    console.error("[scan] Error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
