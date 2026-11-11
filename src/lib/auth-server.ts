import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

// Tentukan baseURL secara otomatis untuk local dev, preview Vercel, maupun custom domain
const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

// Konfigurasi Better Auth untuk GateIn
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "gatein-secret-key-development-minimum-32-chars-long",
  baseURL: appUrl,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? {
          facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          },
        }
      : {}),
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "facebook"],
    },
  },
});
