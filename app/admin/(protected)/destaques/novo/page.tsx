"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NovoDestaquePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [section, setSection] = useState("featured");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [cardSize, setCardSize] = useState("medium");
  const [sortOrder, setSortOrder] = useState("1");
  const [isPublished, setIsPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    if (["featured", "interviews", "awards", "news"].includes(requestedSection || "")) {
      setSection(requestedSection || "featured");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const client = supabase;
    if (!client) {
      setError("A ligação ao Supabase não está configurada.");
      setSaving(false);
      return;
    }

    let imageUrl: string | null = null;

    if (imageFile) {
      const extension = imageFile.name.split(".").pop() || "jpg";
      const fileName = `editorial-${Date.now()}.${extension}`;
      const filePath = `editorial/${fileName}`;

      const { error: uploadError } = await client.storage
        .from("casa-artists")
        .upload(filePath, imageFile, { upsert: false });

      if (uploadError) {
        setError("Não foi possível carregar a imagem.");
        setSaving(false);
        return;
      }

      const { data } = client.storage
        .from("casa-artists")
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
    }

    const { error: insertError } = await client
      .from("casa_editorial_highlights")
      .insert({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        category: category.trim() || null,
        section,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        link_label: linkLabel.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        card_size: cardSize,
        sort_order: Number(sortOrder) || 1,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      });

    if (insertError) {
      setError("Não foi possível guardar o card. Verifica os dados e tenta novamente.");
      setSaving(false);
      return;
    }

    router.push(section === "interviews"
      ? "/admin/destaques?section=interviews"
      : "/admin/destaques");
    router.refresh();
  }

  const styles = {
    page: {
      maxWidth: "850px",
      margin: "0 auto",
      padding: "48px 24px 80px",
      color: "var(--foreground, #090909)",
    } as const,
    eyebrow: {
      fontSize: "11px",
      letterSpacing: "0.12em",
      opacity: 0.55,
      marginBottom: "10px",
    },
    heading: {
      fontSize: "clamp(30px, 5vw, 46px)",
      fontWeight: 900,
      letterSpacing: "-0.05em",
      margin: "0 0 32px",
    },
    form: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "22px",
    },
    field: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px",
    },
    label: {
      fontSize: "10px",
      fontWeight: 900,
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
    },
    input: {
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "14px",
      border: "1px solid rgba(128,128,128,0.5)",
      background: "var(--background, #F2F0E9)",
      color: "inherit",
      fontSize: "14px",
    },
    textarea: {
      width: "100%",
      boxSizing: "border-box" as const,
      minHeight: "130px",
      padding: "14px",
      border: "1px solid rgba(128,128,128,0.5)",
      background: "var(--background, #F2F0E9)",
      color: "inherit",
      fontSize: "14px",
      resize: "vertical" as const,
    },
    select: {
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "14px",
      border: "1px solid rgba(128,128,128,0.5)",
      background: "var(--background, #F2F0E9)",
      color: "inherit",
      fontSize: "14px",
    },
    button: {
      padding: "16px 22px",
      border: "1px solid #090909",
      background: "#F5D900",
      color: "#090909",
      fontSize: "11px",
      fontWeight: 900,
      letterSpacing: "0.08em",
      cursor: "pointer",
    },
    secondary: {
      padding: "16px 22px",
      border: "1px solid currentColor",
      color: "inherit",
      textDecoration: "none",
      fontSize: "11px",
      fontWeight: 900,
      letterSpacing: "0.08em",
    },
    error: {
      padding: "14px",
      border: "1px solid #C43D3D",
      color: "#C43D3D",
      fontSize: "13px",
    },
    checkbox: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "12px",
      fontWeight: 800,
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap" as const,
      marginTop: "10px",
    },
    hint: {
      fontSize: "12px",
      lineHeight: 1.5,
      opacity: 0.65,
    },
  };

  return (
    <main style={styles.page}>
      <p style={styles.eyebrow}>CMS CASA / CONTEÚDO EDITORIAL</p>
      <h1 style={styles.heading}>NOVO CARD</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Título *</label>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={styles.input}
            placeholder="Título do destaque"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Subtítulo</label>
          <input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            style={styles.input}
            placeholder="Subtítulo opcional"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Descrição</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            style={styles.textarea}
            placeholder="Texto do destaque"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Categoria</label>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={styles.input}
            placeholder="Ex.: ENTREVISTA, REVIEW, NOTÍCIA"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Secção do site</label>
          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            style={styles.select}
          >
            <option value="featured">Homepage + página Destaques</option>
            <option value="awards">Prémios CASA</option>
            <option value="interviews">Conversas</option>
            <option value="news">Últimas da CASA</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Imagem</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setImageFile(event.target.files?.[0] || null)
            }
            style={styles.input}
          />
          <small>Formatos de imagem comuns. A imagem será guardada no Supabase.</small>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Ligação do card</label>
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            style={styles.input}
            placeholder="https://..."
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Texto da ligação</label>
          <input
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
            style={styles.input}
            placeholder="Ex.: LER ARTIGO"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Link da música no Spotify</label>
          <input
            type="url"
            value={spotifyUrl}
            onChange={(event) => setSpotifyUrl(event.target.value)}
            style={styles.input}
            placeholder="https://open.spotify.com/track/..."
          />
          <small style={styles.hint}>
            Cola o link de partilha de uma música, álbum ou playlist do Spotify.
            O site poderá apresentá-lo como um leitor incorporado no card.
          </small>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Dimensão do card</label>
          <select
            value={cardSize}
            onChange={(event) => setCardSize(event.target.value)}
            style={styles.select}
          >
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="featured">Destaque</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Posição na página</label>
          <input
            type="number"
            min="1"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            style={styles.input}
          />
        </div>

        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
          />
          Publicar este card
        </label>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? "A GUARDAR..." : "GUARDAR CARD"}
          </button>

          <Link href="/admin/destaques" style={styles.secondary}>
            CANCELAR
          </Link>
        </div>
      </form>
    </main>
  );
}
