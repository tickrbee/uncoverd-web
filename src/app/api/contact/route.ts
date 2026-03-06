import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Send email using a service (you can integrate with SendGrid, Resend, etc.)
    // For now, we'll use a simple fetch to a mail service or log it
    // In production, use a proper email service like Resend, SendGrid, or Nodemailer

    const emailContent = `
New contact form submission from uncoverd.org

Name: ${name}
Email: ${email}

Message:
${message}
    `.trim();

    // TODO: Replace with actual email sending service
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'contact@uncoverd.org',
    //   to: 'lucas.deschenes@tickrbee.com',
    //   subject: 'New Contact Form Submission',
    //   text: emailContent,
    // });

    // For now, log it (in production, use a real email service)
    console.log("Contact form submission:", { name, email, message });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}


