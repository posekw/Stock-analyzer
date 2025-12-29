import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnLogin = req.nextUrl.pathname.startsWith("/login")
    const isPublic = isOnLogin

    if (!isPublic && !isLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.nextUrl))
    }

    if (isOnLogin && isLoggedIn) {
        return NextResponse.redirect(new URL("/", req.nextUrl))
    }



    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
