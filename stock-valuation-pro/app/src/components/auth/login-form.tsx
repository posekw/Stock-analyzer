"use client"

import { useActionState } from "react"
import { authenticate } from "@/app/lib/actions"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"

export default function LoginForm() {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/"
    const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined)

    return (
        <form action={formAction} className="space-y-6">
            <div>
                <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-200"
                >
                    Username
                </label>
                <div className="mt-1">
                    <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 backdrop-blur-sm transition-all focus:bg-white/10"
                    />
                </div>
            </div>

            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-200"
                >
                    Password
                </label>
                <div className="mt-1">
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 backdrop-blur-sm transition-all focus:bg-white/10"
                    />
                </div>
            </div>

            <input type="hidden" name="redirectTo" value={callbackUrl} />

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 bg-white/5"
                    />
                    <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-gray-300"
                    >
                        Remember me
                    </label>
                </div>

                <div className="text-sm leading-6">
                    <a
                        href="#"
                        className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Forgot password?
                    </a>
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            Sign in
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                    )}
                </button>
            </div>

            {errorMessage && (
                <div
                    className="flex h-8 items-end space-x-1"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
            )}
        </form>
    )
}
