import Link from "next/link";

export default function Footer() {
    return (
        // Üst kenar çizgisi (border-t) brutalist tarza uyması için 4px siyah
        <footer className="w-full border-t-brutal border-brutalBlack bg-base flex flex-col items-center py-8 mt-16">
            <div className="flex gap-8 mb-4">
                {/* Projelere geçiş yapacak temsili bağlantılar */}
                <Link href="#" className="font-black hover:text-accentHover underline decoration-4 underline-offset-4">
                    All Projects
                </Link>
                <Link href="#" className="font-black hover:text-accentHover underline decoration-4 underline-offset-4">
                    How it Works
                </Link>
                <Link href="#" className="font-black hover:text-accentHover underline decoration-4 underline-offset-4">
                    Terms
                </Link>
            </div>
            <p className="font-mono font-bold text-sm uppercase">© 2026 CommitFund - Skin in the game.</p>
        </footer>
    );
}
