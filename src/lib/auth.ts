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

const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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
