
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Highlight = {
  id: string;
  category: string;
  artist_name: string;
  image_url: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  is_published: boolean;
  sort_order: number | null;
};

const categoryLabels: Record<string, string> = {
  artist_of_the_month: "ARTISTA DO MÊS",
  new_school_artist: "ARTISTA DO MÊS (NOVA ESCOLA)",
  new_school_group: "GRUPO DO MÊS (NOVA ESCOLA)",
  old_school_group: "GRUPO DO MÊS (VELHA ESCOLA)",
  freshman_of_the_month: "CALOIRO DO MÊS",
};

export default function HighlightsListPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [orderValues, setOrderValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadHighlights() {
    if (!supabase) {
      setError("Não foi possível ligar ao Supabase.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("casa_artist_of_the_month")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("starts_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Não foi possível carregar os destaques.");
    } else {
      const rows = (data || []) as Highlight[];
      setHighlights(rows);

      const values: Record<string, string> = {};

      rows.forEach((highlight, index) => {
        values[highlight.id] = String(highlight.sort_order ?? index + 1);
      });

      setOrderValues(values);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadHighlights();
  }, []);

  function changeOrder(id: string, value: string) {
    setOrderValues((current) => ({
      ...current,
      [id]: value,
    }));
    setSuccess("");
  }

  async function saveOrder() {
    if (!supabase) return;
    const client = supabase;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updates = highlights.map(async (highlight) => {
        const order = Number(orderValues[highlight.id]);

        if (!Number.isInteger(order) || order < 1) {
          throw new Error(
            `A ordem de ${highlight.artist_name} tem de ser um número inteiro superior a zero.`
          );
        }

        const { error } = await client
          .from("casa_artist_of_the_month")
          .update({ sort_order: order })
          .eq("id", highlight.id);

        if (error) {
          throw error;
        }
      });

      await Promise.all(updates);

      const sorted = highlights
        .map((highlight) => ({
          ...highlight,
          sort_order: Number(orderValues[highlight.id]),
        }))
        .sort((a, b) => {
          return (
            (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
            a.artist_name.localeCompare(b.artist_name)
          );
        });

      setHighlights(sorted);
      setSuccess("Ordem dos destaques guardada com sucesso.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível guardar a nova ordem."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(highlight: Highlight) {
    if (!supabase) return;
    setBusyId(highlight.id);
    const { error } = await supabase.from("casa_artist_of_the_month").update({ is_published: !highlight.is_published }).eq("id", highlight.id);
    setBusyId(null);
    if (error) { setError("Não foi possível alterar a visibilidade."); return; }
    setHighlights((current) => current.map((item) => item.id === highlight.id ? { ...item, is_published: !highlight.is_published } : item));
  }

  async function removeHighlight(highlight: Highlight) {
    if (!supabase || !window.confirm(`Remover “${highlight.artist_name}” dos destaques?`)) return;
    setBusyId(highlight.id);
    const { error } = await supabase.from("casa_artist_of_the_month").delete().eq("id", highlight.id);
    setBusyId(null);
    if (error) { setError("Não foi possível remover o destaque. Confirma as permissões no Supabase."); return; }
    setHighlights((current) => current.filter((item) => item.id !== highlight.id));
  }

  const formatDate = (date: string | null) => {
    if (!date) return "Sem data definida";

    return new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <Link
        href="/admin"
        style={{
          color: "#999",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "1px",
          textDecoration: "none",
        }}
      >
        ← VOLTAR AO PAINEL
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginTop: "36px",
          marginBottom: "32px",
        }}
      >
        <div>
          <p
            style={{
              color: "#F5D900",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "3px",
            }}
          >
            GESTÃO DE CONTEÚDOS
          </p>

          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 52px)",
              fontWeight: 900,
              letterSpacing: "-2px",
              margin: "10px 0",
            }}
          >
            DESTAQUES DO MÊS
          </h1>

          <p style={{ color: "#999", fontSize: "13px" }}>
            {highlights.length} registos na base de dados.
          </p>
        </div>

        <Link
          href="/admin/artista-do-mes"
          style={{
            background: "#F5D900",
            color: "#090909",
            padding: "15px 20px",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "1px",
            textDecoration: "none",
          }}
        >
          + NOVO DESTAQUE
        </Link>
      </div>

      <div
        style={{
          border: "1px solid #333",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            color: "#F5D900",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "1.5px",
            margin: "0 0 8px",
          }}
        >
          ORDEM DOS DESTAQUES
        </p>

        <p
          style={{
            color: "#999",
            fontSize: "12px",
            lineHeight: 1.6,
            margin: "0 0 16px",
          }}
        >
          Define a posição de cada destaque. O número 1 corresponde ao
          primeiro lugar. Guarda as alterações para atualizar a ordem.
        </p>

        <button
          type="button"
          onClick={saveOrder}
          disabled={saving || loading || highlights.length === 0}
          style={{
            background: "#F5D900",
            color: "#090909",
            border: "none",
            padding: "14px 20px",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "1px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving || loading ? 0.5 : 1,
          }}
        >
          {saving ? "A GUARDAR..." : "GUARDAR ORDEM"}
        </button>

        {success && (
          <p style={{ color: "#24A99B", fontSize: "12px", marginBottom: 0 }}>
            {success}
          </p>
        )}

        {error && (
          <p style={{ color: "#F184D2", fontSize: "12px", marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      {loading && (
        <p style={{ color: "#999", fontSize: "13px" }}>
          A carregar destaques...
        </p>
      )}

      {!loading && !error && highlights.length === 0 && (
        <div
          style={{
            border: "1px solid #333",
            padding: "35px",
            color: "#999",
            fontSize: "14px",
          }}
        >
          Ainda não existem destaques. Cria o primeiro para começar.
        </div>
      )}

      <div style={{ display: "grid", gap: "12px" }}>
        {highlights.map((highlight) => (
          <article
            key={highlight.id}
            style={{
              display: "grid",
              gridTemplateColumns: "90px minmax(0, 1fr) 85px auto auto auto",
              alignItems: "center",
              gap: "20px",
              border: "1px solid #333",
              padding: "16px",
            }}
          >
            {highlight.image_url ? (
              <img
                src={highlight.image_url}
                alt={highlight.artist_name}
                style={{
                  width: "90px",
                  height: "90px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  background: "#222",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#777",
                  fontSize: "10px",
                }}
              >
                SEM FOTO
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  color: "#F5D900",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  margin: "0 0 8px",
                }}
              >
                {categoryLabels[highlight.category] || highlight.category}
              </p>

              <h2
                style={{
                  color: "#F2F0E9",
                  fontSize: "19px",
                  fontWeight: 900,
                  margin: "0 0 8px",
                }}
              >
                {highlight.artist_name}
              </h2>

              <p
                style={{
                  color: "#999",
                  fontSize: "11px",
                  margin: 0,
                }}
              >
                {formatDate(highlight.starts_at)}
                {" · "}
                {formatDate(highlight.ends_at)}
              </p>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  marginBottom: "7px",
                }}
              >
                POSIÇÃO
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={orderValues[highlight.id] ?? ""}
                onChange={(event) =>
                  changeOrder(highlight.id, event.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#111",
                  color: "#F5D900",
                  border: "1px solid #555",
                  padding: "11px 8px",
                  fontSize: "16px",
                  fontWeight: 900,
                  textAlign: "center",
                }}
              />
            </div>

            <span
              style={{
                color: highlight.is_published ? "#24A99B" : "#F184D2",
                border: `1px solid ${
                  highlight.is_published ? "#24A99B" : "#F184D2"
                }`,
                padding: "8px 10px",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "1px",
                whiteSpace: "nowrap",
              }}
            >
              {highlight.is_published ? "PUBLICADO" : "RASCUNHO"}
            </span>

            <Link
              href={`/admin/artista-do-mes/${highlight.id}`}
              style={{
                background: "transparent",
                color: "#F5D900",
                border: "1px solid #F5D900",
                padding: "11px 15px",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "1px",
                textDecoration: "none",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              EDITAR
            </Link>
            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
              <button type="button" disabled={busyId === highlight.id} onClick={() => void togglePublished(highlight)} style={{ background: "transparent", color: "#d7ff43", border: "1px solid #4b5631", padding: "11px 12px", fontSize: "9px", fontWeight: 800, cursor: "pointer" }}>{highlight.is_published ? "OCULTAR" : "PUBLICAR"}</button>
              <button type="button" disabled={busyId === highlight.id} onClick={() => void removeHighlight(highlight)} style={{ background: "transparent", color: "#ff8068", border: "1px solid #633a33", padding: "11px 12px", fontSize: "9px", fontWeight: 800, cursor: "pointer" }}>REMOVER</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
