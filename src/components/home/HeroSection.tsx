"use client";

import { ArrowRight } from "lucide-react";

export default function HeroSection() {
    return (
        <section className="w-full flex flex-col items-center justify-center py-24 px-6 text-center border-b-brutal border-brutalBlack bg-accentMain">
            <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                <h2 className="text-6xl md:text-8xl font-black uppercase leading-none tracking-tighter">
                    Invest with Accountability
                </h2>

                {/* Vurgulayıcı brutalist kutu */}
                <div className="bg-brutalBlack text-brutalWhite border-brutal border-accentMain p-4 md:p-6 w-full max-w-2xl transform rotate-1 hover:rotate-0 transition-transform">
                    <p className="font-mono text-xl md:text-2xl font-bold">
                        No stake? No campaign. Owners must put their own XLM on the line.
                    </p>
                </div>

                <button className="brutal-btn flex items-center justify-center gap-3 text-xl px-8 py-4 mt-4 w-fit">
                    Start Exploring <ArrowRight strokeWidth={4} />
                </button>
            </div>
        </section>
    );
}
