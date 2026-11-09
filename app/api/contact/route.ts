import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 180) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 5000) : "";
    const honeypot = typeof body.website === "string" ? body.website.trim() : "";
    if (honeypot) return NextResponse.json({ ok: true });
    if (!name || !subject || message.length < 8 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.CASA_FROM_EMAIL;
    if (!url || !serviceKey || !resendKey || !from) {
      return NextResponse.json({ error: "O envio de email ainda não está configurado." }, { status: 503 });
    }
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [{ data: contact }, { data: content }] = await Promise.all([
      supabase.from("casa_contact_settings").select("recipient_email").eq("id", 1).maybeSingle(),
      supabase.from("casa_site_content").select("contact_enabled").eq("id", 1).maybeSingle(),
    ]);
    const recipient = contact?.recipient_email?.trim();
    if (!content?.contact_enabled || !recipient) return NextResponse.json({ error: "O formulário de contacto está desativado." }, { status: 503 });

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: `[CASA] ${subject}`,
        text: `Mensagem enviada pelo site CASA\n\nNome: ${name}\nEmail: ${email}\nAssunto: ${subject}\n\n${message}`,
        html: `<h2>Mensagem enviada pelo site CASA</h2><p><b>Nome:</b> ${escapeHtml(name)}<br><b>Email:</b> ${escapeHtml(email)}<br><b>Assunto:</b> ${escapeHtml(subject)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
      }),
    });
    if (!send.ok) return NextResponse.json({ error: "O serviço de email não aceitou a mensagem." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar a mensagem." }, { status: 400 });
  }
}
