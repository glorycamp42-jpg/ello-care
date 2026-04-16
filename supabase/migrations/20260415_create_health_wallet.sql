-- =====================================================================
-- Health Wallet — 본인만 접근 가능한 개인 건강 정보
-- =====================================================================
-- RLS: 모든 테이블은 auth.uid() = user_id 인 본인만 CRUD 가능

-- ========== 1. 보험증 (Insurance Cards) ==========
CREATE TABLE IF NOT EXISTS health_insurance_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrier     text NOT NULL DEFAULT '',          -- 보험사명 (e.g. Anthem, Medicare)
  plan_name   text DEFAULT '',                   -- 플랜명
  member_id   text DEFAULT '',                   -- Member ID
  group_number text DEFAULT '',                  -- Group #
  policy_holder text DEFAULT '',                 -- 가입자명
  effective_date date,
  expiry_date    date,
  front_image_url text,                          -- 앞면 사진 URL (Supabase Storage)
  back_image_url  text,                          -- 뒷면 사진 URL
  is_primary  boolean DEFAULT true,
  notes       text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ========== 2. 복용 약 (Medications) ==========
CREATE TABLE IF NOT EXISTS health_medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,                   -- 약 이름
  dosage        text DEFAULT '',                 -- 용량 (e.g. 10mg)
  frequency     text DEFAULT '',                 -- 빈도 (e.g. 하루 2번, 아침/저녁)
  route         text DEFAULT '',                 -- 경로 (oral, topical, injection)
  purpose       text DEFAULT '',                 -- 복용 이유 (혈압, 당뇨 등)
  prescriber    text DEFAULT '',                 -- 처방 의사
  pharmacy      text DEFAULT '',                 -- 약국
  start_date    date,
  end_date      date,                            -- null = 현재 복용 중
  refill_date   date,                            -- 다음 리필 날짜
  is_active     boolean DEFAULT true,
  notes         text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ========== 3. 알레르기 (Allergies) ==========
CREATE TABLE IF NOT EXISTS health_allergies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allergen    text NOT NULL,                     -- 알레르기 원인 (Penicillin, Shellfish 등)
  type        text DEFAULT 'drug'                -- drug | food | environmental | other
              CHECK (type IN ('drug','food','environmental','other')),
  reaction    text DEFAULT '',                   -- 반응 (rash, anaphylaxis, etc.)
  severity    text DEFAULT 'mild'                -- mild | moderate | severe
              CHECK (severity IN ('mild','moderate','severe')),
  notes       text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ========== 4. 진단명 (Diagnoses) ==========
CREATE TABLE IF NOT EXISTS health_diagnoses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,                   -- 진단명 (HTN, DM, Alzheimer's)
  icd_code      text DEFAULT '',                 -- ICD-10 코드 (선택)
  diagnosed_date date,
  diagnosing_doctor text DEFAULT '',
  is_active     boolean DEFAULT true,
  notes         text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ========== 5. 의사 / 전문의 (Doctors) ==========
CREATE TABLE IF NOT EXISTS health_doctors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  specialty   text DEFAULT '',                   -- PCP, Cardiologist, Neurologist 등
  clinic_name text DEFAULT '',
  phone       text DEFAULT '',
  fax         text DEFAULT '',
  address     text DEFAULT '',
  is_pcp      boolean DEFAULT false,             -- 주치의 여부
  notes       text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ========== 6. 약국 (Pharmacies) ==========
CREATE TABLE IF NOT EXISTS health_pharmacies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text DEFAULT '',
  address     text DEFAULT '',
  is_primary  boolean DEFAULT true,
  notes       text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ========== 7. 비상 연락처 (Emergency Contacts) ==========
CREATE TABLE IF NOT EXISTS health_emergency_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  relationship  text DEFAULT '',                 -- 아들, 딸, 배우자, 친구 등
  phone         text DEFAULT '',
  phone2        text DEFAULT '',
  is_primary    boolean DEFAULT true,
  notes         text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ========== 8. 예방접종 (Vaccinations) ==========
CREATE TABLE IF NOT EXISTS health_vaccinations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_name    text NOT NULL,                 -- COVID-19, Flu, Pneumonia, Shingles 등
  dose_number     int DEFAULT 1,
  date_given      date,
  administered_by text DEFAULT '',
  location        text DEFAULT '',               -- 접종 장소
  next_due_date   date,
  notes           text DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ========== 9. 수술 이력 (Surgeries) ==========
CREATE TABLE IF NOT EXISTS health_surgeries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  procedure_name text NOT NULL,                  -- 수술명
  date_performed date,
  surgeon       text DEFAULT '',
  hospital      text DEFAULT '',
  notes         text DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ========== RLS — 본인만 접근 ==========
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'health_insurance_cards', 'health_medications', 'health_allergies',
    'health_diagnoses', 'health_doctors', 'health_pharmacies',
    'health_emergency_contacts', 'health_vaccinations', 'health_surgeries'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE USING (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;

-- ========== Indexes ==========
CREATE INDEX IF NOT EXISTS idx_health_meds_user ON health_medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_health_ins_user ON health_insurance_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_health_allergy_user ON health_allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_health_dx_user ON health_diagnoses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_health_doctors_user ON health_doctors(user_id);

-- ========== updated_at trigger ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_ins_updated_at BEFORE UPDATE ON health_insurance_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER health_meds_updated_at BEFORE UPDATE ON health_medications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
