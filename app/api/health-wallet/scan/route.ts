import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SectionKey = "medications" | "insurance" | "allergies" | "diagnoses" | "doctors" | "pharmacies" | "emergency" | "vaccinations" | "surgeries";

const SECTION_PROMPTS: Record<SectionKey, string> = {
  insurance: `This is a photo of a health insurance card. Extract these fields as JSON:
{"carrier": "insurance company name", "plan_name": "plan name", "member_id": "member ID number", "group_number": "group number", "policy_holder": "policyholder name", "effective_date": "YYYY-MM-DD or empty", "expiry_date": "YYYY-MM-DD or empty"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  medications: `This is a photo of a medication bottle, pill box, or prescription label. Extract these fields as JSON:
{"name": "medication name", "dosage": "dosage e.g. 10mg", "frequency": "how often e.g. twice daily", "purpose": "what it's for if visible", "prescriber": "doctor name if visible", "pharmacy": "pharmacy name if visible"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  allergies: `This is a photo of medical paperwork showing allergies. Extract as JSON:
{"allergen": "what causes the allergy", "type": "drug or food or environmental or other", "reaction": "what happens", "severity": "mild or moderate or severe"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  diagnoses: `This is a photo of a medical document showing a diagnosis. Extract as JSON:
{"name": "diagnosis name", "icd_code": "ICD code if visible"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  doctors: `This is a photo of a doctor's business card or medical office information. Extract as JSON:
{"name": "doctor name", "specialty": "specialty e.g. Cardiology", "clinic_name": "clinic or hospital name", "phone": "phone number", "address": "address"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  pharmacies: `This is a photo of a pharmacy receipt, label, or business card. Extract as JSON:
{"name": "pharmacy name", "phone": "phone number", "address": "address"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  emergency: `This is a photo of contact information for an emergency contact. Extract as JSON:
{"name": "person's name", "relationship": "relationship e.g. son, daughter", "phone": "phone number"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  vaccinations: `This is a photo of a vaccination record or card. Extract as JSON:
{"vaccine_name": "vaccine name e.g. COVID-19, Flu", "date_given": "YYYY-MM-DD if visible", "administered_by": "who gave it", "location": "where it was given"}
If a field is not visible, use empty string. Return ONLY the JSON object.`,

  surgeries: `This is a photo of a medical document about a surgery or procedure. Extract as JSON:
{"procedure_name": "surgery/procedure name", "date_performed": "YYYY-MM-DD if visible", "surgeon": "surgeon name", "hospital": "hospital name"}
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

    // Clean base64
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
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

    // Extract JSON from response
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
