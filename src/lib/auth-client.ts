import { createAuthClient } from "better-auth/react";

// Client auth untuk React/Next.js client components
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
