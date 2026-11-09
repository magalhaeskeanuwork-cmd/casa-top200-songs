"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categories = [
  { value: "artist_of_the_month", label: "ARTISTA DO MÊS" },
  { value: "new_school_artist", label: "ARTISTA DO MÊS (NOVA ESCOLA)" },
  { value: "new_school_group", label: "GRUPO DO MÊS (NOVA ESCOLA)" },
  { value: "old_school_group", label: "GRUPO DO MÊS (VELHA ESCOLA)" },
  { value: "freshman_of_the_month", label: "CALOIRO DO MÊS" },
];

type Highlight = {
  id: string;
  category: string;
  artist_name: string;
  image_url: string | null;
  description: string | null;
  music_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_published: boolean;
};

function extractSpotifyEmbedUrl(value: string): string | null {
  const input = value.trim();

  if (!input) return null;

  // Aceita tanto um URL normal como o código iframe copiado do Spotify.
  const iframeMatch = input.match(/src\s*=\s*["']([^"']+)["']/i);
  const rawUrl = iframeMatch ? iframeMatch[1] : input;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("O link ou código de embed do Spotify não é válido.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !["open.spotify.com", "www.open.spotify.com"].includes(parsedUrl.hostname)
  ) {
    throw new Error("Usa um link ou código de embed de open.spotify.com.");
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const embedIndex = segments[0] === "embed" ? 1 : 0;
  const contentType = segments[embedIndex];
  const contentId = segments[embedIndex + 1];

  if (
    !contentType ||
    !contentId ||
    !["track", "album", "playlist", "episode", "show"].includes(contentType)
  ) {
    throw new Error(
      "O Spotify link deve ser de uma música, álbum, playlist, episódio ou programa."
    );
  }

  return `https://open.spotify.com/embed/${contentType}/${contentId}`;
}

export default function EditHighlightPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [category, setCategory] = useState("");
  const [artistName, setArtistName] = useState("");
  const [description, setDescription] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadHighlight() {
      if (!supabase) {
        setMessage("Não foi possível ligar ao Supabase.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("casa_artist_of_the_month")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage("Não foi possível encontrar este destaque.");
        setLoading(false);
        return;
      }

      const item = data as Highlight;

      setHighlight(item);
      setCategory(item.category);
      setArtistName(item.artist_name);
      setDescription(item.description || "");
      setMusicUrl(item.music_url || "");
      setStartsAt(item.starts_at);
      setEndsAt(item.ends_at || "");
      setPublished(item.is_published);
      setLoading(false);
    }

    if (id) {
      loadHighlight();
    }
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !highlight) return;

    if (!artistName.trim() || !startsAt) {
      setMessage("Preenche o nome e a data de início.");
      return;
    }

    if (endsAt && endsAt < startsAt) {
      setMessage("A data de fim não pode ser anterior à data de início.");
      return;
    }

    let spotifyEmbedUrl: string | null;

    try {
      spotifyEmbedUrl = extractSpotifyEmbedUrl(musicUrl);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "O link do Spotify não é válido."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let imageUrl = highlight.image_url;

      if (image) {
        const fileExtension = image.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("casa-artists")
          .upload(fileName, image, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("casa-artists")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("casa_artist_of_the_month")
        .update({
          category,
          artist_name: artistName.trim(),
          image_url: imageUrl,
          description: description.trim(),
          music_url: spotifyEmbedUrl,
          starts_at: startsAt,
          ends_at: endsAt || null,
          is_published: published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setMessage("Destaque atualizado com sucesso!");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Ocorreu um erro ao atualizar o destaque.");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "#151515",
    border: "1px solid #383838",
    color: "#F2F0E9",
    padding: "14px",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    color: "#F2F0E9",
    fontSize: "11px",
    fontWeight: 800 as const,
    letterSpacing: "1px",
    marginBottom: "9px",
  };

  if (loading) {
    return (
      <main style={{ maxWidth: "760px", margin: "0 auto", color: "#999" }}>
        A carregar destaque...
      </main>
    );
  }

  if (!highlight) {
    return (
      <main style={{ maxWidth: "760px", margin: "0 auto" }}>
        <p style={{ color: "#F184D2" }}>{message}</p>
        <Link href="/admin/artista-do-mes/lista" style={{ color: "#F5D900" }}>
          Voltar aos destaques
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto" }}>
      <Link
        href="/admin/artista-do-mes/lista"
        style={{
          color: "#999",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "1px",
          textDecoration: "none",
        }}
      >
        ← VOLTAR AOS DESTAQUES
      </Link>

      <div style={{ marginTop: "36px", marginBottom: "36px" }}>
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
            fontSize: "clamp(34px, 6vw, 54px)",
            fontWeight: 900,
            letterSpacing: "-2px",
            margin: "12px 0",
          }}
        >
          EDITAR DESTAQUE
        </h1>

        <p style={{ color: "#999", fontSize: "14px" }}>
          A editar: {highlight.artist_name}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          border: "1px solid #333",
          padding: "clamp(20px, 5vw, 34px)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div>
          <label htmlFor="category" style={labelStyle}>
            CATEGORIA
          </label>

          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={fieldStyle}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="artist-name" style={labelStyle}>
            NOME DO ARTISTA OU GRUPO
          </label>

          <input
            id="artist-name"
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            required
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="artist-image" style={labelStyle}>
            FOTOGRAFIA
          </label>

          {highlight.image_url && (
            <img
              src={highlight.image_url}
              alt={highlight.artist_name}
              style={{
                display: "block",
                width: "150px",
                height: "150px",
                objectFit: "cover",
                marginBottom: "12px",
              }}
            />
          )}

          <input
            id="artist-image"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setImage(event.target.files?.[0] || null)
            }
            style={{ ...fieldStyle, padding: "12px" }}
          />
        </div>

        <div>
          <label htmlFor="description" style={labelStyle}>
            DESCRIÇÃO EDITORIAL
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            style={{
              ...fieldStyle,
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        <div>
          <label htmlFor="music-url" style={labelStyle}>
            LINK DE EMBED (SPOTIFY)
          </label>

          <textarea
            id="music-url"
            value={musicUrl}
            onChange={(event) => setMusicUrl(event.target.value)}
            placeholder="Cola aqui o link do Spotify ou o código completo de embed..."
            rows={3}
            style={{
              ...fieldStyle,
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />

          <p
            style={{
              color: "#999",
              fontSize: "12px",
              lineHeight: 1.5,
              marginTop: "8px",
            }}
          >
            Podes colar o link normal do Spotify ou o código iframe completo
            copiado em Partilhar, Incorporar.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label htmlFor="starts-at" style={labelStyle}>
              DATA DE INÍCIO
            </label>

            <input
              id="starts-at"
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
              style={fieldStyle}
            />
          </div>

          <div>
            <label htmlFor="ends-at" style={labelStyle}>
              DATA DE FIM
            </label>

            <input
              id="ends-at"
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              min={startsAt || undefined}
              style={fieldStyle}
            />
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            style={{
              width: "17px",
              height: "17px",
              accentColor: "#F5D900",
            }}
          />
          PUBLICAR ESTE DESTAQUE
        </label>

        {message && (
          <p
            role="status"
            style={{
              color: message.includes("sucesso") ? "#24A99B" : "#F184D2",
              fontSize: "13px",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            background: "#F5D900",
            color: "#090909",
            border: "none",
            padding: "17px",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "1px",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "A GUARDAR..." : "GUARDAR ALTERAÇÕES"}
        </button>
      </form>
    </main>
  );
}