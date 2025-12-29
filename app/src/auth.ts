import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.username || !credentials?.password) {
                    return null
                }

                try {
                    // Replace with your actual WordPress site URL
                    // For local development, this might need to be an env var
                    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || "http://localhost/wordpress"

                    const res = await fetch(`${wpUrl}/wp-json/jwt-auth/v1/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            username: credentials.username,
                            password: credentials.password,
                        }),
                    })

                    if (!res.ok) {
                        console.error("Auth failed:", await res.text())
                        return null
                    }

                    const user = await res.json()

                    if (user && user.token) {
                        return {
                            id: user.user_email, // or user.user_nicename
                            email: user.user_email,
                            name: user.user_display_name,
                            accessToken: user.token,
                        }
                    }

                    return null
                } catch (error) {
                    console.error("Auth error:", error)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = (user as any).accessToken
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).accessToken = token.accessToken
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
})
