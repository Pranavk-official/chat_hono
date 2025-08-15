import { resend } from "@shared/resend";

const from = process.env.FROM_EMAIL || "no-reply@decidr.com";

export default async function sendWelcomeEmail(email: string, name: string) {
  return await resend.emails.send({
    from,
    to: email,
    subject: "Welcome to Decidr!",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for signing up for Decidr. We're excited to have you on board.</p>
      <p>If you have any questions, reply to this email.</p>
    `,
  });
}
