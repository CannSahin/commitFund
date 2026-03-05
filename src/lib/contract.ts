import {
    rpc,
    TransactionBuilder,
    Networks,
    Address,
    nativeToScVal,
    Contract,
    Account,
} from "@stellar/stellar-sdk";
import { signTransaction, requestAccess } from "@stellar/freighter-api";

// Testnet RPC yapılandırması
const SERVER_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const rpcServer = new rpc.Server(SERVER_URL, { allowHttp: true });

// Testnet Native XLM Wrapped Token ID (Soroban SAC)
const TESTNET_XLM_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "C_REPLACE_WITH_DEPLOYED_CONTRACT_ID";

export interface ProjectData {
    id: number;
    title: string;
    owner: string;
    goal: number;
    stake: number;
    funded: number;
    isActive: boolean;
}

// Hata ayıklama yardımcısı (simulation / RPC hataları)
function handleTransactionError(err: any): never {
    const errorString = err?.message || String(err);
    if (errorString.toLowerCase().includes("balance") || errorString.toLowerCase().includes("insufficient")) {
        throw new Error("Insufficient Balance");
    }
    throw err;
}

async function sendAndPollTransaction(signedTxXdr: string) {
    let sendResponse;
    try {
        const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any;
        sendResponse = await rpcServer.sendTransaction(txToSubmit);
    } catch (err) {
        handleTransactionError(err);
    }

    if (sendResponse.status === "ERROR") {
        throw new Error("Transaction processing failed");
    }

    let txStatus = await rpcServer.getTransaction(sendResponse.hash);
    let attempts = 0;
    while (txStatus.status === "NOT_FOUND" && attempts < 15) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        txStatus = await rpcServer.getTransaction(sendResponse.hash);
        attempts++;
    }

    if (txStatus.status === "SUCCESS") {
        return txStatus;
    } else {
        throw new Error(`Transaction failed with status: ${txStatus.status}`);
    }
}

export async function fetchProjects(): Promise<ProjectData[]> {
    // Gerçek uygulamada contract.call("get_projects") kullanılarak datalar çekilebilir. Demo için mock veriliyor.
    return [
        {
            id: 1,
            title: "SOROBAN LENDING PROTOCOL",
            owner: "G_MOCK...",
            goal: 200000,
            stake: 50000,
            funded: 120000,
            isActive: true
        },
        {
            id: 2,
            title: "STELLAR DECENTRALIZED DEX",
            owner: "G_MOCK...",
            goal: 100000,
            stake: 25000,
            funded: 90000,
            isActive: true
        }
    ];
}

// initialize: Kontratı ilk kez başlatmak için çağrılır (admin ve token adresi kaydedilir).
export async function initializeContract(publicKey: string) {
    let allowed = await requestAccess();
    if (!allowed) throw new Error("Freighter kullanım izni verilmedi");

    const sourceAccount = new Account(publicKey, "0");
    const contract = new Contract(CONTRACT_ID);

    // Rust args: (admin: Address, token: Address)
    const args = [
        new Address(publicKey).toScVal(),
        new Address(TESTNET_XLM_ID).toScVal(),
    ];

    const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call("initialize", ...args))
        .setTimeout(30)
        .build();

    let preparedTx;
    try {
        preparedTx = await rpcServer.prepareTransaction(tx);
    } catch (err) {
        handleTransactionError(err);
    }
    const signResult = await signTransaction(preparedTx!.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
    if (signResult.error) {
        if (signResult.error.toLowerCase().includes("reject")) throw new Error("User Rejected");
        throw new Error(signResult.error);
    }
    return await sendAndPollTransaction(signResult.signedTxXdr);
}

// create_project: Yeni proje oluşturur (goal ve stake u128 — XLM stroops cinsinden).
export async function createProject(publicKey: string, title: string, goal: number, stake: number) {
    let allowed = await requestAccess();
    if (!allowed) throw new Error("Freighter kullanım izni verilmedi");

    const sourceAccount = new Account(publicKey, "0");
    const contract = new Contract(CONTRACT_ID);

    // Rust argümanları: (owner: Address, goal: u128, stake: u128, title: String)
    const args = [
        new Address(publicKey).toScVal(),
        nativeToScVal(BigInt(Math.floor(goal * 10_000_000)), { type: "u128" }),
        nativeToScVal(BigInt(Math.floor(stake * 10_000_000)), { type: "u128" }),
        nativeToScVal(title, { type: "string" }),
    ];

    const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call("create_project", ...args))
        .setTimeout(30)
        .build();

    let preparedTx;
    try {
        preparedTx = await rpcServer.prepareTransaction(tx);
    } catch (err) {
        handleTransactionError(err);
    }

    const signResult = await signTransaction(preparedTx!.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (signResult.error) {
        if (signResult.error.toLowerCase().includes("reject") || signResult.error.toLowerCase().includes("decline")) {
            throw new Error("User Rejected");
        }
        throw new Error(signResult.error);
    }

    return await sendAndPollTransaction(signResult.signedTxXdr);
}

// contribute: Bir projeye XLM yatırımı yapar (Escrow — token kontrata kilitlenir).
export async function investInProject(publicKey: string, projectId: number, amount: number) {
    let allowed = await requestAccess();
    if (!allowed) throw new Error("Freighter kullanım izni verilmedi");

    const sourceAccount = new Account(publicKey, "0");
    const contract = new Contract(CONTRACT_ID);

    // Rust argümanları: (investor: Address, project_id: u32, amount: u128)
    const args = [
        new Address(publicKey).toScVal(),
        nativeToScVal(projectId, { type: "u32" }),
        nativeToScVal(BigInt(Math.floor(amount * 10_000_000)), { type: "u128" }),
    ];

    const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call("contribute", ...args)) // ← gerçek fonksiyon adı: contribute
        .setTimeout(30)
        .build();

    let preparedTx;
    try {
        preparedTx = await rpcServer.prepareTransaction(tx);
    } catch (err) {
        handleTransactionError(err);
    }

    const signResult = await signTransaction(preparedTx!.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (signResult.error) {
        if (signResult.error.toLowerCase().includes("reject") || signResult.error.toLowerCase().includes("decline")) {
            throw new Error("User Rejected");
        }
        throw new Error(signResult.error);
    }

    return await sendAndPollTransaction(signResult.signedTxXdr);
}
