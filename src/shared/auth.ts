import { betterAuth } from "better-auth";
import { jwt, openAPI, emailOTP } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";

import prisma from "@shared/primsa";
import { generateOtp } from "@utils/random";
import { OTP_LENGTH } from "@shared/constants";
import sendEmail from "@utils/email";
// import env from '@/shared/env'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Allow requests from the frontend development server
  trustedOrigins: ["http://localhost:5173"],
  emailAndPassword: {
    enabled: false,
    autoSignIn: false,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  plugins: [
    jwt(),
    openAPI(),
    emailOTP({
      otpLength: OTP_LENGTH,
      expiresIn: 600,
      generateOTP() {
        return process.env.NODE_ENV === "development"
          ? "123456"
          : generateOtp(OTP_LENGTH);
      },
      async sendVerificationOTP({ email, otp, type }) {
        // Implement your email sending logic here
        if (process.env.NODE_ENV === "development") {
          console.log(`Sending ${type} OTP to ${email}: ${otp}`);
        } else {
          await sendEmail(email, otp);
        }
      },
    }),
  ],
  //   socialProviders: {
  //     github: {
  //       clientId: env.GITHUB_CLIENT_ID,
  //       clientSecret: env.GITHUB_CLIENT_SECRET,
  //     },
  //     google: {
  //       clientId: env.GOOGLE_CLIENT_ID,
  //       clientSecret: env.GOOGLE_CLIENT_SECRET,
  //     },
  //   },
});

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
