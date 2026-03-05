"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface WalletContextType {
    isConnected: boolean;
    publicKey: string | null;
    isFreighterInstalled: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    truncatedPublicKey: string | null;
    network: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
    const [network, setNetwork] = useState<string | null>(null);

    useEffect(() => {
        // Freighter'ın kurulu olup olmadığını kontrol ediyoruz
        const checkConnection = async () => {
            try {
                // Dinamik import ile SSR (Sunucu Taraflı Oluşturma) hatalarını önlüyoruz
                const freighter = await import("@stellar/freighter-api");

                const { isConnected: installed } = await freighter.isConnected();
                setIsFreighterInstalled(installed);

                if (installed) {
                    const { network: currentNetwork } = await freighter.getNetworkDetails();
                    setNetwork(currentNetwork);

                    // Kullanıcının daha önce bu siteye açık anahtar erişim izni verip vermediğini kontrol ediyoruz
                    const { isAllowed: allowed } = await freighter.isAllowed();
                    if (allowed) {
                        const { address, error } = await freighter.getAddress();
                        if (address && !error) {
                            setPublicKey(address);
                            setIsConnected(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Cüzdan durumu kontrol edilirken hata oluştu:", error);
            }
        };

        checkConnection();
    }, []);

    const connect = async () => {
        try {
            if (!isFreighterInstalled) {
                alert("Lütfen Freighter cüzdan eklentisini kurun!");
                return;
            }

            const freighter = await import("@stellar/freighter-api");

            // Kullanıcıdan izin ve açık anahtar (public key) istiyoruz
            const { address, error } = await freighter.requestAccess();

            if (address && !error) {
                setPublicKey(address);
                setIsConnected(true);

                const { network: currentNetwork } = await freighter.getNetworkDetails();
                setNetwork(currentNetwork);
            } else if (error) {
                console.error("Bağlantı reddedildi veya hata oluştu", error);
            }
        } catch (error) {
            console.error("Cüzdan bağlanırken hata oluştu:", error);
        }
    };

    const disconnect = () => {
        // Freighter için doğrudan 'disconnect' metodu bulunmuyor.
        // Biz uygulama seviyesinde stateleri temizleyerek çıkış yapmış sayıyoruz.
        setIsConnected(false);
        setPublicKey(null);
    };

    // Açık anahtarın ilk 4 ve son 4 karakterini alarak kısaltıyoruz (örn. GABC...XYZ).
    const truncatedPublicKey = publicKey
        ? `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`
        : null;

    return (
        <WalletContext.Provider
            value={{
                isConnected,
                publicKey,
                isFreighterInstalled,
                connect,
                disconnect,
                truncatedPublicKey,
                network,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};
