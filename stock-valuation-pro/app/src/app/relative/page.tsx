import RelativeValuationPanel from "@/components/valuation/RelativeValuationPanel";

export default function RelativeValuationPage() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden relative">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[128px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[128px]" />
            </div>

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-12 md:pt-28 md:pb-20">
                <RelativeValuationPanel />
            </main>
        </div>
    );
}
