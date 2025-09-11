use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::patient::Patient;
use crate::services::patient_service::PatientService;

#[derive(Deserialize)]
pub struct ListPatientsQuery {
    page: Option<u32>,
    limit: Option<u32>,
    search: Option<String>,
}

#[derive(Serialize)]
pub struct ListPatientsResponse {
    success: bool,
    data: ListPatientsData,
}

#[derive(Serialize)]
pub struct ListPatientsData {
    patients: Vec<Patient>,
    pagination: Pagination,
}

#[derive(Serialize)]
pub struct Pagination {
    page: u32,
    limit: u32,
    total: u64,
    total_pages: u32,
}

pub async fn list_patients(
    State(pool): State<PgPool>,
    Query(query): Query<ListPatientsQuery>,
) -> Result<Json<ListPatientsResponse>, StatusCode> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let search = query.search;

    let patient_service = PatientService::new(pool);
    
    match patient_service.list_patients(page, limit, search).await {
        Ok((patients, total)) => {
            let total_pages = (total as f64 / limit as f64).ceil() as u32;
            
            Ok(Json(ListPatientsResponse {
                success: true,
                data: ListPatientsData {
                    patients,
                    pagination: Pagination {
                        page,
                        limit,
                        total,
                        total_pages,
                    },
                },
            }))
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_patient(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let patient_service = PatientService::new(pool);
    
    match patient_service.get_patient_by_id(id).await {
        Ok(Some(patient)) => Ok(Json(serde_json::json!({
            "success": true,
            "data": patient
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
pub struct CreatePatientRequest {
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub gender: String,
    pub phone_number: Option<String>,
    pub area: Option<String>,
    pub insurance_type: String,
    pub insurance_number: Option<String>,
}

pub async fn create_patient(
    State(pool): State<PgPool>,
    Json(payload): Json<CreatePatientRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let patient_service = PatientService::new(pool);
    
    match patient_service.create_patient(payload).await {
        Ok(patient) => Ok(Json(serde_json::json!({
            "success": true,
            "data": patient
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
pub struct UpdatePatientRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub gender: Option<String>,
    pub phone_number: Option<String>,
    pub area: Option<String>,
    pub insurance_type: Option<String>,
    pub insurance_number: Option<String>,
}

pub async fn update_patient(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePatientRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let patient_service = PatientService::new(pool);
    
    match patient_service.update_patient(id, payload).await {
        Ok(Some(patient)) => Ok(Json(serde_json::json!({
            "success": true,
            "data": patient
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn delete_patient(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let patient_service = PatientService::new(pool);
    
    match patient_service.delete_patient(id).await {
        Ok(true) => Ok(Json(serde_json::json!({
            "success": true,
            "message": "Patient deleted successfully"
        }))),
        Ok(false) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
