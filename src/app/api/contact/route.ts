import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_EMAIL_TO ?? "admin@uncoverd.org";
    // `from` must be on a Resend-verified domain. Reuse the digest sender if it's
    // already verified, else fall back to a uncoverd.org address.
    const from = process.env.CONTACT_EMAIL_FROM ?? process.env.DIGEST_EMAIL_FROM ?? "uncoverd <contact@uncoverd.org>";

    if (!apiKey) {
      // Fail loud (not the old silent "success") so unconfigured deploys are obvious.
      console.error("[contact] RESEND_API_KEY not set — submission NOT delivered:", { name, email });
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const name_ = String(name).trim().slice(0, 200);
    const email_ = String(email).trim().slice(0, 200);
    const message_ = String(message).trim().slice(0, 5000);

    const text = `New contact form submission from uncoverd.org\n\nName: ${name_}\nEmail: ${email_}\n\nMessage:\n${message_}`;
    const html = [
      "<h2>New contact form submission</h2>",
      `<p><strong>Name:</strong> ${escapeHtml(name_)}<br/>`,
      `<strong>Email:</strong> ${escapeHtml(email_)}</p>`,
      "<p><strong>Message:</strong></p>",
      `<p style="white-space:pre-wrap">${escapeHtml(message_)}</p>`,
    ].join("");

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo: email_, // reply goes straight to the person who wrote in
      subject: `New contact form message from ${name_}`,
      text,
      html,
    });

    if (error) {
      console.error("[contact] resend send failed:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 502 });
    }

    return NextResponse.json({ success: true, id: data?.id ?? null });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
