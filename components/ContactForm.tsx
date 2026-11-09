"use client";

import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(data.entries())),
    }).catch(() => null);
    if (!response?.ok) { setState("error"); return; }
    form.reset();
    setState("sent");
  }

  return <form className="about-contact-form" onSubmit={submit}>
    <label>O TEU NOME<input name="name" autoComplete="name" required maxLength={120} /></label>
    <label>O TEU EMAIL<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>ASSUNTO<input name="subject" required maxLength={180} /></label>
    <label>MENSAGEM<textarea name="message" rows={5} required maxLength={5000} /></label>
    <label className="about-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button type="submit" disabled={state === "sending"}>{state === "sending" ? "A ENVIAR…" : "ENVIAR MENSAGEM ↗"}</button>
    {state === "sent" ? <p role="status">Obrigado. A tua mensagem foi enviada.</p> : null}
    {state === "error" ? <p role="alert">Não foi possível enviar a mensagem agora. Tenta novamente mais tarde.</p> : null}
  </form>;
}
