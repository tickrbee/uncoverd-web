import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminClient } from "@/lib/supabase/admin";

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

    const name_ = String(name).trim().slice(0, 200);
    const email_ = String(email).trim().slice(0, 200);
    const message_ = String(message).trim().slice(0, 5000);

    // 1. ALWAYS persist the message to Supabase first. This is the source of
    // truth — even if Resend isn't configured/verified, submissions are captured
    // (readable in the contact_messages table), so visitors can always reach us.
    let stored = false;
    try {
      const sb = getAdminClient("public");
      const { error } = await sb.from("contact_messages").insert({ name: name_, email: email_, message: message_ });
      stored = !error;
      if (error) console.error("[contact] store failed:", error);
    } catch (e) {
      console.error("[contact] store threw:", e);
    }

    // 2. Best-effort email delivery (works once the Resend domain is verified).
    let emailed = false;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const to = process.env.CONTACT_EMAIL_TO ?? "admin@uncoverd.org";
      const from = process.env.CONTACT_EMAIL_FROM ?? process.env.DIGEST_EMAIL_FROM ?? "uncoverd <contact@uncoverd.org>";
      const text = `New contact form submission from uncoverd.org\n\nName: ${name_}\nEmail: ${email_}\n\nMessage:\n${message_}`;
      const html = [
        "<h2>New contact form submission</h2>",
        `<p><strong>Name:</strong> ${escapeHtml(name_)}<br/>`,
        `<strong>Email:</strong> ${escapeHtml(email_)}</p>`,
        "<p><strong>Message:</strong></p>",
        `<p style="white-space:pre-wrap">${escapeHtml(message_)}</p>`,
      ].join("");
      try {
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({ from, to, replyTo: email_, subject: `New contact form message from ${name_}`, text, html });
        emailed = !error;
        if (error) console.error("[contact] resend send failed (message still stored):", error);
      } catch (e) {
        console.error("[contact] resend threw (message still stored):", e);
      }
    }

    // Success as long as we captured the message somewhere.
    if (stored || emailed) return NextResponse.json({ success: true });
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
