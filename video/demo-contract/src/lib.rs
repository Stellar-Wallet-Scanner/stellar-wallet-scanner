// GuardToken — a deliberately "hot" demo token for the Stellar Scan pitch
// video. Its exported functions (owner/upgrade/pause/mint/hidden setter) give
// the scanner's capability detection real signals to surface on camera.
#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
pub enum DataKey {
    Owner,
    TotalSupply,
    Balance(Address),
    Paused,
}

#[contract]
pub struct GuardToken;

#[contractimpl]
impl GuardToken {
    /// Constructor — sets the owner at deploy time.
    pub fn __constructor(env: Env, owner: Address) {
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &0i128);
    }

    pub fn owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    /// Token metadata — name, symbol, decimals (SAC-style interface).
    pub fn name(env: Env) -> String {
        String::from_str(&env, "GuardToken")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "GUARD")
    }

    pub fn decimals() -> u32 {
        7
    }

    /// Requires owner auth; transfers tokens.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        owner_check(&env);
        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }
        env.storage().instance().set(
            &DataKey::Balance(from.clone()),
            &(from_balance - amount),
        );
        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .instance()
            .set(&DataKey::Balance(to), &(to_balance + amount));
    }

    /// Owner-only mint — centralization signal.
    pub fn mint(env: Env, to: Address, amount: i128) {
        owner_check(&env);
        let supply = Self::total_supply(env.clone());
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));
        let balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .instance()
            .set(&DataKey::Balance(to), &(balance + amount));
    }

    /// Owner can pause all transfers — freeze capability.
    pub fn set_paused(env: Env, paused: bool) {
        owner_check(&env);
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    /// Unprotected setter — signature matches nothing the UI whitelists;
    /// scanners should flag this as a suspicious privileged entry point.
    pub fn set_owner(env: Env, new_owner: Address) {
        owner_check(&env);
        env.storage().instance().set(&DataKey::Owner, &new_owner);
    }
}

fn owner_check(env: &Env) {
    let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
    owner.require_auth();
}
