import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ContactForm from "@/components/ContactForm";

type SiteContent = {
  about_title: string; about_text: string; about_enabled: boolean;
  charts_update_text: string; listeners_update_text: string; data_source_text: string;
  contact_enabled: boolean; contribution_title: string; contribution_text: string;
  contribution_url: string; contribution_bank_info: string; contribution_enabled: boolean;
};

const defaults: SiteContent = {
  about_title: "A música angolana, com contexto.",
  about_text: "A CASA é um projeto independente dedicado a acompanhar, organizar e dar contexto à música angolana. Reunimos charts, dados e histórias para documentar uma cultura em constante movimento.",
  about_enabled: true,
  charts_update_text: "Os charts são atualizados diariamente.",
  listeners_update_text: "Os dados de ouvintes mensais são atualizados mensalmente.",
  data_source_text: "Os dados apresentados pertencem às respetivas plataformas, Apple Music e Spotify. A CASA organiza e apresenta estes indicadores de forma independente.",
  contact_enabled: true,
  contribution_title: "Apoia a CASA",
  contribution_text: "Se este projeto te é útil, podes contribuir para o manter e ajudar a crescer.",
  contribution_url: "", contribution_bank_info: "", contribution_enabled: true,
};

export default async function AboutPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("casa_site_content").select("*").eq("id", 1).maybeSingle();
  const content = { ...defaults, ...(data || {}) } as SiteContent;
  if (!content.about_enabled) notFound();
  return <main className="about-page">
    <header className="about-hero about-card-animate"><span>CASA / SOBRE O PROJETO</span><h1>{content.about_title}</h1><p>{content.about_text}</p></header>
    <section className="about-facts-grid" aria-label="Sobre os dados CASA">
      <article className="about-fact-card about-card-animate"><span>01 / ATUALIZAÇÃO</span><h2>CHARTS</h2><p>{content.charts_update_text}</p><b>DIÁRIO ↗</b></article>
      <article className="about-fact-card about-card-animate"><span>02 / ATUALIZAÇÃO</span><h2>OUVINTES</h2><p>{content.listeners_update_text}</p><b>MENSAL ↗</b></article>
      <article className="about-fact-card about-source-card about-card-animate"><span>03 / FONTES</span><h2>APPLE MUSIC<br />& SPOTIFY</h2><p>{content.data_source_text}</p></article>
    </section>
    {content.contact_enabled ? <section className="about-contact-card about-card-animate"><div className="about-section-copy"><span>04 / FALA CONNOSCO</span><h2>CONTACTO</h2><p>Uma ideia, parceria ou correção? Envia-nos uma mensagem.</p></div><ContactForm /></section> : null}
    {content.contribution_enabled ? <section className="about-contribution-card about-card-animate"><div><span>05 / APOIO AO PROJETO</span><h2>{content.contribution_title}</h2><p>{content.contribution_text}</p>{content.contribution_bank_info ? <pre>{content.contribution_bank_info}</pre> : null}</div>{content.contribution_url ? <a href={content.contribution_url} target="_blank" rel="noreferrer">CONTRIBUIR ↗</a> : null}</section> : null}
    <footer className="about-footer"><strong>CASA®</strong><span>INDEPENDENTE · ANGOLA · MÚSICA</span></footer>
  </main>;
}
