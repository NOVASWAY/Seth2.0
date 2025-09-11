use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Patient {
    pub id: Uuid,
    pub op_number: String,
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: Option<NaiveDate>,
    pub age: Option<i32>,
    pub gender: String,
    pub phone_number: Option<String>,
    pub area: Option<String>,
    pub next_of_kin: Option<String>,
    pub next_of_kin_phone: Option<String>,
    pub insurance_type: String,
    pub insurance_number: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Patient {
    pub fn full_name(&self) -> String {
        format!("{} {}", self.first_name, self.last_name)
    }

    pub fn is_sha_insured(&self) -> bool {
        self.insurance_type == "SHA"
    }

    pub fn is_private_insured(&self) -> bool {
        self.insurance_type == "PRIVATE"
    }

    pub fn is_cash_patient(&self) -> bool {
        self.insurance_type == "CASH"
    }
}
