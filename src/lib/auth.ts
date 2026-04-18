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

async function isOrgMember(accessToken: string, org: string): Promise<boolean> {
  const res = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return false;
  const orgs = (await res.json()) as Array<{ login: string }>;
  return orgs.some((o) => o.login.toLowerCase() === org.toLowerCase());
}

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
  providers: [
    GitHub({
      checks: ["state"],
      authorization: { params: { scope: "read:user user:email read:org" } },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      const org = process.env.AUTH_GITHUB_ORG;
      if (!org) return true;
      const token = account?.access_token;
      if (!token) return "/auth/denied";
      try {
        return (await isOrgMember(token, org)) || "/auth/denied";
      } catch {
        return "/auth/denied";
      }
    },
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
