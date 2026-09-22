#![cfg(test)]

use super::*;

use soroban_sdk::{
    testutils::Address as _,
    Address,
    Env,
    String,
};

#[test]
fn test_initialize_and_read_registry() {
    let env = Env::default();

    let contract_id = env.register(ScannerRegistry, ());
    let client = ScannerRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let version = String::from_str(&env, "1.0.0");

    env.mock_all_auths();

    client.initialize(&admin, &version);

    assert_eq!(client.get_admin(), admin);

    assert_eq!(
        client.get_version(),
        String::from_str(&env, "1.0.0")
    );

    assert_eq!(client.get_scan_count(), 0);
}

#[test]
fn test_record_scan() {
    let env = Env::default();

    let contract_id = env.register(ScannerRegistry, ());
    let client = ScannerRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let version = String::from_str(&env, "1.0.0");

    env.mock_all_auths();

    client.initialize(&admin, &version);

    assert_eq!(client.get_scan_count(), 0);

    client.record_scan();

    assert_eq!(client.get_scan_count(), 1);

    client.record_scan();

    assert_eq!(client.get_scan_count(), 2);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_cannot_initialize_twice() {
    let env = Env::default();

    let contract_id = env.register(ScannerRegistry, ());
    let client = ScannerRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let version = String::from_str(&env, "1.0.0");

    env.mock_all_auths();

    // First initialization should succeed.
    client.initialize(&admin, &version);

    // Second initialization must fail.
    client.initialize(&admin, &version);
}