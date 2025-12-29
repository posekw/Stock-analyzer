"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";

export function Navigation() {
    const pathname = usePathname();
    const { currentTicker, setTicker } = useDashboardStore();

    const navLinks = [
        { href: "/", label: "DCF" },
        { href: "/relative", label: "Relative" },
        { href: "/news", label: "News" },
        { href: "/technicals", label: "Technicals" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo & Links */}
                <div className="flex items-center space-x-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">SV</span>
                        </div>
                        <span className="font-semibold text-white hidden sm:block">StockVal</span>
                    </Link>

                    <div className="flex items-center space-x-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Global Ticker Input */}
                <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                    <span className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Ticker</span>
                    <input
                        type="text"
                        value={currentTicker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        className="bg-transparent text-white font-mono font-bold w-16 outline-none uppercase text-center"
                        maxLength={5}
                        placeholder="AAPL"
                    />
                </div>
            </div>
        </nav>
    );
}
