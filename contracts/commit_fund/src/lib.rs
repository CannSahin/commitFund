#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1, // Zaten başlatıldı
    NotAuthorized = 2,      // Yetkisiz işlem
    ProjectNotFound = 3,    // Proje bulunamadı
    InvalidAmount = 4,      // Geçersiz miktar
    ProjectNotActive = 5,   // Proje aktif değil
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,                      // Instance
    Token,                      // Instance
    ProjectCounter,             // Instance
    Project(u32),               // Persistent: project_id
    Contribution(u32, Address), // Persistent: project_id, investor
}

#[derive(Clone)]
#[contracttype]
pub struct Project {
    pub owner: Address,
    pub title: soroban_sdk::String,
    pub goal: u128,
    pub stake: u128,
    pub total_contributions: u128,
    pub is_active: bool,
}

#[contract]
pub struct CommitFundContract;

#[contractimpl]
impl CommitFundContract {
    /// Sözleşmeyi başlatır ve Testnet XLM (veya token) adresini kaydeder.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::ProjectCounter, &0u32);
        Ok(())
    }

    /// Yeni bir proje oluşturur ve proje sahibinden "stake" (teminat) miktarını sözleşmeye çeker.
    pub fn create_project(
        env: Env,
        owner: Address,
        goal: u128,
        stake: u128,
        title: soroban_sdk::String,
    ) -> Result<u32, ContractError> {
        owner.require_auth();

        if goal == 0 || stake == 0 {
            return Err(ContractError::InvalidAmount);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).ok_or(ContractError::NotAuthorized)?;
        let token_client = token::Client::new(&env, &token_addr);

        // Teminat miktarını projeyi başlatan kişiden sözleşme adresine transfer et
        token_client.transfer(&owner, &env.current_contract_address(), &(stake as i128));

        let mut counter: u32 = env.storage().instance().get(&DataKey::ProjectCounter).unwrap_or(0);
        counter += 1;

        let project = Project {
            owner: owner.clone(),
            title,
            goal,
            stake,
            total_contributions: 0,
            is_active: true,
        };

        // Projeyi kalıcı belleğe kaydet
        env.storage().persistent().set(&DataKey::Project(counter), &project);
        env.storage().instance().set(&DataKey::ProjectCounter, &counter);

        Ok(counter)
    }

    /// Yatırımcıların projeye fon sağlaması (Escrow).
    pub fn contribute(
        env: Env,
        investor: Address,
        project_id: u32,
        amount: u128,
    ) -> Result<(), ContractError> {
        investor.require_auth();

        if amount == 0 {
            return Err(ContractError::InvalidAmount);
        }

        let mut project: Project = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id))
            .ok_or(ContractError::ProjectNotFound)?;

        if !project.is_active {
            return Err(ContractError::ProjectNotActive);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);

        // Yatırımcıdan sözleşmeye testnet XLM transferi
        token_client.transfer(&investor, &env.current_contract_address(), &(amount as i128));

        let current_contribution: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Contribution(project_id, investor.clone()))
            .unwrap_or(0);

        // Katkı miktarını güncelle
        env.storage()
            .persistent()
            .set(&DataKey::Contribution(project_id, investor.clone()), &(current_contribution + amount));

        project.total_contributions += amount;
        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        Ok(())
    }
}
