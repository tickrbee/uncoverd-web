import type { Metadata } from "next";
import { MainNav } from "@/components/main-nav";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the uncoverd team. Have a question about our AI-powered investment app or need support? We'd love to hear from you.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="panel contact-panel">
          <h1>Contact Us</h1>
          <p>
            Have a question or feedback? We'd love to hear from you. Send us a message and we'll get back to you as soon
            as possible.
          </p>
          <ContactForm />
        </section>
      </main>
    </>
  );
}


