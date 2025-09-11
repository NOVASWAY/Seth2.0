use sqlx::PgPool;
use uuid::Uuid;
use chrono::NaiveDate;

use crate::handlers::patients::{CreatePatientRequest, UpdatePatientRequest};
use crate::models::patient::Patient;

pub struct PatientService {
    pool: PgPool,
}

impl PatientService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_patients(
        &self,
        page: u32,
        limit: u32,
        search: Option<String>,
    ) -> Result<(Vec<Patient>, u64), sqlx::Error> {
        let offset = (page - 1) * limit;
        
        let query = if let Some(search_term) = search {
            sqlx::query_as!(
                Patient,
                r#"
                SELECT 
                    id, op_number, first_name, last_name, date_of_birth, 
                    age, gender, phone_number, area, next_of_kin, 
                    next_of_kin_phone, insurance_type, insurance_number, 
                    created_at, updated_at
                FROM patients 
                WHERE 
                    first_name ILIKE $1 OR 
                    last_name ILIKE $1 OR 
                    op_number ILIKE $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
                format!("%{}%", search_term),
                limit as i64,
                offset as i64
            )
        } else {
            sqlx::query_as!(
                Patient,
                r#"
                SELECT 
                    id, op_number, first_name, last_name, date_of_birth, 
                    age, gender, phone_number, area, next_of_kin, 
                    next_of_kin_phone, insurance_type, insurance_number, 
                    created_at, updated_at
                FROM patients 
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
                limit as i64,
                offset as i64
            )
        };

        let patients = query.fetch_all(&self.pool).await?;

        // Get total count
        let count_query = if let Some(search_term) = search {
            sqlx::query_scalar!(
                r#"
                SELECT COUNT(*) as count
                FROM patients 
                WHERE 
                    first_name ILIKE $1 OR 
                    last_name ILIKE $1 OR 
                    op_number ILIKE $1
                "#,
                format!("%{}%", search_term)
            )
        } else {
            sqlx::query_scalar!("SELECT COUNT(*) as count FROM patients")
        };

        let total: i64 = count_query.fetch_one(&self.pool).await?;

        Ok((patients, total as u64))
    }

    pub async fn get_patient_by_id(&self, id: Uuid) -> Result<Option<Patient>, sqlx::Error> {
        let patient = sqlx::query_as!(
            Patient,
            r#"
            SELECT 
                id, op_number, first_name, last_name, date_of_birth, 
                age, gender, phone_number, area, next_of_kin, 
                next_of_kin_phone, insurance_type, insurance_number, 
                created_at, updated_at
            FROM patients 
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(patient)
    }

    pub async fn create_patient(&self, payload: CreatePatientRequest) -> Result<Patient, sqlx::Error> {
        let id = Uuid::new_v4();
        let op_number = self.generate_op_number().await?;
        
        let patient = sqlx::query_as!(
            Patient,
            r#"
            INSERT INTO patients (
                id, op_number, first_name, last_name, date_of_birth, 
                age, gender, phone_number, area, insurance_type, 
                insurance_number, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING 
                id, op_number, first_name, last_name, date_of_birth, 
                age, gender, phone_number, area, next_of_kin, 
                next_of_kin_phone, insurance_type, insurance_number, 
                created_at, updated_at
            "#,
            id,
            op_number,
            payload.first_name,
            payload.last_name,
            payload.date_of_birth,
            payload.date_of_birth.map(|d| calculate_age(d)),
            payload.gender,
            payload.phone_number,
            payload.area,
            payload.insurance_type,
            payload.insurance_number
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(patient)
    }

    pub async fn update_patient(
        &self,
        id: Uuid,
        payload: UpdatePatientRequest,
    ) -> Result<Option<Patient>, sqlx::Error> {
        let patient = sqlx::query_as!(
            Patient,
            r#"
            UPDATE patients SET
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                date_of_birth = COALESCE($4, date_of_birth),
                age = COALESCE($5, age),
                gender = COALESCE($6, gender),
                phone_number = COALESCE($7, phone_number),
                area = COALESCE($8, area),
                insurance_type = COALESCE($9, insurance_type),
                insurance_number = COALESCE($10, insurance_number),
                updated_at = NOW()
            WHERE id = $1
            RETURNING 
                id, op_number, first_name, last_name, date_of_birth, 
                age, gender, phone_number, area, next_of_kin, 
                next_of_kin_phone, insurance_type, insurance_number, 
                created_at, updated_at
            "#,
            id,
            payload.first_name,
            payload.last_name,
            payload.date_of_birth,
            payload.date_of_birth.map(|d| calculate_age(d)),
            payload.gender,
            payload.phone_number,
            payload.area,
            payload.insurance_type,
            payload.insurance_number
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(patient)
    }

    pub async fn delete_patient(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!(
            "DELETE FROM patients WHERE id = $1",
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    async fn generate_op_number(&self) -> Result<String, sqlx::Error> {
        let count: i64 = sqlx::query_scalar!(
            "SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = CURRENT_DATE"
        )
        .fetch_one(&self.pool)
        .await?;

        let today = chrono::Utc::now().format("%Y%m%d");
        let op_number = format!("{}{:04}", today, count + 1);
        
        Ok(op_number)
    }
}

fn calculate_age(date_of_birth: NaiveDate) -> i32 {
    let today = chrono::Utc::now().date_naive();
    today.years_since(date_of_birth).unwrap_or(0) as i32
}
