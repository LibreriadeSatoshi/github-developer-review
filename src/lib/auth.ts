import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// C5: Type-safe session.accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: true };

const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  cookies: {
    sessionToken:      { name: "authjs.session-token",       options: cookieOptions },
    callbackUrl:       { name: "authjs.callback-url",        options: { ...cookieOptions, httpOnly: false } },
    csrfToken:         { name: "authjs.csrf-token",          options: cookieOptions },
    pkceCodeVerifier:  { name: "authjs.pkce.code_verifier",  options: cookieOptions },
    state:             { name: "authjs.state",               options: cookieOptions },
    nonce:             { name: "authjs.nonce",               options: cookieOptions },
  },
  providers: [GitHub({ checks: ["state"] })],
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});

export { handlers, auth, signIn, signOut };
