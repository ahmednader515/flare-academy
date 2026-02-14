import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { SessionManager } from "@/lib/session-manager";

export const auth = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in");
  }

  return {
    userId: session.user.id,
    user: session.user,
  };
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await db.user.findUnique({
          where: {
            phoneNumber: credentials.phoneNumber,
          },
          cacheStrategy: { ttl: 0 }, // No cache for login - must be fresh
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Check if user is already logged in
        if (user.isActive) {
          throw new Error("UserAlreadyLoggedIn");
        }

        return {
          id: user.id,
          name: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Remove maxAge to make sessions persist indefinitely
    updateAge: 0, // Disable session updates
  },
  jwt: {
    // Remove maxAge to make JWT tokens persist indefinitely
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async session({ token, session }) {
      if (token && token.sessionId) {
        try {
          // Validate session on each request
          const { isValid } = await SessionManager.validateSession(token.sessionId as string);
          
          if (!isValid) {
            // Session is invalid - return empty session to trigger re-authentication
            // Don't return null as it causes NextAuth client errors
            return {
              ...session,
              user: {
                id: "",
                name: "",
                email: "",
                role: "",
              },
              expires: "1970-01-01T00:00:00.000Z", // Expired date to force re-auth
            };
          }

          session.user.id = token.id as string;
          session.user.name = token.name as string;
          session.user.phoneNumber = token.phoneNumber as string;
          session.user.image = token.picture ?? undefined;
          session.user.role = token.role as string;
        } catch (error) {
          console.error("Session validation error:", error);
          // Return expired session instead of null
          return {
            ...session,
            user: {
              id: "",
              name: "",
              email: "",
            },
            expires: "1970-01-01T00:00:00.000Z",
          };
        }
      }

      // If no token or sessionId, ensure we have valid user data
      if (token) {
        session.user.id = (token.id as string) || "";
        session.user.name = (token.name as string) || "";
        session.user.phoneNumber = (token.phoneNumber as string) || "";
        session.user.image = token.picture ?? undefined;
        session.user.role = (token.role as string) || "";
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          // When user first signs in, create a new session
          const sessionId = await SessionManager.createSession(user.id);
          
          return {
            ...token,
            id: user.id,
            name: user.name,
            phoneNumber: user.phoneNumber,
            picture: (user as any).picture,
            role: user.role,
            sessionId: sessionId,
          };
        } catch (error) {
          console.error("Session creation error:", error);
          throw error;
        }
      }

      // On subsequent requests, return the existing token
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 