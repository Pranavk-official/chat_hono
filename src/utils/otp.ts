import { resend } from "@shared/resend";

const from = process.env.FROM_EMAIL || "no-reply@decidr.com";

export default async function sendOtpEmail(
  email: string,
  otp: string,
  expiresAt: string,
  type: "signup" | "login"
) {
  const subject =
    type === "signup" ? "Your Decidr Signup OTP" : "Your Decidr Login OTP";
  return await resend.emails.send({
    from,
    to: email,
    subject,
    html: `
      <h1>${subject}</h1>
      <p>Your OTP is: <b>${otp}</b></p>
      <p>This OTP will expire at: ${expiresAt}</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
}
