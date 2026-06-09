"use client";

import { FormEvent, useState } from "react";

// Where contact mail goes — keep in sync with CONTACT_EMAIL_TO on the server.
const CONTACT_TO = "admin@uncoverd.org";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    // 1. Best-effort capture to the DB so no lead is ever lost — but never
    //    block the real send on it.
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
    } catch {
      /* the mailto below is the actual delivery path */
    }

    // 2. The real send: open the visitor's email app with everything
    //    pre-filled. A direct email reaches the inbox and starts a reply-able
    //    thread — no dependency on our outbound email being configured.
    const subject = `Message from ${name.trim() || "a visitor"} via uncoverd.org`;
    const body = `${message.trim()}\n\n— ${name.trim()}${email.trim() ? ` (${email.trim()})` : ""}`;
    const href = `mailto:${CONTACT_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
    window.location.href = href;

    setNotice("Your email app should open with the message ready — just hit send there. If nothing opened, email us directly at " + CONTACT_TO + ".");
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <div className="contact-form__field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </div>

      <div className="contact-form__field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>

      <div className="contact-form__field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message..."
          rows={6}
          required
        />
      </div>

      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Opening your email app..." : "Send Message"}
      </button>
      <p className="contact-form__hint" style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
        Sends from your own email app to {CONTACT_TO} — so we can reply to you directly.
      </p>

      {notice ? <p className="notice notice--ok">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}
    </form>
  );
}
