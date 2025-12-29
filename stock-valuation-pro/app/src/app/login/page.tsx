import LoginForm from "@/components/auth/login-form"
import { TrendingUp } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-black selection:bg-indigo-500 selection:text-white">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl">
                        <TrendingUp className="h-10 w-10 text-indigo-400" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                    Stock Valuation Pro
                </h2>
                <p className="mt-2 text-center text-sm text-gray-400">
                    Sign in to access your dashboard and analysis tools
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
                <div className="bg-white/5 backdrop-blur-xl px-4 py-8 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl sm:px-10 border-t border-white/5">
                    <LoginForm />
                </div>

                <p className="mt-10 text-center text-sm text-gray-400">
                    Powered by Advanced AI & Financial Modeling
                </p>
            </div>
        </div>
    )
}
