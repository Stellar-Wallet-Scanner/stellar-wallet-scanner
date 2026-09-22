#![no_std]

use soroban_sdk::{
    contract,
    contractimpl,
    symbol_short,
    Address,
    Env,
    String,
};

#[contract]
pub struct ScannerRegistry;

#[contractimpl]
impl ScannerRegistry {
    pub fn initialize(
        env: Env,
        admin: Address,
        version: String,
    ) {
        // Prevent the contract from being initialized more than once.
        if env
            .storage()
            .instance()
            .has(&symbol_short!("admin"))
        {
            panic!("Already initialized");
        }

        // The admin must authorize the initialization.
        admin.require_auth();

        env.storage()
            .instance()
            .set(&symbol_short!("admin"), &admin);

        env.storage()
            .instance()
            .set(&symbol_short!("version"), &version);

        env.storage()
            .instance()
            .set(&symbol_short!("scans"), &0u64);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&symbol_short!("admin"))
            .unwrap()
    }

    pub fn get_version(env: Env) -> String {
        env.storage()
            .instance()
            .get(&symbol_short!("version"))
            .unwrap()
    }

    pub fn get_scan_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&symbol_short!("scans"))
            .unwrap_or(0)
    }

    pub fn record_scan(env: Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&symbol_short!("admin"))
            .unwrap();

        // Only the stored admin can record scans.
        admin.require_auth();

        let current: u64 = env
            .storage()
            .instance()
            .get(&symbol_short!("scans"))
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&symbol_short!("scans"), &(current + 1));
    }
}

mod test;