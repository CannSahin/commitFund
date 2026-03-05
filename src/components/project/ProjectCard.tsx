"use client";

import { ArrowUpRight } from "lucide-react";
import { useWallet } from "@/context/WalletContext";

interface ProjectCardProps {
    id: number;
    title: string;
    ownerStake: number;
    goal: number;
    funded: number;
}

import { useState } from "react";

export default function ProjectCard({ id, title, ownerStake, goal, funded }: ProjectCardProps) {
    const { isConnected, publicKey } = useWallet();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fonlanma yüzdesini hesaplıyoruz
    const progressPercent = Math.min(Math.round((funded / goal) * 100), 100);

    const handleInvest = async () => {
        if (!isConnected || !publicKey) return;

        const amountStr = window.prompt(`Kaç XLM yatırmak istiyorsunuz? (${title})`);
        if (!amountStr) return;

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert("Geçersiz miktar");
            return;
        }

        setIsSubmitting(true);
        try {
            const { investInProject } = await import("@/lib/contract");
            await investInProject(publicKey, id, amount);
            alert("Yatırım başarıyla tamamlandı!");
            // Not: Gerçekte işlem bitince "funded" miktarını contract.ts üzerinden refresh edebiliriz.
        } catch (error: any) {
            console.error("Yatırım hatası:", error);
            if (error.message && error.message.includes("User declined")) {
                alert("İşlem kullanıcı tarafından reddedildi.");
            } else {
                alert("Bir hata oluştu: " + error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="brutal-card flex flex-col p-6 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            {/* Kart Başlığı */}
            <h3 className="text-2xl font-black mb-4 truncate" title={title}>
                {title}
            </h3>

            {/* Vurgulanmış Skin in the Game kutusu */}
            <div className="bg-brutalBlack text-accentMain p-4 mb-6 border-brutal border-brutalBlack transform -rotate-1">
                <p className="font-mono text-xs font-bold mb-1 opacity-80 text-white">SKIN IN THE GAME</p>
                <p className="font-mono text-2xl font-black">{ownerStake.toLocaleString("en-US")} XLM</p>
            </div>

            <div className="flex-grow mt-auto flex flex-col justify-end">
                {/* İlerleme Çubuğu - Brutalist Stil: Kalın siyah sınır, neon yeşil dolgu */}
                <div className="w-full h-8 border-brutal border-brutalBlack bg-base relative mb-2">
                    <div
                        className="h-full bg-accentHover border-r-brutal border-brutalBlack"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="flex justify-between items-center font-mono font-bold mb-6 text-sm">
                    <span>{funded.toLocaleString("en-US")} XLM RAISED</span>
                    <span>{progressPercent}%</span>
                </div>

                {/* Yatırım Butonu */}
                <button
                    onClick={handleInvest}
                    className={`brutal-btn w-full flex justify-between items-center group transition-all duration-200 ${(!isConnected || isSubmitting) ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                    disabled={!isConnected || isSubmitting}
                >
                    <span>
                        {isSubmitting ? "PENDING..." : (isConnected ? "INVEST NOW" : "CONNECT TO INVEST")}
                    </span>
                    {!isSubmitting && (
                        <ArrowUpRight strokeWidth={4} className={`transition-transform ${isConnected ? "group-hover:translate-x-1 group-hover:-translate-y-1" : ""}`} />
                    )}
                </button>
            </div>
        </div>
    );
}
