use axum::{
    extract::Request,
    http::Method,
    middleware,
    response::Json,
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    compression::CompressionLayer,
};
use tracing::{info, Level};
use tracing_subscriber;

mod config;
mod database;
mod handlers;
mod middleware as custom_middleware;
mod models;
mod services;
mod utils;

use config::Config;
use database::Database;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    // Load configuration
    let config = Config::load()?;
    
    // Initialize database
    let db = Database::new(&config.database_url).await?;
    
    // Run migrations
    db.migrate().await?;

    // Build application
    let app = build_app(db, config).await?;

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));
    info!("🚀 Seth Clinic Rust API running on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

async fn build_app(db: Database, config: Config) -> Result<Router, Box<dyn std::error::Error>> {
    // CORS configuration
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::PATCH])
        .allow_headers(Any)
        .allow_origin(Any);

    // Build router
    let app = Router::new()
        // Health check
        .route("/health", get(health_check))
        
        // API routes
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/refresh", post(handlers::auth::refresh))
        .route("/api/auth/logout", post(handlers::auth::logout))
        
        // Patient routes
        .route("/api/patients", get(handlers::patients::list_patients))
        .route("/api/patients", post(handlers::patients::create_patient))
        .route("/api/patients/:id", get(handlers::patients::get_patient))
        .route("/api/patients/:id", put(handlers::patients::update_patient))
        .route("/api/patients/:id", delete(handlers::patients::delete_patient))
        
        // Visit routes
        .route("/api/visits", get(handlers::visits::list_visits))
        .route("/api/visits", post(handlers::visits::create_visit))
        .route("/api/visits/:id", get(handlers::visits::get_visit))
        .route("/api/visits/:id", put(handlers::visits::update_visit))
        
        // Financial routes
        .route("/api/financial/payments", post(handlers::financial::create_payment))
        .route("/api/financial/invoices", post(handlers::financial::create_invoice))
        .route("/api/financial/reports", get(handlers::financial::get_reports))
        
        // SHA routes
        .route("/api/sha/claims", post(handlers::sha::create_claim))
        .route("/api/sha/claims", get(handlers::sha::list_claims))
        .route("/api/sha/claims/:id", get(handlers::sha::get_claim))
        
        // Apply middleware
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new())
                .layer(cors)
                .layer(middleware::from_fn(custom_middleware::auth::auth_middleware))
                .layer(middleware::from_fn(custom_middleware::rate_limit::rate_limit_middleware))
        )
        .with_state(db);

    Ok(app)
}

async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "OK",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "uptime": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        "environment": std::env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string()),
        "version": "1.0.0"
    }))
}
