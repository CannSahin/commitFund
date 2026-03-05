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

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CAUFPZT7Z44CN55IWTFEBJALHCP2YPQD6XRXODHLUVQLEFQA63DSMCCT";

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
    try {
        const contract = new Contract(CONTRACT_ID);

        // Simülasyon yaparak veriyi çekiyoruz (salt-okunur işlem)
        // Not: Gerçek bir uygulamada 'get_projects' fonksiyonunun argüman alıp almadığına bakılmalıdır.
        // Genellikle tüm projeleri dönen bir getter olur.

        const nullAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
        const tx = new TransactionBuilder(nullAccount, {
            fee: "100",
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(contract.call("get_projects"))
            .setTimeout(30)
            .build();

        const result = await rpcServer.simulateTransaction(tx);

        if (rpc.Api.isSimulationSuccess(result)) {
            // Soroban ScVal'ı JS objesine dönüştürme (basitleştirilmiş)
            // Gerçek projede SDK'nın ScVal parser'ları kullanılır
            const scVal = result.result!.retval;
            // ScVal -> JSON dönüşümü SDK versiyonuna göre değişebilir
            // @ts-ignore
            const projects = scVal.value().map((p: any) => {
                const map = p.map();
                const getVal = (key: string) => {
                    const entry = map.find((e: any) => e.key().string() === key);
                    return entry ? entry.val() : null;
                };

                return {
                    id: Number(getVal("id").u32()),
                    title: getVal("title").string(),
                    owner: getVal("owner").address().toString(),
                    goal: Number(getVal("goal").u128()) / 10_000_000,
                    stake: Number(getVal("stake").u128()) / 10_000_000,
                    funded: Number(getVal("funded").u128()) / 10_000_000,
                    isActive: getVal("is_active").bool()
                };
            });
            return projects;
        }
        return [];
    } catch (err) {
        console.error("Projeler çekilirken hata:", err);
        return [];
    }
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
