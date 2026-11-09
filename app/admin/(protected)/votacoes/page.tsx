"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VoteItem = {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  link_url: string;
  is_enabled: boolean;
};

const emptyItem = (key: string, title = ""): VoteItem => ({
  key, title, subtitle: "", description: "", image_url: "", link_url: "", is_enabled: false,
});

const initialItems = [
  emptyItem("poll", "Votar agora"),
  emptyItem("winner_1"),
  emptyItem("winner_2"),
  emptyItem("winner_3"),
];

export default function VotacoesAdminPage() {
  const [items, setItems] = useState<VoteItem[]>(initialItems);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase.from("casa_vote_content").select("*");
      if (!error && data) {
        setItems(initialItems.map((item) => {
          const saved = data.find((row) => row.key === item.key);
          return saved ? { ...item, ...saved } : item;
        }));
      }
      setLoading(false);
    }
    void load();
  }, []);

  function update(key: string, field: keyof VoteItem, value: string | boolean) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: value } : item));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage("A ligação ao Supabase não está configurada."); return; }
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("casa_vote_content").upsert(
      items.map((item) => ({ ...item, updated_at: new Date().toISOString() })),
      { onConflict: "key" },
    );
    setSaving(false);
    setMessage(error ? "Não foi possível guardar. Confirma a configuração da tabela no Supabase." : "Votações guardadas.");
  }

  async function removeItem(item: VoteItem) {
    const label = item.key === "poll" ? "a ligação para a votação" : `o vencedor ${item.key.slice(-1)}`;
    if (!supabase || !window.confirm(`Remover ${label}? O card ficará oculto e os campos serão limpos.`)) return;
    const blank = { title: item.key === "poll" ? "Votar agora" : "", subtitle: "", description: "", image_url: "", link_url: "", is_enabled: false };
    const { error } = await supabase.from("casa_vote_content").update(blank).eq("key", item.key);
    if (error) { setMessage("Não foi possível remover este conteúdo."); return; }
    setItems((current) => current.map((row) => row.key === item.key ? { ...row, ...blank } : row));
    setMessage("Conteúdo removido e oculto.");
  }

  if (loading) return <main className="admin-page"><p>A carregar votações…</p></main>;

  return (
    <main className="admin-page admin-votes">
      <div className="admin-page-heading">
        <div><span className="admin-eyebrow">CONTEÚDO PÚBLICO / DESTAQUES</span><h1>VOTAÇÕES</h1><p>Prepara a ligação da poll e os três vencedores. Cada bloco pode ser publicado separadamente.</p></div>
        <a className="admin-secondary-button" href="/destaques" target="_blank" rel="noreferrer">VER DESTAQUES ↗</a>
      </div>
      <form onSubmit={save} className="admin-vote-form">
        {items.map((item, index) => (
          <section key={item.key} className={`admin-vote-card ${item.is_enabled ? "is-enabled" : ""}`}>
            <header><span className="admin-vote-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{index === 0 ? "BOTÃO PARA VOTAR" : `VENCEDOR ${index}`}</h2><p>{index === 0 ? "Ligação para a poll externa" : "Card de vencedor visível em Destaques"}</p></div>
              <label className="admin-switch"><input type="checkbox" checked={item.is_enabled} onChange={(e) => update(item.key, "is_enabled", e.target.checked)} /><span>{item.is_enabled ? "PUBLICADO" : "OCULTO"}</span></label>
              <button className="admin-delete-inline" type="button" onClick={() => void removeItem(item)}>REMOVER</button>
            </header>
            {item.key === "poll" ? (
              <div className="admin-field"><label>LINK DA POLL</label><input type="url" placeholder="https://…" value={item.link_url} onChange={(e) => update(item.key, "link_url", e.target.value)} /></div>
            ) : (
              <div className="admin-vote-fields">
                <div className="admin-field"><label>NOME / TÍTULO</label><input value={item.title} onChange={(e) => update(item.key, "title", e.target.value)} placeholder="Nome do vencedor" /></div>
                <div className="admin-field"><label>CATEGORIA / SUBTÍTULO</label><input value={item.subtitle} onChange={(e) => update(item.key, "subtitle", e.target.value)} placeholder="Categoria ou edição" /></div>
                <div className="admin-field"><label>IMAGEM (URL)</label><input type="url" value={item.image_url} onChange={(e) => update(item.key, "image_url", e.target.value)} placeholder="https://…" /></div>
                <div className="admin-field"><label>LINK OPCIONAL</label><input type="url" value={item.link_url} onChange={(e) => update(item.key, "link_url", e.target.value)} placeholder="https://…" /></div>
                <div className="admin-field admin-field-wide"><label>DESCRIÇÃO</label><textarea value={item.description} onChange={(e) => update(item.key, "description", e.target.value)} rows={3} placeholder="Uma nota sobre o vencedor" /></div>
              </div>
            )}
          </section>
        ))}
        {message && <p className="admin-save-message" role="status">{message}</p>}
        <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? "A GUARDAR…" : "GUARDAR VOTAÇÕES"}</button>
      </form>
    </main>
  );
}
