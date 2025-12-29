import { TickerHeader } from "@/components/TickerHeader";
import { ValuationControls } from "@/components/ValuationControls";
import { ValuationResult } from "@/components/ValuationResult";
import RawFinancials from "@/components/RawFinancials";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden relative">

      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[128px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-12 md:pt-28 md:pb-20">
        <TickerHeader />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-12">
          {/* Left Column: Controls */}
          <div className="md:col-span-7 space-y-8">
            <ValuationControls />
            <RawFinancials />

            {/* Additional Info / Explainer */}
            <div className="p-6 rounded-2xl border border-zinc-800/50 text-sm text-zinc-500">
              <h4 className="font-semibold text-zinc-400 mb-2">How it works</h4>
              <p>
                This model uses a Discounted Cash Flow (DCF) analysis to estimate the intrinsic value of an investment.
                Adjust the assumptions above to see how they impact the fair value based on projected future free cash flows.
              </p>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="md:col-span-5 space-y-6">
            <div className="sticky top-8">
              <ValuationResult />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
