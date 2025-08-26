"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalDataSeeder = void 0;
const database_1 = require("../config/database");
const crypto_1 = __importDefault(require("crypto"));
class ClinicalDataSeeder {
    async seedAll() {
        console.log("🌱 Starting clinical data seeding...");
        try {
            await this.seedDiagnosisCodes();
            await this.seedMedications();
            await this.seedLabTests();
            await this.seedProcedures();
            await this.seedSymptoms();
            console.log("✅ Clinical data seeding completed successfully!");
        }
        catch (error) {
            console.error("❌ Error seeding clinical data:", error);
            throw error;
        }
    }
    async seedDiagnosisCodes() {
        console.log("📋 Seeding diagnosis codes...");
        const diagnosisCodes = [
            { code: "J00", description: "Acute nasopharyngitis [common cold]", category: "Respiratory", search_keywords: ["cold", "runny nose", "nasal congestion"] },
            { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Respiratory", search_keywords: ["upper respiratory", "uri", "throat infection"] },
            { code: "A09", description: "Diarrhoea and gastroenteritis of presumed infectious origin", category: "Digestive", search_keywords: ["diarrhea", "stomach", "gastro", "loose stool"] },
            { code: "K59.1", description: "Diarrhoea, unspecified", category: "Digestive", search_keywords: ["diarrhea", "loose stool", "frequent stool"] },
            { code: "R50.9", description: "Fever, unspecified", category: "Symptoms", search_keywords: ["fever", "high temperature", "pyrexia"] },
            { code: "M79.3", description: "Panniculitis, unspecified", category: "Musculoskeletal", search_keywords: ["muscle pain", "body aches"] },
            { code: "R51", description: "Headache", category: "Neurological", search_keywords: ["headache", "head pain", "cephalgia"] },
            { code: "I10", description: "Essential (primary) hypertension", category: "Cardiovascular", search_keywords: ["high blood pressure", "hypertension", "bp"] },
            { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine", search_keywords: ["diabetes", "blood sugar", "glucose"] },
            { code: "Z00.00", description: "General adult medical examination without abnormal findings", category: "Health Status", search_keywords: ["checkup", "physical exam", "general exam"] },
            { code: "Z34.90", description: "Encounter for supervision of normal pregnancy, unspecified trimester", category: "Pregnancy", search_keywords: ["pregnancy", "antenatal", "prenatal"] },
            { code: "O80", description: "Encounter for full-term uncomplicated delivery", category: "Pregnancy", search_keywords: ["delivery", "labor", "birth"] },
            { code: "Z39.1", description: "Encounter for care and examination of lactating mother", category: "Pregnancy", search_keywords: ["breastfeeding", "lactation", "postnatal"] },
            { code: "J20.9", description: "Acute bronchitis, unspecified", category: "Respiratory", search_keywords: ["bronchitis", "chest infection", "cough"] },
            { code: "B34.9", description: "Viral infection, unspecified", category: "Infectious", search_keywords: ["viral", "virus", "viral illness"] },
            { code: "A04.9", description: "Bacterial intestinal infection, unspecified", category: "Infectious", search_keywords: ["bacterial infection", "food poisoning"] },
            { code: "F32.9", description: "Major depressive disorder, single episode, unspecified", category: "Mental Health", search_keywords: ["depression", "mood", "sadness"] },
            { code: "F41.9", description: "Anxiety disorder, unspecified", category: "Mental Health", search_keywords: ["anxiety", "panic", "worry"] },
            { code: "S61.9", description: "Open wound of wrist, hand and fingers, unspecified", category: "Injury", search_keywords: ["cut", "wound", "hand injury"] },
            { code: "S72.9", description: "Fracture of femur, unspecified", category: "Injury", search_keywords: ["fracture", "broken bone", "femur"] },
            { code: "L20.9", description: "Atopic dermatitis, unspecified", category: "Skin", search_keywords: ["eczema", "dermatitis", "skin rash"] },
            { code: "L70.0", description: "Acne vulgaris", category: "Skin", search_keywords: ["acne", "pimples", "skin"] }
        ];
        for (const diagnosis of diagnosisCodes) {
            await database_1.pool.query(`
        INSERT INTO clinical_diagnosis_codes (
          id, code, description, category, sub_category, search_keywords, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO NOTHING
      `, [
                crypto_1.default.randomUUID(),
                diagnosis.code,
                diagnosis.description,
                diagnosis.category,
                diagnosis.sub_category,
                diagnosis.search_keywords,
                new Date(),
                new Date()
            ]);
        }
        console.log(`✅ Seeded ${diagnosisCodes.length} diagnosis codes`);
    }
    async seedMedications() {
        console.log("💊 Seeding medications...");
        const medications = [
            {
                generic_name: "Paracetamol",
                brand_names: ["Panadol", "Tylenol", "Calpol"],
                medication_code: "PAR500",
                dosage_forms: ["tablet", "syrup", "suppository"],
                strengths: ["500mg", "120mg/5ml", "250mg"],
                drug_class: "Analgesics",
                therapeutic_category: "Pain Relief",
                route_of_administration: ["oral", "rectal"],
                average_adult_dose: "500mg-1g every 4-6 hours",
                pediatric_dose: "10-15mg/kg every 4-6 hours",
                contraindications: "Severe liver impairment",
                side_effects: "Rare at therapeutic doses",
                pregnancy_category: "A",
                search_keywords: ["paracetamol", "panadol", "fever", "pain", "headache"]
            },
            {
                generic_name: "Ibuprofen",
                brand_names: ["Brufen", "Advil", "Nurofen"],
                medication_code: "IBU400",
                dosage_forms: ["tablet", "syrup", "gel"],
                strengths: ["400mg", "100mg/5ml", "5%"],
                drug_class: "NSAIDs",
                therapeutic_category: "Anti-inflammatory",
                route_of_administration: ["oral", "topical"],
                average_adult_dose: "400mg every 6-8 hours",
                pediatric_dose: "5-10mg/kg every 6-8 hours",
                contraindications: "Active peptic ulcer, severe heart failure",
                side_effects: "GI upset, dizziness",
                pregnancy_category: "C",
                search_keywords: ["ibuprofen", "brufen", "inflammation", "pain", "fever"]
            },
            {
                generic_name: "Amoxicillin",
                brand_names: ["Amoxil", "Flemoxin"],
                medication_code: "AMX500",
                dosage_forms: ["capsule", "syrup", "injection"],
                strengths: ["500mg", "125mg/5ml", "1g"],
                drug_class: "Penicillins",
                therapeutic_category: "Antibiotics",
                route_of_administration: ["oral", "IV"],
                average_adult_dose: "500mg every 8 hours",
                pediatric_dose: "20-40mg/kg/day in divided doses",
                contraindications: "Penicillin allergy",
                side_effects: "Nausea, diarrhea, rash",
                pregnancy_category: "B",
                search_keywords: ["amoxicillin", "antibiotic", "infection", "bacterial"]
            },
            {
                generic_name: "Metformin",
                brand_names: ["Glucophage", "Diabex"],
                medication_code: "MET500",
                dosage_forms: ["tablet", "extended-release tablet"],
                strengths: ["500mg", "850mg", "1000mg"],
                drug_class: "Biguanides",
                therapeutic_category: "Antidiabetic",
                route_of_administration: ["oral"],
                average_adult_dose: "500mg twice daily with meals",
                contraindications: "Severe kidney disease, metabolic acidosis",
                side_effects: "GI upset, lactic acidosis (rare)",
                pregnancy_category: "B",
                search_keywords: ["metformin", "diabetes", "blood sugar", "glucose"]
            },
            {
                generic_name: "Amlodipine",
                brand_names: ["Norvasc", "Amlocard"],
                medication_code: "AML5",
                dosage_forms: ["tablet"],
                strengths: ["5mg", "10mg"],
                drug_class: "Calcium Channel Blockers",
                therapeutic_category: "Antihypertensive",
                route_of_administration: ["oral"],
                average_adult_dose: "5mg once daily",
                contraindications: "Cardiogenic shock",
                side_effects: "Ankle swelling, flushing",
                pregnancy_category: "C",
                search_keywords: ["amlodipine", "blood pressure", "hypertension"]
            },
            {
                generic_name: "Omeprazole",
                brand_names: ["Losec", "Prilosec"],
                medication_code: "OME20",
                dosage_forms: ["capsule", "injection"],
                strengths: ["20mg", "40mg"],
                drug_class: "Proton Pump Inhibitors",
                therapeutic_category: "Gastric Acid Suppressants",
                route_of_administration: ["oral", "IV"],
                average_adult_dose: "20mg once daily",
                contraindications: "Hypersensitivity to omeprazole",
                side_effects: "Headache, nausea, abdominal pain",
                pregnancy_category: "C",
                search_keywords: ["omeprazole", "acid", "stomach", "ulcer", "reflux"]
            }
        ];
        for (const medication of medications) {
            await database_1.pool.query(`
        INSERT INTO clinical_medications (
          id, generic_name, brand_names, medication_code, dosage_forms, strengths,
          drug_class, therapeutic_category, route_of_administration, average_adult_dose,
          pediatric_dose, contraindications, side_effects, pregnancy_category,
          is_controlled_substance, search_keywords, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (generic_name) DO NOTHING
      `, [
                crypto_1.default.randomUUID(),
                medication.generic_name,
                medication.brand_names,
                medication.medication_code,
                medication.dosage_forms,
                medication.strengths,
                medication.drug_class,
                medication.therapeutic_category,
                medication.route_of_administration,
                medication.average_adult_dose,
                medication.pediatric_dose,
                medication.contraindications,
                medication.side_effects,
                medication.pregnancy_category,
                medication.is_controlled_substance || false,
                medication.search_keywords,
                new Date(),
                new Date()
            ]);
        }
        console.log(`✅ Seeded ${medications.length} medications`);
    }
    async seedLabTests() {
        console.log("🧪 Seeding lab tests...");
        const labTests = [
            {
                test_code: "CBC",
                test_name: "Complete Blood Count",
                test_category: "Hematology",
                test_sub_category: "Basic",
                specimen_type: "Blood",
                specimen_volume: "3ml EDTA",
                fasting_required: false,
                normal_range_male: "Hb: 13.5-17.5 g/dL, WBC: 4-11×10³/μL",
                normal_range_female: "Hb: 12.0-15.5 g/dL, WBC: 4-11×10³/μL",
                normal_range_pediatric: "Age-dependent ranges",
                units: "g/dL, ×10³/μL",
                turnaround_time_hours: 2,
                price: 800,
                clinical_significance: "Diagnose anemia, infection, bleeding disorders",
                search_keywords: ["blood count", "hemoglobin", "white blood cells", "anemia"]
            },
            {
                test_code: "FBS",
                test_name: "Fasting Blood Sugar",
                test_category: "Biochemistry",
                test_sub_category: "Glucose",
                specimen_type: "Blood",
                specimen_volume: "2ml fluoride",
                fasting_required: true,
                normal_range_male: "70-100 mg/dL",
                normal_range_female: "70-100 mg/dL",
                normal_range_pediatric: "70-100 mg/dL",
                units: "mg/dL",
                turnaround_time_hours: 1,
                price: 300,
                clinical_significance: "Diagnose and monitor diabetes",
                preparation_instructions: "Fast for 8-12 hours",
                search_keywords: ["blood sugar", "glucose", "diabetes", "fasting"]
            },
            {
                test_code: "LFT",
                test_name: "Liver Function Tests",
                test_category: "Biochemistry",
                test_sub_category: "Liver",
                specimen_type: "Blood",
                specimen_volume: "3ml plain",
                fasting_required: false,
                normal_range_male: "ALT: 7-56 U/L, AST: 10-40 U/L",
                normal_range_female: "ALT: 7-56 U/L, AST: 10-40 U/L",
                units: "U/L, mg/dL",
                turnaround_time_hours: 4,
                price: 1200,
                clinical_significance: "Assess liver function and damage",
                search_keywords: ["liver", "hepatic", "bilirubin", "enzymes"]
            },
            {
                test_code: "KFT",
                test_name: "Kidney Function Tests",
                test_category: "Biochemistry",
                test_sub_category: "Renal",
                specimen_type: "Blood",
                specimen_volume: "3ml plain",
                fasting_required: false,
                normal_range_male: "Creatinine: 0.7-1.3 mg/dL, BUN: 8-20 mg/dL",
                normal_range_female: "Creatinine: 0.6-1.1 mg/dL, BUN: 8-20 mg/dL",
                units: "mg/dL",
                turnaround_time_hours: 4,
                price: 1000,
                clinical_significance: "Assess kidney function",
                search_keywords: ["kidney", "renal", "creatinine", "urea"]
            },
            {
                test_code: "URINE",
                test_name: "Complete Urine Analysis",
                test_category: "Clinical Pathology",
                test_sub_category: "Urine",
                specimen_type: "Urine",
                specimen_volume: "20ml midstream",
                fasting_required: false,
                normal_range_male: "No abnormal findings",
                normal_range_female: "No abnormal findings",
                turnaround_time_hours: 2,
                price: 500,
                clinical_significance: "Detect UTI, kidney disease, diabetes",
                preparation_instructions: "Collect midstream sample",
                search_keywords: ["urine", "urinalysis", "infection", "uti"]
            },
            {
                test_code: "MALARIA",
                test_name: "Malaria Rapid Test",
                test_category: "Microbiology",
                test_sub_category: "Parasitology",
                specimen_type: "Blood",
                specimen_volume: "1ml EDTA",
                fasting_required: false,
                turnaround_time_hours: 1,
                price: 400,
                clinical_significance: "Diagnose malaria infection",
                search_keywords: ["malaria", "fever", "parasite", "rapid test"]
            }
        ];
        for (const test of labTests) {
            await database_1.pool.query(`
        INSERT INTO clinical_lab_test_catalog (
          id, test_code, test_name, test_category, test_sub_category, specimen_type,
          specimen_volume, fasting_required, normal_range_male, normal_range_female,
          normal_range_pediatric, units, turnaround_time_hours, price,
          clinical_significance, preparation_instructions, search_keywords,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (test_code) DO NOTHING
      `, [
                crypto_1.default.randomUUID(),
                test.test_code,
                test.test_name,
                test.test_category,
                test.test_sub_category,
                test.specimen_type,
                test.specimen_volume,
                test.fasting_required,
                test.normal_range_male,
                test.normal_range_female,
                test.normal_range_pediatric,
                test.units,
                test.turnaround_time_hours,
                test.price,
                test.clinical_significance,
                test.preparation_instructions,
                test.search_keywords,
                new Date(),
                new Date()
            ]);
        }
        console.log(`✅ Seeded ${labTests.length} lab tests`);
    }
    async seedProcedures() {
        console.log("🏥 Seeding procedures...");
        const procedures = [
            {
                procedure_code: "WOUND_DRESSING",
                procedure_name: "Wound Cleaning and Dressing",
                procedure_category: "Minor Surgery",
                procedure_type: "Therapeutic",
                description: "Cleaning and dressing of minor wounds",
                duration_minutes: 15,
                anesthesia_required: false,
                consent_required: false,
                preparation_instructions: "Clean the wound area",
                post_procedure_care: "Keep dry, change dressing daily",
                price: 2000,
                facility_level_required: "Level1",
                search_keywords: ["wound", "dressing", "cleaning", "cut"]
            },
            {
                procedure_code: "SUTURING",
                procedure_name: "Simple Suturing",
                procedure_category: "Minor Surgery",
                procedure_type: "Surgical",
                description: "Simple closure of lacerations",
                duration_minutes: 30,
                anesthesia_required: true,
                consent_required: true,
                preparation_instructions: "Local anesthesia, sterile field",
                post_procedure_care: "Keep dry, remove sutures in 7-10 days",
                price: 5000,
                facility_level_required: "Level2",
                search_keywords: ["suture", "stitches", "laceration", "cut"]
            },
            {
                procedure_code: "BP_CHECK",
                procedure_name: "Blood Pressure Measurement",
                procedure_category: "Vital Signs",
                procedure_type: "Diagnostic",
                description: "Non-invasive blood pressure measurement",
                duration_minutes: 5,
                anesthesia_required: false,
                consent_required: false,
                price: 200,
                facility_level_required: "Level1",
                search_keywords: ["blood pressure", "bp", "vital signs", "hypertension"]
            },
            {
                procedure_code: "ECG",
                procedure_name: "Electrocardiogram",
                procedure_category: "Cardiology",
                procedure_type: "Diagnostic",
                description: "12-lead ECG recording",
                duration_minutes: 10,
                anesthesia_required: false,
                consent_required: false,
                preparation_instructions: "Remove jewelry, expose chest",
                price: 1500,
                facility_level_required: "Level2",
                search_keywords: ["ecg", "ekg", "heart", "cardiac"]
            }
        ];
        for (const procedure of procedures) {
            await database_1.pool.query(`
        INSERT INTO clinical_procedures (
          id, procedure_code, procedure_name, procedure_category, procedure_type,
          description, duration_minutes, anesthesia_required, consent_required,
          preparation_instructions, post_procedure_care, price, facility_level_required,
          search_keywords, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (procedure_code) DO NOTHING
      `, [
                crypto_1.default.randomUUID(),
                procedure.procedure_code,
                procedure.procedure_name,
                procedure.procedure_category,
                procedure.procedure_type,
                procedure.description,
                procedure.duration_minutes,
                procedure.anesthesia_required,
                procedure.consent_required,
                procedure.preparation_instructions,
                procedure.post_procedure_care,
                procedure.price,
                procedure.facility_level_required,
                procedure.search_keywords,
                new Date(),
                new Date()
            ]);
        }
        console.log(`✅ Seeded ${procedures.length} procedures`);
    }
    async seedSymptoms() {
        console.log("🤒 Seeding symptoms...");
        const symptoms = [
            { name: "Fever", body_system: "General", search_keywords: ["fever", "high temperature", "pyrexia"] },
            { name: "Cough", body_system: "Respiratory", search_keywords: ["cough", "dry cough", "productive cough"] },
            { name: "Headache", body_system: "Neurological", search_keywords: ["headache", "head pain", "migraine"] },
            { name: "Nausea", body_system: "Digestive", search_keywords: ["nausea", "feeling sick", "queasy"] },
            { name: "Vomiting", body_system: "Digestive", search_keywords: ["vomiting", "throwing up", "emesis"] },
            { name: "Diarrhea", body_system: "Digestive", search_keywords: ["diarrhea", "loose stool", "frequent stool"] },
            { name: "Abdominal Pain", body_system: "Digestive", search_keywords: ["stomach pain", "belly ache", "abdominal pain"] },
            { name: "Chest Pain", body_system: "Cardiovascular", search_keywords: ["chest pain", "heart pain", "angina"] },
            { name: "Shortness of Breath", body_system: "Respiratory", search_keywords: ["breathless", "dyspnea", "difficulty breathing"] },
            { name: "Fatigue", body_system: "General", search_keywords: ["tired", "weakness", "fatigue", "exhausted"] }
        ];
        for (const symptom of symptoms) {
            await database_1.pool.query(`
        INSERT INTO clinical_symptoms (
          id, symptom_name, body_system, search_keywords, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (symptom_name) DO NOTHING
      `, [
                crypto_1.default.randomUUID(),
                symptom.name,
                symptom.body_system,
                symptom.search_keywords,
                new Date(),
                new Date()
            ]);
        }
        console.log(`✅ Seeded ${symptoms.length} symptoms`);
    }
}
exports.ClinicalDataSeeder = ClinicalDataSeeder;
if (require.main === module) {
    const seeder = new ClinicalDataSeeder();
    seeder.seedAll()
        .then(() => {
        console.log("🎉 Clinical data seeding completed!");
        process.exit(0);
    })
        .catch((error) => {
        console.error("💥 Seeding failed:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=seedClinicalData.js.map