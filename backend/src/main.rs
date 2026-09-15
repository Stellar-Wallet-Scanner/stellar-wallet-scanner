use axum::{
    extract::{Path, State},
    http::{HeaderValue, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use dotenvy::dotenv;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tower_http::cors::CorsLayer;

const TESTNET_NAME: &str = "Stellar Testnet";
const EXISTING_WALLET_COOLDOWN_SECONDS: u64 = 24 * 60 * 60;
const FRIENDBOT_ACCOUNT_LIMIT_XLM: f64 = 10_000.0;

#[derive(Clone)]
struct AppState {
    client: Client,
    horizon_url: String,
    friendbot_url: String,
    auto_fund_below_xlm: f64,
    max_fund_requests_per_hour: usize,
    fund_request_times: Arc<Mutex<Vec<Instant>>>,
    address_funding_times: Arc<Mutex<HashMap<String, Instant>>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: String,
    network: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WalletResponse {
    address: String,
    exists: bool,
    xlm_balance: f64,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FundResponse {
    address: String,
    funded: bool,
    funded_amount_xlm: f64,
    balance_before: f64,
    balance_after: f64,
    cooldown_seconds_remaining: u64,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanResponse {
    address: String,
    address_type: String,
    network: String,
    xlm_balance: f64,
    funded_amount_xlm: f64,
    auto_funded: bool,
    security_score: u8,
    risk_level: String,
    signer_count: usize,
    findings: Vec<SecurityFinding>,
    assets: Vec<WalletAsset>,
    funding_cooldown_seconds: u64,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WalletAsset {
    asset_type: String,
    asset_code: String,
    issuer: Option<String>,
    balance: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SecurityFinding {
    severity: String,
    title: String,
    description: String,
}

#[derive(Deserialize)]
struct HorizonAccount {
    balances: Vec<HorizonBalance>,
    signers: Vec<HorizonSigner>,
    thresholds: HorizonThresholds,
}

#[derive(Deserialize)]
struct HorizonBalance {
    asset_type: String,
    balance: String,

    #[serde(default)]
    asset_code: Option<String>,

    #[serde(default)]
    asset_issuer: Option<String>,
}

#[derive(Deserialize)]
struct HorizonSigner {
    key: String,

    #[serde(rename = "type")]
    signer_type: String,

    weight: u32,
}

#[derive(Deserialize)]
struct HorizonThresholds {
    low_threshold: u32,
    med_threshold: u32,
    high_threshold: u32,
}

#[derive(Debug)]
struct SecurityAnalysis {
    score: u8,
    risk_level: String,
    signer_count: usize,
    findings: Vec<SecurityFinding>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let horizon_url = env::var("HORIZON_URL")
        .expect("HORIZON_URL is missing from backend/.env");

    let friendbot_url = env::var("FRIENDBOT_URL")
        .expect("FRIENDBOT_URL is missing from backend/.env");

    let auto_fund_below_xlm = env::var("AUTO_FUND_BELOW_XLM")
        .unwrap_or_else(|_| "0".to_string())
        .parse::<f64>()
        .expect("AUTO_FUND_BELOW_XLM must be a valid number");

    let host =
        env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("PORT must be a valid number");

    let frontend_origin = env::var("FRONTEND_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    let max_fund_requests_per_hour =
        env::var("MAX_FUND_REQUESTS_PER_HOUR")
            .unwrap_or_else(|_| "20".to_string())
            .parse::<usize>()
            .expect(
                "MAX_FUND_REQUESTS_PER_HOUR must be a positive integer",
            );

    if max_fund_requests_per_hour == 0 {
        panic!("MAX_FUND_REQUESTS_PER_HOUR must be greater than 0");
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client");

    let state = AppState {
        client,
        horizon_url,
        friendbot_url,
        auto_fund_below_xlm,
        max_fund_requests_per_hour,
        fund_request_times: Arc::new(Mutex::new(Vec::new())),
        address_funding_times: Arc::new(Mutex::new(HashMap::new())),
    };

    let allowed_origin: HeaderValue = frontend_origin
        .parse()
        .expect("FRONTEND_ORIGIN is not a valid origin");

    let cors = CorsLayer::new()
        .allow_origin(allowed_origin)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::OPTIONS,
        ])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/health", get(health_check))
        .route(
            "/api/wallet/check/{address}",
            get(check_wallet),
        )
        .route(
            "/api/wallet/fund/{address}",
            post(fund_wallet),
        )
        .route(
            "/api/wallet/scan/{address}",
            post(scan_wallet),
        )
        .layer(cors)
        .with_state(state);

    let socket: SocketAddr =
        format!("{}:{}", host, port)
            .parse()
            .expect("Invalid HOST or PORT");

    println!(
        "Stellar Wallet Scanner backend running on http://{}",
        socket
    );

    println!("Network: {}", TESTNET_NAME);

    println!(
        "Frontend origin allowed: {}",
        frontend_origin
    );

    println!(
        "Max Testnet funding requests per hour: {}",
        max_fund_requests_per_hour
    );

    println!(
        "Existing-wallet funding cooldown: 24 hours"
    );

    let listener = tokio::net::TcpListener::bind(socket)
        .await
        .expect("Failed to bind server");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        network: TESTNET_NAME.to_string(),
    })
}

async fn check_wallet(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> impl IntoResponse {
    if !is_valid_stellar_account(&address) {
        return (
            StatusCode::BAD_REQUEST,
            Json(WalletResponse {
                address,
                exists: false,
                xlm_balance: 0.0,
                message:
                    "Invalid Stellar Testnet account address."
                        .to_string(),
            }),
        );
    }

    match get_account(&state, &address).await {
        Ok(account) => (
            StatusCode::OK,
            Json(WalletResponse {
                address,
                exists: true,
                xlm_balance: native_balance(&account),
                message:
                    "Stellar Testnet wallet found."
                        .to_string(),
            }),
        ),

        Err(error) => (
            StatusCode::NOT_FOUND,
            Json(WalletResponse {
                address,
                exists: false,
                xlm_balance: 0.0,
                message: error,
            }),
        ),
    }
}

async fn fund_wallet(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> impl IntoResponse {
    if !is_valid_stellar_account(&address) {
        return (
            StatusCode::BAD_REQUEST,
            Json(FundResponse {
                address,
                funded: false,
                funded_amount_xlm: 0.0,
                balance_before: 0.0,
                balance_after: 0.0,
                cooldown_seconds_remaining: 0,
                message:
                    "Invalid Stellar Testnet account address."
                        .to_string(),
            }),
        );
    }

    let cooldown =
        match funding_cooldown_remaining(
            &state,
            &address,
        ) {
            Ok(value) => value,

            Err(error) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(FundResponse {
                        address,
                        funded: false,
                        funded_amount_xlm: 0.0,
                        balance_before: 0.0,
                        balance_after: 0.0,
                        cooldown_seconds_remaining: 0,
                        message: error,
                    }),
                );
            }
        };

    let balance_before =
        match get_account(&state, &address).await {
            Ok(account) =>
                native_balance(&account),

            Err(_) => 0.0,
        };

    if cooldown > 0 {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(FundResponse {
                address,
                funded: false,
                funded_amount_xlm: 0.0,
                balance_before,
                balance_after: balance_before,
                cooldown_seconds_remaining: cooldown,
                message: format!(
                    "This wallet can request Testnet funds again in {}.",
                    format_duration(cooldown)
                ),
            }),
        );
    }

    if balance_before >= FRIENDBOT_ACCOUNT_LIMIT_XLM {
        return (
            StatusCode::OK,
            Json(FundResponse {
                address,
                funded: false,
                funded_amount_xlm: 0.0,
                balance_before,
                balance_after: balance_before,
                cooldown_seconds_remaining: 0,
                message:
                    "Friendbot funding is intended for Testnet accounts below the starting-balance limit."
                        .to_string(),
            }),
        );
    }

    match request_friendbot(&state, &address).await {
        Ok(()) => {
            if let Err(error) =
                mark_address_funding_request(
                    &state,
                    &address,
                )
            {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(FundResponse {
                        address,
                        funded: false,
                        funded_amount_xlm: 0.0,
                        balance_before,
                        balance_after: balance_before,
                        cooldown_seconds_remaining: 0,
                        message: error,
                    }),
                );
            }

            match wait_for_balance_increase(
                &state,
                &address,
                balance_before,
            )
            .await
            {
                Ok(account) => {
                    let balance_after =
                        native_balance(&account);

                    let funded_amount =
                        (balance_after - balance_before)
                            .max(0.0);

                    (
                        StatusCode::OK,
                        Json(FundResponse {
                            address,
                            funded: funded_amount > 0.0,
                            funded_amount_xlm:
                                funded_amount,
                            balance_before,
                            balance_after,
                            cooldown_seconds_remaining:
                                EXISTING_WALLET_COOLDOWN_SECONDS,
                            message:
                                if funded_amount > 0.0 {
                                    format!(
                                        "Wallet received {:.7} XLM from Stellar Testnet Friendbot.",
                                        funded_amount
                                    )
                                } else {
                                    "Friendbot completed the request, but no balance increase was confirmed yet."
                                        .to_string()
                                },
                        }),
                    )
                }

                Err(error) => (
                    StatusCode::BAD_GATEWAY,
                    Json(FundResponse {
                        address,
                        funded: false,
                        funded_amount_xlm: 0.0,
                        balance_before,
                        balance_after: balance_before,
                        cooldown_seconds_remaining:
                            EXISTING_WALLET_COOLDOWN_SECONDS,
                        message: error,
                    }),
                ),
            }
        }

        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(FundResponse {
                address,
                funded: false,
                funded_amount_xlm: 0.0,
                balance_before,
                balance_after: balance_before,
                cooldown_seconds_remaining:
                    EXISTING_WALLET_COOLDOWN_SECONDS,
                message: error,
            }),
        ),
    }
}

async fn scan_wallet(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> impl IntoResponse {
    if !is_valid_stellar_account(&address) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ScanResponse {
                address,
                address_type: "Unknown".to_string(),
                network: TESTNET_NAME.to_string(),
                xlm_balance: 0.0,
                funded_amount_xlm: 0.0,
                auto_funded: false,
                security_score: 0,
                risk_level: "Invalid".to_string(),
                signer_count: 0,
                findings: vec![],
                assets: vec![],
                funding_cooldown_seconds: 0,
                message:
                    "Invalid Stellar Testnet account address."
                        .to_string(),
            }),
        );
    }

    let mut auto_funded = false;

    let mut balance_before_funding = 0.0;

    let mut account =
        match get_account(&state, &address).await {
            Ok(account) => {
                balance_before_funding =
                    native_balance(&account);

                account
            }

            Err(_) => {
                match request_friendbot(
                    &state,
                    &address,
                )
                .await
                {
                    Ok(()) => {
                        auto_funded = true;

                        match wait_for_account(
                            &state,
                            &address,
                        )
                        .await
                        {
                            Ok(account) =>
                                account,

                            Err(error) => {
                                return (
                                    StatusCode::BAD_GATEWAY,
                                    Json(
                                        empty_scan_response(
                                            address,
                                            true,
                                            error,
                                        ),
                                    ),
                                );
                            }
                        }
                    }

                    Err(error) => {
                        return (
                            StatusCode::BAD_GATEWAY,
                            Json(
                                empty_scan_response(
                                    address,
                                    false,
                                    error,
                                ),
                            ),
                        );
                    }
                }
            }
        };

    let mut balance =
        native_balance(&account);

    if balance <= state.auto_fund_below_xlm
        && !auto_funded
    {
        match request_friendbot(
            &state,
            &address,
        )
        .await
        {
            Ok(()) => {
                auto_funded = true;

                match wait_for_balance_increase(
                    &state,
                    &address,
                    balance,
                )
                .await
                {
                    Ok(new_account) => {
                        account = new_account;

                        balance =
                            native_balance(&account);
                    }

                    Err(error) => {
                        let security =
                            analyze_account(&account);

                        return (
                            StatusCode::OK,
                            Json(
                                build_scan_response(
                                    address,
                                    balance,
                                    0.0,
                                    true,
                                    security,
                                    &account,
                                    error,
                                    0,
                                ),
                            ),
                        );
                    }
                }
            }

            Err(error) => {
                let security =
                    analyze_account(&account);

                return (
                    StatusCode::OK,
                    Json(
                        build_scan_response(
                            address.clone(),
                            balance,
                            0.0,
                            false,
                            security,
                            &account,
                            format!(
                                "Wallet scan completed, but automatic Testnet funding was not completed: {}",
                                error
                            ),
                            funding_cooldown_remaining(
                                &state,
                                &address,
                            )
                            .unwrap_or(0),
                        ),
                    ),
                );
            }
        }
    }

    let funded_amount =
        if auto_funded {
            (balance - balance_before_funding)
                .max(0.0)
        } else {
            0.0
        };

    if auto_funded {
        let _ =
            mark_address_funding_request(
                &state,
                &address,
            );
    }

    let security =
        analyze_account(&account);

    let cooldown =
        funding_cooldown_remaining(
            &state,
            &address,
        )
        .unwrap_or(0);

    (
        StatusCode::OK,
        Json(
            build_scan_response(
                address,
                balance,
                funded_amount,
                auto_funded,
                security,
                &account,
                "Wallet security scan completed."
                    .to_string(),
                cooldown,
            ),
        ),
    )
}

fn empty_scan_response(
    address: String,
    auto_funded: bool,
    message: String,
) -> ScanResponse {
    ScanResponse {
        address,
        address_type:
            "Stellar Account".to_string(),
        network: TESTNET_NAME.to_string(),
        xlm_balance: 0.0,
        funded_amount_xlm: 0.0,
        auto_funded,
        security_score: 0,
        risk_level:
            "Unavailable".to_string(),
        signer_count: 0,
        findings: vec![],
        assets: vec![],
        funding_cooldown_seconds: 0,
        message,
    }
}

fn build_scan_response(
    address: String,
    balance: f64,
    funded_amount: f64,
    auto_funded: bool,
    security: SecurityAnalysis,
    account: &HorizonAccount,
    message: String,
    funding_cooldown_seconds: u64,
) -> ScanResponse {
    ScanResponse {
        address,
        address_type:
            "Stellar Account".to_string(),
        network: TESTNET_NAME.to_string(),
        xlm_balance: balance,
        funded_amount_xlm:
            funded_amount,
        auto_funded,
        security_score:
            security.score,
        risk_level:
            security.risk_level,
        signer_count:
            security.signer_count,
        findings:
            security.findings,
        assets:
            account_assets(account),
        funding_cooldown_seconds,
        message,
    }
}

fn analyze_account(
    account: &HorizonAccount,
) -> SecurityAnalysis {
    let signer_count =
        account.signers.len();

    let total_signer_weight: u32 =
        account
            .signers
            .iter()
            .map(|signer| signer.weight)
            .sum();

    let mut score: i32 = 100;

    let mut findings =
        Vec::new();

    if signer_count == 0 {
        score -= 45;

        findings.push(
            SecurityFinding {
                severity:
                    "Critical".to_string(),

                title:
                    "No signers detected"
                        .to_string(),

                description:
                    "The account returned no active signers. Review the account configuration before using it."
                        .to_string(),
            },
        );
    } else if signer_count == 1 {
        findings.push(
            SecurityFinding {
                severity:
                    "Info".to_string(),

                title:
                    "Single signer account"
                        .to_string(),

                description:
                    "The account has one signer. This is common for personal wallets and is not automatically a security problem."
                        .to_string(),
            },
        );
    }

    for (name, threshold) in [
        (
            "Medium",
            account.thresholds.med_threshold,
        ),
        (
            "High",
            account.thresholds.high_threshold,
        ),
    ] {
        if threshold >
            total_signer_weight
        {
            score -= 20;

            findings.push(
                SecurityFinding {
                    severity:
                        "High".to_string(),

                    title:
                        format!(
                            "{} threshold cannot be satisfied",
                            name
                        ),

                    description:
                        format!(
                            "The {} threshold is {}, but the total signer weight is {}.",
                            name.to_lowercase(),
                            threshold,
                            total_signer_weight
                        ),
                },
            );
        }
    }

    if account
        .thresholds
        .low_threshold
        > total_signer_weight
    {
        score -= 10;

        findings.push(
            SecurityFinding {
                severity:
                    "Medium".to_string(),

                title:
                    "Low threshold cannot be satisfied"
                        .to_string(),

                description:
                    format!(
                        "The low threshold is {}, but the total signer weight is {}.",
                        account
                            .thresholds
                            .low_threshold,
                        total_signer_weight
                    ),
            },
        );
    }

    for signer in
        &account.signers
    {
        if signer.signer_type
            == "ed25519_public_key"
            && signer.weight == 0
        {
            score -= 20;

            findings.push(
                SecurityFinding {
                    severity:
                        "High".to_string(),

                    title:
                        "Signer has zero weight"
                            .to_string(),

                    description:
                        format!(
                            "Signer {} is present but has a weight of 0.",
                            signer.key
                        ),
                },
            );
        }
    }

    if findings.is_empty() {
        findings.push(
            SecurityFinding {
                severity:
                    "Info".to_string(),

                title:
                    "No obvious security findings"
                        .to_string(),

                description:
                    "The automated account checks did not identify an obvious configuration issue."
                        .to_string(),
            },
        );
    }

    let score =
        score.clamp(0, 100) as u8;

    let risk_level =
        if score >= 85 {
            "Healthy"
        } else if score >= 60 {
            "At Risk"
        } else {
            "Critical Risk"
        };

    SecurityAnalysis {
        score,
        risk_level:
            risk_level.to_string(),
        signer_count,
        findings,
    }
}

fn account_assets(
    account: &HorizonAccount,
) -> Vec<WalletAsset> {
    account
        .balances
        .iter()
        .filter_map(|balance| {
            let amount =
                balance
                    .balance
                    .parse::<f64>()
                    .ok()?;

            let native =
                balance.asset_type == "native";

            Some(
                WalletAsset {
                    asset_type:
                        balance
                            .asset_type
                            .clone(),

                    asset_code:
                        if native {
                            "XLM".to_string()
                        } else {
                            balance
                                .asset_code
                                .clone()
                                .unwrap_or_else(
                                    || {
                                        "Unknown"
                                            .to_string()
                                    },
                                )
                        },

                    issuer:
                        balance
                            .asset_issuer
                            .clone(),

                    balance: amount,
                },
            )
        })
        .collect()
}

fn funding_cooldown_remaining(
    state: &AppState,
    address: &str,
) -> Result<u64, String> {
    let map =
        state
            .address_funding_times
            .lock()
            .map_err(
                |_| {
                    "Funding cooldown storage is unavailable."
                        .to_string()
                },
            )?;

    let Some(last_request) =
        map.get(address)
    else {
        return Ok(0);
    };

    let elapsed =
        last_request.elapsed();

    let cooldown =
        Duration::from_secs(
            EXISTING_WALLET_COOLDOWN_SECONDS,
        );

    if elapsed >= cooldown {
        Ok(0)
    } else {
        Ok(
            (cooldown - elapsed)
                .as_secs()
                .max(1),
        )
    }
}

fn mark_address_funding_request(
    state: &AppState,
    address: &str,
) -> Result<(), String> {
    let mut map =
        state
            .address_funding_times
            .lock()
            .map_err(
                |_| {
                    "Funding cooldown storage is unavailable."
                        .to_string()
                },
            )?;

    map.insert(
        address.to_string(),
        Instant::now(),
    );

    Ok(())
}

fn format_duration(
    seconds: u64,
) -> String {
    let hours =
        seconds / 3600;

    let minutes =
        (seconds % 3600) / 60;

    if hours > 0 {
        format!(
            "{}h {}m",
            hours,
            minutes
        )
    } else {
        format!(
            "{}m",
            minutes.max(1)
        )
    }
}

fn enforce_global_funding_limit(
    state: &AppState,
) -> Result<(), String> {
    let now =
        Instant::now();

    let mut requests =
        state
            .fund_request_times
            .lock()
            .map_err(
                |_| {
                    "Funding rate limiter is unavailable."
                        .to_string()
                },
            )?;

    requests.retain(
        |timestamp| {
            now.duration_since(*timestamp)
                < Duration::from_secs(3600)
        },
    );

    if requests.len()
        >= state.max_fund_requests_per_hour
    {
        return Err(
            format!(
                "Testnet funding rate limit reached. A maximum of {} Friendbot requests is allowed per hour.",
                state.max_fund_requests_per_hour
            ),
        );
    }

    requests.push(now);

    Ok(())
}

async fn request_friendbot(
    state: &AppState,
    address: &str,
) -> Result<(), String> {
    enforce_global_funding_limit(
        state,
    )?;

    let url = format!(
        "{}?addr={}",
        state
            .friendbot_url
            .trim_end_matches('/'),
        address
    );

    let response =
        state
            .client
            .get(&url)
            .send()
            .await
            .map_err(
                |error| {
                    format!(
                        "Unable to contact Stellar Testnet Friendbot: {}",
                        error
                    )
                },
            )?;

    if !response
        .status()
        .is_success()
    {
        let status =
            response.status();

        let body =
            response
                .text()
                .await
                .unwrap_or_else(
                    |_| {
                        "No response body."
                            .to_string()
                    },
                );

        return Err(
            format!(
                "Friendbot rejected the request. Status: {}. {}",
                status,
                body
            ),
        );
    }

    Ok(())
}

async fn wait_for_account(
    state: &AppState,
    address: &str,
) -> Result<HorizonAccount, String> {
    for _ in 0..10 {
        tokio::time::sleep(
            Duration::from_secs(2),
        )
        .await;

        if let Ok(account) =
            get_account(
                state,
                address,
            )
            .await
        {
            return Ok(account);
        }
    }

    Err(
        "The Testnet account was funded, but it could not be confirmed yet."
            .to_string(),
    )
}

async fn wait_for_balance_increase(
    state: &AppState,
    address: &str,
    previous_balance: f64,
) -> Result<HorizonAccount, String> {
    for _ in 0..10 {
        tokio::time::sleep(
            Duration::from_secs(2),
        )
        .await;

        if let Ok(account) =
            get_account(
                state,
                address,
            )
            .await
        {
            if native_balance(
                &account,
            ) > previous_balance
            {
                return Ok(account);
            }
        }
    }

    Err(
        "The Testnet funding transaction could not be confirmed yet."
            .to_string(),
    )
}

async fn get_account(
    state: &AppState,
    address: &str,
) -> Result<HorizonAccount, String> {
    let url = format!(
        "{}/accounts/{}",
        state
            .horizon_url
            .trim_end_matches('/'),
        address
    );

    let response =
        state
            .client
            .get(&url)
            .send()
            .await
            .map_err(
                |error| {
                    format!(
                        "Unable to connect to Stellar Testnet: {}",
                        error
                    )
                },
            )?;

    if response.status()
        == StatusCode::NOT_FOUND
    {
        return Err(
            "Wallet does not exist on Stellar Testnet."
                .to_string(),
        );
    }

    if !response
        .status()
        .is_success()
    {
        return Err(
            format!(
                "Stellar Testnet returned status {}.",
                response.status()
            ),
        );
    }

    response
        .json::<HorizonAccount>()
        .await
        .map_err(
            |error| {
                format!(
                    "Unable to read Stellar Testnet account data: {}",
                    error
                )
            },
        )
}

fn native_balance(
    account: &HorizonAccount,
) -> f64 {
    account
        .balances
        .iter()
        .find(
            |balance| {
                balance.asset_type
                    == "native"
            },
        )
        .and_then(
            |balance| {
                balance
                    .balance
                    .parse::<f64>()
                    .ok()
            },
        )
        .unwrap_or(0.0)
}

fn is_valid_stellar_account(
    address: &str,
) -> bool {
    let value =
        address.trim();

    value.len() == 56
        && value.starts_with('G')
        && value
            .chars()
            .all(
                |character| {
                    character
                        .is_ascii_alphanumeric()
                },
            )
}