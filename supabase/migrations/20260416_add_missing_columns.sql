-- 누락된 컬럼 추가 (이미 존재하면 무시)

-- 보험증
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS plan_name text DEFAULT '';
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS member_id text DEFAULT '';
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS group_number text DEFAULT '';
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS policy_holder text DEFAULT '';
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS effective_date date;
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS front_image_url text;
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS back_image_url text;
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
ALTER TABLE health_insurance_cards ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 복용 약
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS dosage text DEFAULT '';
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS frequency text DEFAULT '';
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS route text DEFAULT '';
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS purpose text DEFAULT '';
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS prescriber text DEFAULT '';
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS pharmacy text DEFAULT '';
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS refill_date date;
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE health_medications ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 알레르기
ALTER TABLE health_allergies ADD COLUMN IF NOT EXISTS type text DEFAULT 'drug';
ALTER TABLE health_allergies ADD COLUMN IF NOT EXISTS reaction text DEFAULT '';
ALTER TABLE health_allergies ADD COLUMN IF NOT EXISTS severity text DEFAULT 'mild';
ALTER TABLE health_allergies ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 진단명
ALTER TABLE health_diagnoses ADD COLUMN IF NOT EXISTS icd_code text DEFAULT '';
ALTER TABLE health_diagnoses ADD COLUMN IF NOT EXISTS diagnosed_date date;
ALTER TABLE health_diagnoses ADD COLUMN IF NOT EXISTS diagnosing_doctor text DEFAULT '';
ALTER TABLE health_diagnoses ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE health_diagnoses ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 의사
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS specialty text DEFAULT '';
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS clinic_name text DEFAULT '';
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS fax text DEFAULT '';
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS is_pcp boolean DEFAULT false;
ALTER TABLE health_doctors ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 약국
ALTER TABLE health_pharmacies ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE health_pharmacies ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE health_pharmacies ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
ALTER TABLE health_pharmacies ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 비상 연락처
ALTER TABLE health_emergency_contacts ADD COLUMN IF NOT EXISTS relationship text DEFAULT '';
ALTER TABLE health_emergency_contacts ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE health_emergency_contacts ADD COLUMN IF NOT EXISTS phone2 text DEFAULT '';
ALTER TABLE health_emergency_contacts ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
ALTER TABLE health_emergency_contacts ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 예방접종
ALTER TABLE health_vaccinations ADD COLUMN IF NOT EXISTS dose_number int DEFAULT 1;
ALTER TABLE health_vaccinations ADD COLUMN IF NOT EXISTS date_given date;
ALTER TABLE health_vaccinations ADD COLUMN IF NOT EXISTS administered_by text DEFAULT '';
ALTER TABLE health_vaccinations ADD COLUMN IF NOT EXISTS location text DEFAULT '';
ALTER TABLE health_vaccinations ADD COLUMN IF NOT EXISTS next_due_date date;
ALTER TABLE health_vaccinations ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- 수술 이력
ALTER TABLE health_surgeries ADD COLUMN IF NOT EXISTS date_performed date;
ALTER TABLE health_surgeries ADD COLUMN IF NOT EXISTS surgeon text DEFAULT '';
ALTER TABLE health_surgeries ADD COLUMN IF NOT EXISTS hospital text DEFAULT '';
ALTER TABLE health_surgeries ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Supabase 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
