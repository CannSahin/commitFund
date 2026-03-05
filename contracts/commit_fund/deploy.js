process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local SSL issues

const fs = require('fs');
const { rpc, TransactionBuilder, Networks, Keypair, Operation, Asset } = require('@stellar/stellar-sdk');

const SERVER_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const rpcServer = new rpc.Server(SERVER_URL, { allowHttp: true });

// Admin secret should be set in environment
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
    console.error("ADMIN_SECRET not found in environment variables.");
    process.exit(1);
}

async function main() {
    console.log("Starting WebAssembly upload...");
    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);

    // Read the compiled WebAssembly file
    const wasmPath = "./target/wasm32-unknown-unknown/release/commit_fund.wasm";
    if (!fs.existsSync(wasmPath)) {
        throw new Error(`WASM file not found at ${wasmPath}.`);
    }
    const wasmBuffer = fs.readFileSync(wasmPath);

    const account = await rpcServer.getAccount(adminKeypair.publicKey());

    // -----------------------------------------------------
    // 1. Upload the Contract Code (WASM)
    // -----------------------------------------------------
    let tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(Operation.uploadContractWasm({ wasm: wasmBuffer }))
        .setTimeout(30)
        .build();

    let preparedTx = await rpcServer.prepareTransaction(tx);
    preparedTx.sign(adminKeypair);

    console.log("Sending Upload transaction...");
    let sendResult = await rpcServer.sendTransaction(preparedTx);
    if (sendResult.status === "ERROR") {
        throw new Error("Upload failed: " + JSON.stringify(sendResult));
    }

    // Poll for upload status
    let txStatus = await rpcServer.getTransaction(sendResult.hash);
    while (txStatus.status === "NOT_FOUND") {
        await new Promise(r => setTimeout(r, 2000));
        txStatus = await rpcServer.getTransaction(sendResult.hash);
    }

    if (txStatus.status !== "SUCCESS") {
        throw new Error("WASM Upload failed: " + txStatus.status);
    }

    // The WASM ID is stored in the returnValue (meta)
    let wasmId = txStatus.returnValue.value().toString("hex");
    console.log("==== UPLOAD SUCCESSFUL ====");
    console.log("Wasm ID:", wasmId);

    // -----------------------------------------------------
    // 2. Instantiate the Contract
    // -----------------------------------------------------
    console.log("\nInstantiating Contract...");
    // Refetch account for updated sequence
    const account2 = await rpcServer.getAccount(adminKeypair.publicKey());

    const createTx = new TransactionBuilder(account2, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(Operation.createCustomContract({
            address: adminKeypair.publicKey(),
            wasmId: Buffer.from(wasmId, "hex")
        }))
        .setTimeout(30)
        .build();

    let preparedCreateTx = await rpcServer.prepareTransaction(createTx);
    preparedCreateTx.sign(adminKeypair);

    let sendCreateResult = await rpcServer.sendTransaction(preparedCreateTx);
    if (sendCreateResult.status === "ERROR") {
        throw new Error("Instantiation failed: " + JSON.stringify(sendCreateResult));
    }

    // Poll for creation status
    let createStatus = await rpcServer.getTransaction(sendCreateResult.hash);
    while (createStatus.status === "NOT_FOUND") {
        await new Promise(r => setTimeout(r, 2000));
        createStatus = await rpcServer.getTransaction(sendCreateResult.hash);
    }

    if (createStatus.status !== "SUCCESS") {
        throw new Error("Contract Creation failed.");
    }

    let contractIdScAddress = createStatus.returnValue.address().contractId().toString('hex');
    const { Address } = require('@stellar/stellar-sdk');
    const finalContractId = Address.fromBuffer(Buffer.from(contractIdScAddress, 'hex')).toString();

    console.log("==== CONTRACT SUCCESSFULLY DEPLOYED! ====");
    console.log("Contract ID:", finalContractId);
    console.log("NEXT_PUBLIC_CONTRACT_ID=" + finalContractId);
}

main().catch(err => {
    console.error("Deploy Script Error:", err);
});
