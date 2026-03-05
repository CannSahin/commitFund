#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token, Address, Env, IntoVal, String,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    token::Client::new(env, &env.register_stellar_asset_contract(admin.clone()))
}

#[test]
fn test_end_to_end_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let investor1 = Address::generate(&env);
    let investor2 = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token = create_token_contract(&env, &token_admin);
    let token_addr = token.address.clone();

    // Mint tokens
    let token_admin_client = token::StellarAssetClient::new(&env, &token_addr);
    token_admin_client.mint(&owner, &1000);
    token_admin_client.mint(&investor1, &2000);
    token_admin_client.mint(&investor2, &2000);

    let contract_id = env.register_contract(None, CommitFundContract);
    let client = CommitFundContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_addr);

    // Create project
    let goal = 1000;
    let stake = 500;
    let project_id = client.create_project(&owner, &goal, &stake);
    assert_eq!(project_id, 1);
    assert_eq!(token.balance(&contract_id), 500);

    // Contribute
    client.contribute(&investor1, &project_id, &600);
    client.contribute(&investor2, &project_id, &400);
    assert_eq!(token.balance(&contract_id), 1500); // 500 stake + 1000 contributions

    // Vote
    client.vote_milestone(&investor1, &project_id, &true); // 600 weight positive
    client.vote_milestone(&investor2, &project_id, &false); // 400 weight negative

    // Release funds (>51% positive)
    client.release_funds(&project_id);

    // Owner should have 500 (stake back) + 1000 (contributions) + 500 (remaining initial balance) = 2000
    assert_eq!(token.balance(&owner), 2000);
    assert_eq!(token.balance(&contract_id), 0);
}

#[test]
fn test_fail_project() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let investor1 = Address::generate(&env);
    let investor2 = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token = create_token_contract(&env, &token_admin);
    let token_addr = token.address.clone();

    let token_admin_client = token::StellarAssetClient::new(&env, &token_addr);
    token_admin_client.mint(&owner, &1000);
    token_admin_client.mint(&investor1, &2000);
    token_admin_client.mint(&investor2, &2000);

    let contract_id = env.register_contract(None, CommitFundContract);
    let client = CommitFundContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token_addr);

    let goal = 1000;
    let stake = 500;
    let project_id = client.create_project(&owner, &goal, &stake);

    client.contribute(&investor1, &project_id, &600);
    client.contribute(&investor2, &project_id, &400);

    // Negative vote wins
    client.vote_milestone(&investor1, &project_id, &false);
    client.vote_milestone(&investor2, &project_id, &false);

    // Fail project
    client.fail_project(&project_id);

    // Investor1 gets 600 + (600/1000)*500 = 600 + 300 = 900. Total balance: 1400 + 900 = 2300
    assert_eq!(token.balance(&investor1), 2300);
    // Investor2 gets 400 + (400/1000)*500 = 400 + 200 = 600. Total balance: 1600 + 600 = 2200
    assert_eq!(token.balance(&investor2), 2200);
    assert_eq!(token.balance(&contract_id), 0);
}
