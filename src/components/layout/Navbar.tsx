"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";

export default function Navbar() {
    const { isConnected, truncatedPublicKey, connect, disconnect, isFreighterInstalled } = useWallet();

    return (
        // Kalın alt sınır ve arka plan rengi ile retro görüntüsü veriyoruz
        <nav className="w-full border-b-brutal border-brutalBlack bg-base flex items-center justify-between px-6 py-4">
            <Link href="/">
                <h1 className="text-3xl font-black tracking-tighter uppercase cursor-pointer hover:text-accentHover transition-colors">
                    CommitFund
                </h1>
            </Link>

            <div className="flex items-center gap-4">
                {!isFreighterInstalled ? (
                    <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="brutal-btn flex items-center gap-2 bg-red-400 hover:bg-red-500">
                        <Wallet size={20} strokeWidth={3} />
                        <span>Install Freighter</span>
                    </a>
                ) : !isConnected ? (
                    <button onClick={connect} className="brutal-btn flex items-center gap-2">
                        <Wallet size={20} strokeWidth={3} />
                        <span>Connect Wallet</span>
                    </button>
                ) : (
                    <button onClick={disconnect} className="brutal-btn flex items-center gap-2 bg-accentHover group relative">
                        <Wallet size={20} strokeWidth={3} />
                        <span className="group-hover:hidden">{truncatedPublicKey}</span>
                        <span className="hidden group-hover:inline">Disconnect</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
