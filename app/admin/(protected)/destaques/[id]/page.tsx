"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EditorialHighlight = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  spotify_url: string | null;
  section: string;
  card_size: string;
  sort_order: number;
  is_published: boolean;
};

export default function EditarDestaquePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [section, setSection] = useState("featured");
  const [cardSize, setCardSize] = useState("medium");
  const [sortOrder, setSortOrder] = useState("1");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    async function loadHighlight() {
      const client = supabase;
      if (!client) {
        setError("A ligação ao Supabase não está configurada.");
        setLoading(false);
        return;
      }

      const { data, error } = await client
        .from("casa_editorial_highlights")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("Não foi possível encontrar este card.");
        setLoading(false);
        return;
      }

      const highlight = data as EditorialHighlight;

      setTitle(highlight.title || "");
      setSubtitle(highlight.subtitle || "");
      setDescription(highlight.description || "");
      setCategory(highlight.category || "");
      setImageUrl(highlight.image_url || "");
      setLinkUrl(highlight.link_url || "");
      setLinkLabel(highlight.link_label || "");
      setSpotifyUrl(highlight.spotify_url || "");
      setSection(highlight.section || "featured");
      setCardSize(highlight.card_size || "medium");
      setSortOrder(String(highlight.sort_order || 1));
      setIsPublished(highlight.is_published);
      setLoading(false);
    }

    if (id) loadHighlight();
  }, [id]);

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

    let updatedImageUrl = imageUrl;

    if (imageFile) {
      const extension = imageFile.name.split(".").pop() || "jpg";
      const fileName = `editorial-${Date.now()}.${extension}`;
      const filePath = `editorial/${fileName}`;

      const { error: uploadError } = await client.storage
        .from("casa-artists")
        .upload(filePath, imageFile, { upsert: false });

      if (uploadError) {
        setError("Não foi possível carregar a nova imagem.");
        setSaving(false);
        return;
      }

      const { data } = client.storage
        .from("casa-artists")
        .getPublicUrl(filePath);

      updatedImageUrl = data.publicUrl;
    }

    const { error: updateError } = await client
      .from("casa_editorial_highlights")
      .update({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        category: category.trim() || null,
        image_url: updatedImageUrl || null,
        link_url: linkUrl.trim() || null,
        link_label: linkLabel.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        section,
        card_size: cardSize,
        sort_order: Number(sortOrder) || 1,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      setError("Não foi possível guardar as alterações.");
      setSaving(false);
      return;
    }

    const returnSection = new URLSearchParams(window.location.search).get("section");
    router.push(returnSection === "interviews"
      ? "/admin/destaques?section=interviews"
      : "/admin/destaques");
    router.refresh();
  }

  async function removeImage() {
    setImageUrl("");
    setImageFile(null);
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
    preview: {
      width: "180px",
      height: "130px",
      objectFit: "cover" as const,
      border: "1px solid rgba(128,128,128,0.3)",
    },
    remove: {
      border: "1px solid currentColor",
      padding: "8px 12px",
      background: "transparent",
      color: "inherit",
      fontSize: "10px",
      fontWeight: 800,
      cursor: "pointer",
      width: "fit-content",
    },
  };

  if (loading) {
    return <main style={styles.page}>A carregar o card...</main>;
  }

  return (
    <main style={styles.page}>
      <p style={styles.eyebrow}>CMS CASA / CONTEÚDO EDITORIAL</p>
      <h1 style={styles.heading}>EDITAR CARD</h1>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Título *</label>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Subtítulo</label>
          <input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Descrição</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            style={styles.textarea}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Categoria</label>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Secção</label>
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
          <label style={styles.label}>Imagem atual</label>

          {imageUrl ? (
            <>
              <img src={imageUrl} alt={title} style={styles.preview} />
              <button
                type="button"
                onClick={removeImage}
                style={styles.remove}
              >
                REMOVER IMAGEM
              </button>
            </>
          ) : (
            <p style={{ fontSize: "12px", opacity: 0.65 }}>
              Este card ainda não tem imagem.
            </p>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Substituir imagem</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setImageFile(event.target.files?.[0] || null)
            }
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Ligação do card</label>
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Texto da ligação</label>
          <input
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Link da música no Spotify</label>
          <input
            type="url"
            value={spotifyUrl}
            onChange={(event) => setSpotifyUrl(event.target.value)}
            placeholder="https://open.spotify.com/track/..."
            style={styles.input}
          />
          <p style={{ fontSize: "12px", opacity: 0.65, margin: 0 }}>
            Cola aqui o link de uma música, álbum ou playlist do Spotify.
            Poderá aparecer como leitor incorporado no card público.
          </p>
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

        <div style={styles.actions}>
          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? "A GUARDAR..." : "GUARDAR ALTERAÇÕES"}
          </button>

          <Link href="/admin/destaques" style={styles.secondary}>
            CANCELAR
          </Link>
        </div>
      </form>
    </main>
  );
}