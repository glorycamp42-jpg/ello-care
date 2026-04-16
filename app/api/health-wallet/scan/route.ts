import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SectionKey = "medications" | "insurance" | "allergies" | "diagnoses" | "doctors" | "pharmacies" | "emergency" | "vaccinations" | "surgeries";

const SECTION_PROMPTS: Record<SectionKey, string> = {
  insurance: `Look very carefully at this health insurance card photo. Read ALL text visible, including small print. Common cards include LA Care, Medi-Cal, Medicare, Blue Shield, Anthem, Kaiser, Aetna, Humana, etc. Extract these fields as JSON:
{"carrier": "insurance company or plan name (e.g. 'LA Care Medi-Cal', 'Medicare', 'Blue Shield')", "plan_name": "specific plan name or type if different from carrier", "member_id": "member/subscriber/CIN ID number - look for 'Member ID', 'CIN', 'ID#', 'Subscriber ID'", "group_number": "group number - look for 'Group', 'Group #', 'Grp'", "policy_holder": "patient/member full name printed on the card"}
Look at all four corners and middle of the card. Numbers often appear in small print below labels. If a field is truly not visible, use empty string. Return ONLY the JSON object, no other text.`,

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
