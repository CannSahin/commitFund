# CommitFund Deployment Guide (Stellar Testnet)

This guide provides the necessary commands to deploy the CommitFund smart contract to the Stellar Testnet and initialize it using the Stellar CLI.

## Prerequisites
Ensure you have the [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup) installed.

## Step 1: Create and Fund Admin Identity
Create an admin identity on the Testnet. The `generate` command automatically funds the account using Friendbot.

```bash
stellar keys generate admin --network testnet
```

*(Optional)* If you need to manually fund:
```bash
stellar keys fund admin --network testnet
```

## Step 2: Build the Smart Contract
Navigate to the contract directory and build the `wasm` binary.

```bash
cd contracts/commit_fund
stellar contract build
```

## Step 3: Deploy to Testnet
Deploy the compiled WebAssembly file to the Stellar Testnet. This command will output the Contract ID and save an alias.

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/commit_fund.wasm \
  --source admin \
  --network testnet \
  --alias commit_fund
```

*(Note: Keep the generated Contract ID handy. You will need it for the frontend integration in `src/lib/contract.ts` if you do not use the alias locally.)*

## Step 4: Initialize the Contract
Invoke the `initialize` function on your deployed contract. You need to pass the admin address and the Testnet native token (XLM) contract ID.

- **Testnet Native Asset (XLM) Contract ID:** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

```bash
stellar contract invoke \
  --id commit_fund \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin $(stellar keys address admin) \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Once tracking success, the contract is fully deployed and ready for frontend interactions!
