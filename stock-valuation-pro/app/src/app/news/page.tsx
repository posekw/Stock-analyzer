import { NewsFeed } from "@/components/news/NewsFeed";

export default function NewsPage() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-900/15 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/15 rounded-full blur-[128px]" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
                <NewsFeed />
            </main>
        </div>
    );
}
