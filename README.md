# 🚀 CommitFund

**CommitFund** is a decentralized crowdfunding platform built on the **Stellar** network using **Soroban** smart contracts. It introduces a "Commit" mechanism where project creators stake collateral to build trust with investors.

## ✨ Key Features

-   **Collateral Staking**: Creators must stake a percentage of their goal as collateral.
-   **Milestone-Based Releases**: Funds are released to the creator based on project milestones and investor voting.
-   **Investor Protection**: If a project fails or doesn't reach its goal, investors are refunded and collateral may be distributed.
-   **Web3 Integration**: Seamless connection with the **Freighter** wallet.
-   **Retro-Brutalist UI**: High-contrast, bold design for a unique user experience.

## 🛠 Tech Stack

-   **Frontend**: [Next.js](https://nextjs.org/) (React, TypeScript, Tailwind CSS)
-   **Smart Contracts**: [Soroban](https://soroban.stellar.org/) (Rust)
-   **Blockchain Support**: [@stellar/stellar-sdk](https://github.com/stellar/js-stellar-sdk)
-   **Wallet**: [Freighter](https://www.freighter.app/)

## 📂 Project Structure

-   `/src`: Frontend application code.
    -   `/components`: Reusable UI components.
    -   `/context`: Wallet and global state management.
    -   `/lib`: Contract interaction logic and utilities.
-   `/contracts`: Soroban smart contract source code and deployment scripts.
    -   `/commit_fund`: The primary Rust contract.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18+)
-   [Rust and Soroban CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup) (for contract development)
-   [Freighter Wallet](https://www.freighter.app/) extension installed in your browser.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/commitFund.git
    cd commitFund
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure environment variables:
    Create a `.env.local` file and add your contract ID:
    ```env
    NEXT_PUBLIC_CONTRACT_ID=YOUR_CONTRACT_ID
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## 📜 Contract Deployment

For instructions on how to build and deploy the smart contracts to the Stellar Testnet, see the [Deployment Guide](contracts/deploy.md).

## 📄 License

This project is licensed under the MIT License.
