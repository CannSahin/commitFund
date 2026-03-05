"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

export default function CreateProjectForm() {
    const { isConnected, publicKey } = useWallet();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        goal: "",
        stake: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected || !publicKey) return;

        setIsSubmitting(true);
        try {
            const { createProject } = await import("@/lib/contract");
            await createProject(
                publicKey,
                formData.title,
                parseInt(formData.goal),
                parseInt(formData.stake)
            );
            alert("Proje başarıyla başlatıldı!");
            setFormData({ title: "", goal: "", stake: "" });
        } catch (error: any) {
            console.error("Proje oluşturma hatası:", error);
            // Freighter tarafında "User Rejected" gibi hataları yakalayıp düzgünce gösterelim
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
        <div className="brutal-card p-8 max-w-2xl mx-auto w-full my-12 bg-base">
            <h3 className="text-4xl font-black mb-8 border-b-brutal border-brutalBlack pb-4">Start a Campaign</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Proje Başlığı */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="title" className="font-mono font-bold text-lg">Project Title</label>
                    <input
                        id="title"
                        type="text"
                        className="border-brutal border-accentMain p-4 font-bold bg-brutalBlack text-brutalWhite focus:outline-none focus:ring-4 focus:ring-accentHover"
                        placeholder="E.G. NEXT-GEN DEFI PROTOCOL"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                </div>

                {/* Hedef Miktar */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="goal" className="font-mono font-bold text-lg">Funding Goal (XLM)</label>
                    <input
                        id="goal"
                        type="number"
                        className="border-brutal border-accentMain p-4 font-bold bg-brutalBlack text-brutalWhite focus:outline-none focus:ring-4 focus:ring-accentHover"
                        placeholder="10000"
                        value={formData.goal}
                        onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                        required
                    />
                </div>

                {/* Stake Miktarı - Özel Brutalist Vurgu */}
                <div className="flex flex-col gap-2 bg-accentMain border-brutal border-brutalBlack p-6 mt-4 relative">
                    <div className="absolute -top-4 -right-4 bg-brutalBlack text-white font-mono px-3 py-1 text-sm font-bold transform rotate-3">
                        SKIN IN THE GAME
                    </div>
                    <label htmlFor="stake" className="font-mono font-bold text-xl">Owner Stake (XLM)</label>
                    <p className="font-mono font-bold text-sm mb-2 opacity-80">This amount will be locked. Fail? Investors get it.</p>
                    <input
                        id="stake"
                        type="number"
                        className="border-brutal border-accentMain p-4 font-bold bg-brutalBlack text-brutalWhite focus:outline-none focus:ring-4 focus:ring-accentHover text-xl"
                        placeholder="2500"
                        value={formData.stake}
                        onChange={(e) => setFormData({ ...formData, stake: e.target.value })}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className={`brutal-btn mt-6 w-full text-2xl py-6 transition-all duration-200 ${(!isConnected || isSubmitting) ? "opacity-50 grayscale cursor-not-allowed" : ""} flex justify-center items-center gap-4`}
                    disabled={!isConnected || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-8 h-8 rounded-full border-4 border-brutalBlack border-r-transparent animate-spin"></div>
                            <span>Pending...</span>
                        </>
                    ) : (
                        isConnected ? "DEPOSIT STAKE & LAUNCH" : "CONNECT WALLET TO LAUNCH"
                    )}
                </button>
            </form>
        </div>
    );
}
