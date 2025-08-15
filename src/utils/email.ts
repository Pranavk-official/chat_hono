import { resend } from "@shared/resend";

const from = process.env.FROM_EMAIL || "no-reply@zrato.com";

export default async (email: string, otp: string) => {
  return await resend.emails.send({
    from,
    to: email,
    subject: "Verify your account",
    html: `
            <h1>Verify your Zrato account</h1>
            <p>Your OTP is: ${otp}</p>
            <p>If you did not request this email, please ignore it.</p>
        `,
  });
};
