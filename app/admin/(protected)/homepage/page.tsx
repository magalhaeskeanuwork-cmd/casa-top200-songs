"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type HomeSection = { section_key: "articles" | "interviews" | "voting"; title: string; sort_order: number; is_enabled: boolean };
type HomeCard = { id: string; content_type: "article" | "interview"; content_id: string; title: string; subtitle: string; category: string; image_url: string; link_url: string; sort_order: number; is_enabled: boolean };
type SourceItem = { id: string; title: string; subtitle?: string | null; category?: string | null; image_url?: string | null; slug?: string; excerpt?: string | null; link_url?: string | null };
const sectionNames: Record<HomeSection["section_key"], string> = { articles: "ARTIGOS", interviews: "ENTREVISTAS", voting: "VOTAÇÕES" };

export default function HomepageAdminPage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [articles, setArticles] = useState<SourceItem[]>([]);
  const [interviews, setInterviews] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setMessage("A ligação ao Supabase não está configurada."); setLoading(false); return; }
      const [sectionResult, cardsResult, articleResult, interviewResult] = await Promise.all([
        supabase.from("casa_homepage_sections").select("*").order("sort_order"),
        supabase.from("casa_homepage_editorial").select("*").order("sort_order"),
        supabase.from("casa_articles").select("id,title,slug,excerpt,category,cover_image_url").eq("status", "published").order("published_at", { ascending: false }),
        supabase.from("casa_editorial_highlights").select("id,title,subtitle,description,category,image_url,link_url").eq("section", "interviews").eq("is_published", true).order("sort_order"),
      ]);
      if (sectionResult.data) setSections(sectionResult.data as HomeSection[]);
      if (cardsResult.data) setCards(cardsResult.data as HomeCard[]);
      if (articleResult.data) setArticles(articleResult.data.map((row) => ({ ...row, image_url: row.cover_image_url })) as SourceItem[]);
      if (interviewResult.data) setInterviews(interviewResult.data as SourceItem[]);
      if (sectionResult.error || cardsResult.error) setMessage("Executa supabase/cms-expansion.sql no Supabase para ativar a gestão da homepage.");
      setLoading(false);
    }
    void load();
  }, []);

  const selectedIds = useMemo(() => new Set(cards.map((item) => `${item.content_type}:${item.content_id}`)), [cards]);

  async function saveSections() {
    if (!supabase) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("casa_homepage_sections").upsert(sections.map((section, index) => ({ ...section, sort_order: index + 1, updated_at: new Date().toISOString() })), { onConflict: "section_key" });
    setSaving(false); setMessage(error ? "Não foi possível guardar as secções." : "Visibilidade e ordem guardadas.");
  }

  async function addCard(type: HomeCard["content_type"], item: SourceItem) {
    if (!supabase) return;
    const link = type === "article" ? `/artigos/${encodeURIComponent(item.slug || "")}` : item.link_url || "/artigos";
    const position = cards.filter((card) => card.content_type === type).length + 1;
    const { data, error } = await supabase.from("casa_homepage_editorial").insert({
      content_type: type, content_id: item.id, title: item.title, subtitle: item.subtitle || item.excerpt || "",
      category: item.category || (type === "article" ? "ARTIGO" : "ENTREVISTA"), image_url: item.image_url || "",
      link_url: link, sort_order: position, is_enabled: true,
    }).select("*").single();
    if (error) { setMessage(error.code === "23505" ? "Este conteúdo já está na homepage." : "Não foi possível adicionar o conteúdo."); return; }
    setCards((current) => [...current, data as HomeCard]);
    setMessage(`${type === "article" ? "Artigo" : "Entrevista"} adicionada à homepage.`);
  }

  async function toggleCard(card: HomeCard) {
    if (!supabase) return;
    const { error } = await supabase.from("casa_homepage_editorial").update({ is_enabled: !card.is_enabled }).eq("id", card.id);
    if (!error) setCards((current) => current.map((item) => item.id === card.id ? { ...item, is_enabled: !card.is_enabled } : item));
  }

  async function moveCard(card: HomeCard, direction: -1 | 1) {
    if (!supabase) return;
    const group = cards.filter((item) => item.content_type === card.content_type).sort((a, b) => a.sort_order - b.sort_order);
    const index = group.findIndex((item) => item.id === card.id);
    const other = group[index + direction];
    if (!other) return;
    const { error } = await Promise.all([
      supabase.from("casa_homepage_editorial").update({ sort_order: other.sort_order }).eq("id", card.id),
      supabase.from("casa_homepage_editorial").update({ sort_order: card.sort_order }).eq("id", other.id),
    ]).then((results) => ({ error: results.find((result) => result.error)?.error }));
    if (error) { setMessage("Não foi possível alterar a ordem."); return; }
    setCards((current) => current.map((item) => item.id === card.id ? { ...item, sort_order: other.sort_order } : item.id === other.id ? { ...item, sort_order: card.sort_order } : item));
  }

  async function removeCard(card: HomeCard) {
    if (!supabase || !window.confirm(`Remover “${card.title}” da homepage?`)) return;
    const { error } = await supabase.from("casa_homepage_editorial").delete().eq("id", card.id);
    if (error) { setMessage("Não foi possível remover o card."); return; }
    setCards((current) => current.filter((item) => item.id !== card.id));
  }

  function moveSection(index: number, step: -1 | 1) {
    const next = [...sections]; const swap = index + step;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setSections(next);
  }

  if (loading) return <main className="admin-page"><p>A carregar homepage…</p></main>;
  return <main className="admin-page">
    <div className="admin-page-heading"><div><span className="admin-eyebrow">CASA / PUBLICAÇÃO</span><h1>HOMEPAGE</h1><p>Escolhe o que aparece na homepage e define a ordem das secções e dos conteúdos editoriais.</p></div><a className="admin-secondary-button" href="/" target="_blank" rel="noreferrer">VER HOMEPAGE ↗</a></div>
    {message && <p className="admin-save-message" role="status">{message}</p>}
    <section className="admin-vote-form">
      <div className="admin-vote-card"><header><span className="admin-vote-number">01</span><div><h2>SECÇÕES DA HOMEPAGE</h2><p>Oculta ou publica cada área. As setas definem a ordem.</p></div></header>
        <div className="admin-home-section-list">{sections.map((section, index) => <div className="admin-home-section-row" key={section.section_key}>
          <span className="admin-vote-number">{String(index + 1).padStart(2, "0")}</span><strong>{sectionNames[section.section_key]}</strong>
          <div className="admin-home-order"><button type="button" aria-label="Mover para cima" onClick={() => moveSection(index, -1)}>↑</button><button type="button" aria-label="Mover para baixo" onClick={() => moveSection(index, 1)}>↓</button></div>
          <label className="admin-switch"><input type="checkbox" checked={section.is_enabled} onChange={(event) => setSections((current) => current.map((item) => item.section_key === section.section_key ? { ...item, is_enabled: event.target.checked } : item))} /><span>{section.is_enabled ? "VISÍVEL" : "OCULTO"}</span></label>
        </div>)}<button className="admin-primary-button" type="button" disabled={saving} onClick={() => void saveSections()}>{saving ? "A GUARDAR…" : "GUARDAR SECÇÕES"}</button></div>
      </div>
      <section className="admin-vote-card"><header><span className="admin-vote-number">02</span><div><h2>CONTEÚDOS DA HOMEPAGE</h2><p>Adiciona artigos e entrevistas publicados, ordena, oculta ou remove cada card.</p></div></header>
        <div className="admin-home-content-columns">
          <div><h3>ARTIGOS DISPONÍVEIS</h3>{articles.filter((item) => !selectedIds.has(`article:${item.id}`)).map((item) => <div className="admin-home-source" key={item.id}><span>{item.title}</span><button type="button" onClick={() => void addCard("article", item)}>ADICIONAR +</button></div>)}{articles.filter((item) => !selectedIds.has(`article:${item.id}`)).length === 0 && <p className="admin-muted">Sem novos artigos publicados.</p>}</div>
          <div><h3>ENTREVISTAS DISPONÍVEIS</h3>{interviews.filter((item) => !selectedIds.has(`interview:${item.id}`)).map((item) => <div className="admin-home-source" key={item.id}><span>{item.title}</span><button type="button" onClick={() => void addCard("interview", item)}>ADICIONAR +</button></div>)}{interviews.filter((item) => !selectedIds.has(`interview:${item.id}`)).length === 0 && <p className="admin-muted">Sem novas entrevistas publicadas.</p>}</div>
        </div>
        {(["article", "interview"] as const).map((type) => <div className="admin-home-selected" key={type}><h3>{type === "article" ? "ARTIGOS NA HOMEPAGE" : "ENTREVISTAS NA HOMEPAGE"}</h3>{cards.filter((card) => card.content_type === type).sort((a, b) => a.sort_order - b.sort_order).map((card, index, list) => <div className={`admin-home-source ${card.is_enabled ? "" : "is-hidden"}`} key={card.id}><span><b>{String(index + 1).padStart(2, "0")}</b> {card.title}<small>{card.is_enabled ? "VISÍVEL" : "OCULTO"}</small></span><div className="admin-home-actions"><button type="button" onClick={() => void moveCard(card, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => void moveCard(card, 1)} disabled={index === list.length - 1}>↓</button><button type="button" onClick={() => void toggleCard(card)}>{card.is_enabled ? "OCULTAR" : "PUBLICAR"}</button><button type="button" onClick={() => void removeCard(card)}>REMOVER</button></div></div>)}{cards.filter((card) => card.content_type === type).length === 0 && <p className="admin-muted">Ainda não há conteúdo selecionado.</p>}</div>)}
      </section>
    </section>
  </main>;
}
