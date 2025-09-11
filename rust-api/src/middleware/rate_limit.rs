use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use governor::{
    clock::DefaultClock,
    state::keyed::DefaultKeyedStateStore,
    Quota, RateLimiter,
};
use std::{
    num::NonZeroU32,
    sync::Arc,
    time::Duration,
};
use tower::ServiceBuilder;

// Create rate limiter: 1000 requests per 15 minutes per IP
pub fn create_rate_limiter() -> Arc<RateLimiter<String, DefaultKeyedStateStore<String>, DefaultClock>> {
    let quota = Quota::per(Duration::from_secs(15 * 60))
        .allow_burst(NonZeroU32::new(1000).unwrap());
    
    Arc::new(RateLimiter::keyed(quota))
}

pub async fn rate_limit_middleware(
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract IP address from request
    let ip = request
        .headers()
        .get("x-forwarded-for")
        .or_else(|| request.headers().get("x-real-ip"))
        .and_then(|header| header.to_str().ok())
        .unwrap_or("unknown");

    // Get rate limiter from extensions (would be set by ServiceBuilder)
    let rate_limiter = request
        .extensions()
        .get::<Arc<RateLimiter<String, DefaultKeyedStateStore<String>, DefaultClock>>>()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    // Check rate limit
    if rate_limiter.check_key(&ip.to_string()).is_err() {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    // Continue to next middleware
    Ok(next.run(request).await)
}
