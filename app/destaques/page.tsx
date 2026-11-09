"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { ArtistHighlight } from "@/lib/casa-highlights";

type ArtistMetrics = {
  artist_id: string;
  artist_name: string;
  act_type: string | null;
  origin_country: string | null;
  profile_image_url: string | null;
  genres: string[] | null;
  total_chart_entries: number;
  top_10_entries: number;
  top_20_entries: number;
  best_rank: number | null;
  current_chart_entries: number;
  current_best_rank: number | null;
  last_chart_date: string | null;
  spotify_monthly_listeners: number | null;
  spotify_listeners_observed_at: string | null;
  spotify_listeners_source: string | null;
  artist_rank: number;
  deezer_profile_url: string | null;
  bio: string | null;
  deezer_match_status: string | null;
  spotify_artist_id: string | null;
};

type AlbumChartEntry = {
  rank: number;
  title: string;
  artist: string;
  chart_date: string;
  artwork_url: string | null;
};

type CmsHighlight = {
  id: string;
  artist_name: string;
  image_url: string | null;
  description: string | null;
  music_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_published: boolean;
  category:
    | "artist_of_the_month"
    | "new_school_artist"
    | "new_school_group"
    | "old_school_group"
    | "freshman_of_the_month";
};

const highlightCategoryInfo: Record<
  CmsHighlight["category"],
  { type: string; category: string; color: string }
> = {
  artist_of_the_month: {
    type: "ARTISTA DO MÊS",
    category: "SELECÇÃO CASA",
    color: "#24A99B",
  },
  new_school_artist: {
    type: "ARTISTA DO MÊS",
    category: "NOVA ESCOLA",
    color: "#F184D2",
  },
  new_school_group: {
    type: "GRUPO DO MÊS",
    category: "NOVA ESCOLA",
    color: "#8A5BE2",
  },
  old_school_group: {
    type: "GRUPO DO MÊS",
    category: "VELHA ESCOLA",
    color: "#F2F0E9",
  },
  freshman_of_the_month: {
    type: "CALOIRO DO MÊS",
    category: "DESCOBERTA",
    color: "#F5D900",
  },
};

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
  card_size: "small" | "medium" | "large" | "featured";
  section: "featured" | "awards" | "interviews" | "news";
  sort_order: number;
};

type VoteContent = {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  link_url: string;
  is_enabled: boolean;
};

function EditorialCard({ item }: { item: EditorialHighlight }) {
  const spotifyEmbedUrl = item.spotify_url
    ? getSpotifyEmbed(item.spotify_url)
    : "";

  const spotifyEmbedHeight = item.spotify_url?.includes("/track/")
    ? 152
    : 352;

  return (
    <article className={`editorial-card editorial-card-${item.card_size}`}>
      {item.image_url ? (
        <div className="editorial-card-image">
          <img src={item.image_url} alt={item.title} loading="lazy" />
        </div>
      ) : null}

      <div className="editorial-card-content">
        {item.category ? (
          <span className="editorial-card-category">{item.category}</span>
        ) : null}

        <h3>{item.title}</h3>

        {item.subtitle ? <h4>{item.subtitle}</h4> : null}

        {item.description ? <p>{item.description}</p> : null}

        {item.link_url ? (
          <a href={item.link_url} target="_blank" rel="noreferrer">
            {item.link_label || "SABER MAIS"} ↗
          </a>
        ) : null}

        {spotifyEmbedUrl ? (
          <div className="editorial-card-spotify">
            <iframe
              src={spotifyEmbedUrl}
              title={`Spotify: ${item.title}`}
              width="100%"
              height={spotifyEmbedHeight}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getSpotifyEmbed(value?: string | null) {
  if (!value) return "";

  try {
    const iframeMatch = value.match(/src=["']([^"']+)["']/i);
    const rawUrl = iframeMatch ? iframeMatch[1] : value.trim();
    const parsed = new URL(rawUrl);

    const allowedHosts = ["open.spotify.com", "www.open.spotify.com"];

    if (
      parsed.protocol !== "https:" ||
      !allowedHosts.includes(parsed.hostname)
    ) {
      return "";
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    const supportedTypes = ["track", "album", "playlist", "episode", "show"];
    const embedIndex = parts.indexOf("embed");
    const type = embedIndex >= 0 ? parts[embedIndex + 1] : parts[0];
    const id = embedIndex >= 0 ? parts[embedIndex + 2] : parts[1];

    if (!type || !id || !supportedTypes.includes(type)) return "";

    return `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}`;
  } catch {
    return "";
  }
}

function formatNumber(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-PT").format(value);
}

function ArtistCard({
  artist,
  metrics,
  albumBestRank,
}: {
  artist: ArtistHighlight & { imageUrl?: string };
  metrics?: ArtistMetrics;
  albumBestRank?: number | null;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const image = artist.imageUrl || metrics?.profile_image_url;
  const listeners = metrics?.spotify_monthly_listeners;
  const totalEntries = metrics?.total_chart_entries;
  const currentEntries = metrics?.current_chart_entries;
  const top10Entries = metrics?.top_10_entries;
  const top20Entries = metrics?.top_20_entries;
  const bestPosition = metrics?.best_rank;
  const currentBestPosition = metrics?.current_best_rank;
  const bestAlbumPosition = albumBestRank ?? null;
  const embedUrl = getSpotifyEmbed(artist.musicUrl);
  const embedHeight = /\/track\//i.test(artist.musicUrl || "")
    ? 152
    : 352;

  return (
    <article
      className={`highlight-card${isFlipped ? " is-flipped" : ""}`}
      style={{ "--card-accent": artist.color } as CSSProperties}
    >
      <div className="highlight-card-inner">
        <button
          type="button"
          className="highlight-card-face highlight-card-front"
          aria-label={`Ver biografia de ${artist.name}`}
          aria-pressed={isFlipped}
          onClick={() => setIsFlipped(true)}
        >
          <div className="highlight-card-image">
            {image ? (
              <img src={image} alt={artist.name} loading="lazy" />
            ) : (
              <div className="highlight-image-placeholder">
                <span>{artist.name}</span>
                <small>CASA ORIGINAL SELECTION</small>
              </div>
            )}

            <span className="highlight-number">{artist.label}</span>
            <span className="highlight-category">{artist.category}</span>
          </div>

          <div className="highlight-card-body">
            <div className="highlight-card-title">
              <div>
                <span className="highlight-kicker">{artist.type}</span>
                <h3>{artist.name}</h3>
              </div>
              <span className="highlight-arrow" aria-hidden="true">
                ↗
              </span>
            </div>

            <div className="highlight-metrics">
              <div className="metric-primary">
                <span>ENTRADAS NOS CHARTS</span>
                <strong>{formatNumber(totalEntries)}</strong>
              </div>

              <div className="metric-primary">
                <span>MELHOR POSIÇÃO</span>
                <strong>
                  {bestPosition != null ? `#${bestPosition}` : "—"}
                </strong>
              </div>

              <div>
                <span>OUVINTES MENSAIS</span>
                <strong>{formatNumber(listeners)}</strong>
              </div>

              <div>
                <span>ENTRADAS ACTUAIS</span>
                <strong>{formatNumber(currentEntries)}</strong>
              </div>

              <div>
                <span>ENTRADAS TOP 10</span>
                <strong>{formatNumber(top10Entries)}</strong>
              </div>

              <div>
                <span>ENTRADAS TOP 20</span>
                <strong>{formatNumber(top20Entries)}</strong>
              </div>

              <div>
                <span>MELHOR POSIÇÃO ACTUAL</span>
                <strong>
                  {currentBestPosition != null
                    ? `#${currentBestPosition}`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>MELHOR POSIÇÃO NO TOP ÁLBUNS</span>
                <strong>
                  {bestAlbumPosition != null ? `#${bestAlbumPosition}` : "—"}
                </strong>
              </div>
            </div>

            <span className="highlight-card-flip-hint">
              VER BIOGRAFIA <span aria-hidden="true">↗</span>
            </span>
          </div>
        </button>

        <div className="highlight-card-face highlight-card-back">
          <div className="highlight-card-back-top">
            <span>{artist.category}</span>
            <span>{artist.label}</span>
          </div>

          <div className="highlight-card-back-content">
            <span className="highlight-kicker">{artist.type}</span>
            <h3>{artist.name}</h3>

            <p>
              {artist.description?.trim() ||
                "A BIOGRAFIA DESTE ARTISTA SERÁ ADICIONADA EM BREVE."}
            </p>

            {artist.articleUrl ? (
              <a
                className="highlight-card-article-link"
                href={artist.articleUrl}
                target="_blank"
                rel="noreferrer"
              >
                LER CONTEÚDO COMPLETO ↗
              </a>
            ) : null}

            {embedUrl ? (
              <div className="highlight-spotify">
                <iframe
                  src={embedUrl}
                  title={`Spotify de ${artist.name}`}
                  width="100%"
                  height={embedHeight}
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="highlight-music-placeholder">
                <span>MÚSICA EM DESTAQUE</span>
                <strong>SPOTIFY</strong>
                <small>LINK A ADICIONAR</small>
              </div>
            )}
          </div>

          <button
            type="button"
            className="highlight-card-back-button"
            onClick={() => setIsFlipped(false)}
          >
            VOLTAR ÀS MÉTRICAS <span aria-hidden="true">↶</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="highlights-section-heading">
      <div>
        <span className="highlights-section-kicker">
          {number} / {eyebrow}
        </span>
        <h2>{title}</h2>
      </div>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export default function DestaquesPage() {
  const [artists, setArtists] = useState<ArtistHighlight[]>([]);
  const [artistMetrics, setArtistMetrics] = useState<ArtistMetrics[]>([]);
  const [albumChart, setAlbumChart] = useState<AlbumChartEntry[]>([]);
  const [editorialHighlights, setEditorialHighlights] = useState<
    EditorialHighlight[]
  >([]);
  const [cmsHighlights, setCmsHighlights] = useState<CmsHighlight[]>([]);
  const [voteContent, setVoteContent] = useState<VoteContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHighlights() {
      setLoading(true);

      const client = supabase;
      if (!client) {
        setLoading(false);
        return;
      }

      const [
        artistsResult,
        metricsResult,
        albumChartResult,
        editorialResult,
        cmsResult,
        votesResult,
      ] = await Promise.all([
        client.from("casa_artist_of_the_month").select("*").order("sort_order"),
        client.from("casa_artist_rankings").select("*").order("artist_rank"),
        client
          .from("casa_public_albums_chart")
          .select("rank,title,artist,chart_date,market,source_name,artwork_url"),
        client
          .from("casa_editorial_highlights")
          .select("*")
          .eq("is_published", true)
          .order("sort_order"),
        client
          .from("casa_artist_of_the_month")
          .select("*")
          .eq("is_published", true)
          .order("sort_order"),
        client.from("casa_vote_content").select("*").eq("is_enabled", true),
      ]);

      if (!active) return;

      if (artistsResult.data) {
        setArtists(artistsResult.data as ArtistHighlight[]);
      }

      if (metricsResult.data) {
        setArtistMetrics(metricsResult.data as ArtistMetrics[]);
      }

      if (albumChartResult.data) {
        setAlbumChart(albumChartResult.data as AlbumChartEntry[]);
      }

      if (editorialResult.data) {
        setEditorialHighlights(
          editorialResult.data as EditorialHighlight[],
        );
      }

      if (cmsResult.data) {
        setCmsHighlights(cmsResult.data as CmsHighlight[]);
      }

      if (votesResult.data) setVoteContent(votesResult.data as VoteContent[]);

      setLoading(false);
    }

    loadHighlights();

    return () => {
      active = false;
    };
  }, []);

  const displayedHighlights = cmsHighlights.map((item) => {
    const categoryInfo = highlightCategoryInfo[item.category];

    return {
      id: item.id,
      name: item.artist_name,
      imageUrl: item.image_url || undefined,
      description: item.description || "",
      musicUrl: item.music_url || "",
      articleUrl: "",
      label: categoryInfo.category,
      category: categoryInfo.category,
      type: categoryInfo.type,
      color: categoryInfo.color,
    } as ArtistHighlight & { imageUrl?: string };
  });

  const featuredItems = editorialHighlights.filter(
    (item) => item.section === "featured",
  );
  const awardsItems = editorialHighlights.filter(
    (item) => item.section === "awards",
  );
  const newsItems = editorialHighlights.filter(
    (item) => item.section === "news",
  );
  const pollLink = voteContent.find((item) => item.key === "poll");
  const winnerCards = ["winner_1", "winner_2", "winner_3"]
    .map((key) => voteContent.find((item) => item.key === key))
    .filter((item): item is VoteContent => Boolean(item));

  const normalizeArtistName = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const getMetrics = (artist: ArtistHighlight) => {
    const target = normalizeArtistName(artist.name || "");

    return (
      artistMetrics.find(
        (metric) => normalizeArtistName(metric.artist_name || "") === target,
      ) ||
      artistMetrics.find((metric) => {
        const name = normalizeArtistName(metric.artist_name || "");
        return name.length > 0 && target.length > 0 &&
          (name.includes(target) || target.includes(name));
      })
    );
  };

  const getAlbumBestRank = (artist: ArtistHighlight) => {
    const target = normalizeArtistName(artist.name || "");
    if (!target) return null;

    const ranks = albumChart
      .filter((entry) => {
        const names = normalizeArtistName(entry.artist || "");
        if (!names) return false;

        return (
          names === target ||
          names.includes(target) ||
          target.includes(names)
        );
      })
      .map((entry) => Number(entry.rank))
      .filter((rank) => Number.isFinite(rank) && rank > 0);

    return ranks.length > 0 ? Math.min(...ranks) : null;
  };

  if (loading) {
    return (
      <main className="highlights-page">
        <div className="highlights-loading">A CARREGAR DESTAQUES...</div>
      </main>
    );
  }

  return (
    <main className="highlights-page">
      <header className="highlights-hero">
        <div>
          <span className="highlights-hero-top">
            CASA / CULTURA / MÚSICA ANGOLANA
          </span>
          <h1>DESTAQUES</h1>
          <span className="highlights-hero-bottom">
            ARTISTAS, HISTÓRIAS E MOMENTOS QUE DEFINEM A MÚSICA
          </span>
        </div>

        <div className="highlights-hero-side">
          <span>EDIÇÃO</span>
          <strong>2026</strong>
          <span>LUANDA, ANGOLA</span>
        </div>
      </header>
            <section className="highlights-section">
        <SectionHeading
          number="01"
          eyebrow="ARTISTAS"
          title="EM DESTAQUE"
          description="Todos os meses, a redação da CASA escolhe os artistas que mais se destacam e merecem estar em destaque."
        />

        {displayedHighlights.length > 0 ? (
          <div className="highlights-grid">
            {displayedHighlights.map((artist) => (
              <ArtistCard
                key={artist.name}
                artist={artist}
                metrics={getMetrics(artist)}
                albumBestRank={getAlbumBestRank(artist)}
              />
            ))}
          </div>
        ) : artists.length > 0 ? (
          <div className="highlights-grid">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.name}
                artist={artist}
                metrics={getMetrics(artist)}
                albumBestRank={getAlbumBestRank(artist)}
              />
            ))}
          </div>
        ) : (
          <div className="highlights-empty">
            AINDA NÃO EXISTEM ARTISTAS EM DESTAQUE.
          </div>
        )}
      </section>

      {pollLink || winnerCards.length > 0 ? (
        <section className="highlights-section highlights-voting-section">
          <SectionHeading
            number="02"
            eyebrow="ESCOLHA DA COMUNIDADE"
            title="VOTAÇÕES CASA"
            description="Participa nas escolhas da música angolana e conhece os vencedores."
          />
          {pollLink?.link_url ? <a className="highlights-poll-button" href={pollLink.link_url} target="_blank" rel="noreferrer">{pollLink.title || "VOTAR AGORA"}<span>↗</span></a> : null}
          {winnerCards.length ? <div className="highlights-winners-grid">{winnerCards.map((winner, index) => (
            <article className="highlights-winner-card" key={winner.key}>
              {winner.image_url ? <img src={winner.image_url} alt={winner.title || `Vencedor ${index + 1}`} loading="lazy" /> : <div className="highlights-winner-placeholder">CASA<br />VENCEDOR {index + 1}</div>}
              <div><span>VENCEDOR {String(index + 1).padStart(2, "0")}{winner.subtitle ? ` · ${winner.subtitle}` : ""}</span><h3>{winner.title || "A anunciar"}</h3>{winner.description ? <p>{winner.description}</p> : null}{winner.link_url ? <a href={winner.link_url} target="_blank" rel="noreferrer">SABER MAIS ↗</a> : null}</div>
            </article>
          ))}</div> : null}
        </section>
      ) : null}

      {featuredItems.length > 0 ? (
        <section className="highlights-section">
          <SectionHeading
            number="02"
            eyebrow="EDITORIAL"
            title="DESTAQUES CASA"
            description="Histórias, lançamentos e momentos que merecem atenção."
          />

          <div className="editorial-grid">
            {featuredItems.map((item) => (
              <EditorialCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {awardsItems.length > 0 ? (
        <section className="highlights-section">
          <SectionHeading
            number="03"
            eyebrow="RECONHECIMENTO"
            title="PRÉMIOS"
            description="Os nomes e os momentos que merecem reconhecimento."
          />

          <div className="editorial-grid">
            {awardsItems.map((item) => (
              <EditorialCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {newsItems.length > 0 ? (
        <section className="highlights-section">
          <SectionHeading
            number="05"
            eyebrow="ACTUALIDADE"
            title="NOTÍCIAS"
            description="O que está a acontecer na música e na cultura."
          />

          <div className="editorial-grid">
            {newsItems.map((item) => (
              <EditorialCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <footer className="highlights-footer">
        <strong>
          CASA<sup>®</sup>
        </strong>

        <div>
          A MÚSICA ANGOLANA
          <br />
          TEM CASA.
        </div>

        <span>
          CHARTS · CULTURA · DADOS
          <br />
          LUANDA, ANGOLA
          <br />
          © 2026 CASA
        </span>
      </footer>

      <style jsx global>{`
        .highlights-page {
          --hl-bg: var(--casa-background);
          --hl-fg: var(--casa-foreground);
          --hl-muted: var(--casa-muted);
          --hl-line: var(--casa-border);

          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 6px;
          color: var(--hl-fg);
          background: var(--hl-bg);
        }

        .highlights-page * {
          box-sizing: border-box;
        }

        .highlights-hero {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: end;
          padding: 38px 0 34px;
          border-bottom: 1px solid var(--hl-line);
        }

        .highlights-hero-top,
        .highlights-hero-bottom,
        .highlights-eyebrow,
        .highlight-card-number,
        .highlight-card-category,
        .highlight-metrics span,
        .highlights-section-kicker {
          font-family: var(--font-mono, monospace);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .highlights-hero-top {
          display: block;
          margin-bottom: 18px;
          color: var(--hl-muted);
          font-size: 10px;
        }

        .highlights-hero h1 {
          margin: 0;
          font-size: clamp(54px, 8vw, 112px);
          line-height: 0.88;
          letter-spacing: -0.075em;
          font-weight: 800;
        }

        .highlights-hero-bottom {
          display: block;
          margin-top: 22px;
          color: var(--hl-muted);
          font-size: 10px;
        }

        .highlights-hero-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          padding-bottom: 4px;
          color: var(--hl-muted);
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          text-align: right;
        }

        .highlights-hero-side strong {
          color: var(--hl-fg);
          font-size: 30px;
          letter-spacing: -0.06em;
        }

        .highlights-section {
          padding: 34px 0 46px;
          border-bottom: 1px solid var(--hl-line);
        }

        .highlights-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          margin-bottom: 22px;
        }

        .highlights-section-kicker {
          display: block;
          margin-bottom: 8px;
          color: var(--hl-muted);
          font-size: 9px;
        }

        .highlights-section-heading h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 0.98;
          letter-spacing: -0.06em;
        }

        .highlights-section-heading p {
          max-width: 390px;
          margin: 0;
          color: var(--hl-muted);
          font-size: 13px;
          line-height: 1.5;
          text-align: right;
        }

        .highlights-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
        }

        .highlight-card {
          --card-accent: #20aa9d;
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--hl-line);
          border-radius: 5px;
          background: #fff;
          color: #101010;
          transform: translateY(0);
          transition:
            transform 420ms cubic-bezier(0.2, 0.75, 0.25, 1),
            box-shadow 420ms cubic-bezier(0.2, 0.75, 0.25, 1);
          animation: casa-card-enter 700ms cubic-bezier(0.2, 0.75, 0.25, 1) both;
        }

        .highlight-card:nth-child(2) {
          animation-delay: 80ms;
        }

        .highlight-card:nth-child(3) {
          animation-delay: 160ms;
        }

        .highlight-card:nth-child(4) {
          animation-delay: 240ms;
        }

        .highlight-card:nth-child(5) {
          animation-delay: 320ms;
        }

        .highlight-card:hover {
          z-index: 2;
          transform: translateY(-7px);
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.11);
        }

        @keyframes casa-card-enter {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .highlight-card-image {
          position: relative;
          height: 210px;
          flex: 0 0 210px;
          overflow: hidden;
          background: #dedbd3;
        }

        .highlight-card-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 700ms cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .highlight-card:hover .highlight-card-image img {
          transform: scale(1.045);
        }

        .highlight-card-image-placeholder {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--card-accent);
          color: #080808;
          text-align: center;
        }

        .highlight-card-image-placeholder strong {
          max-width: 90%;
          font-size: clamp(22px, 2.2vw, 34px);
          line-height: 0.95;
          letter-spacing: -0.065em;
          text-transform: uppercase;
        }

        .highlight-card-stamp {
          position: absolute;
          z-index: 1;
          top: 12px;
          left: 12px;
          padding: 7px 9px;
          background: #090909;
          color: #fff;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .highlight-card-number {
          position: absolute;
          z-index: 1;
          top: 12px;
          right: 12px;
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          background: #090909;
          color: #fff;
          font-size: 10px;
        }

        .highlight-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 20px;
        }

        .highlight-card-category {
          margin-bottom: 8px;
          color: #85827b;
          font-size: 9px;
        }

        .highlight-card-title {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .highlight-card-title h3 {
          margin: 0;
          font-size: clamp(26px, 2.7vw, 38px);
          line-height: 0.98;
          letter-spacing: -0.065em;
          overflow-wrap: anywhere;
        }

        .highlight-card-arrow {
          flex: 0 0 auto;
          color: var(--card-accent);
          font-size: 25px;
          line-height: 1;
          transition: transform 300ms ease;
        }

        .highlight-card:hover .highlight-card-arrow {
          transform: translate(4px, -4px);
        }

        .highlight-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px 10px;
          margin: 0 0 18px;
          padding: 13px 0;
          border-top: 1px solid #dededb;
          border-bottom: 1px solid #dededb;
        }

        .highlight-metrics > div {
          min-width: 0;
        }

        .highlight-metrics span {
          display: block;
          margin-bottom: 5px;
          color: #85827b;
          font-size: 8px;
          line-height: 1.3;
        }

        .highlight-metrics strong {
          display: block;
          color: #111;
          font-size: 21px;
          line-height: 1;
          letter-spacing: -0.05em;
          overflow-wrap: anywhere;
        }

        .highlight-card-bio-toggle {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding: 13px 14px;
          border: 0;
          background: color-mix(in srgb, var(--card-accent) 82%, white);
          color: #080808;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          text-align: left;
          transition: filter 220ms ease;
        }

        .highlight-card-bio-toggle:hover {
          filter: brightness(0.94);
        }

        .highlight-card-bio-toggle span:last-child {
          font-size: 18px;
          line-height: 1;
          transition: transform 250ms ease;
        }

        .highlight-card-bio-toggle[aria-expanded="true"] span:last-child {
          transform: rotate(45deg);
        }

        .highlight-card-bio {
          padding: 15px 14px 17px;
          background: color-mix(in srgb, var(--card-accent) 18%, white);
          color: #171717;
          font-size: 13px;
          line-height: 1.6;
          animation: casa-bio-open 260ms ease both;
        }

        @keyframes casa-bio-open {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .highlight-card-spotify {
          margin-top: 14px;
          overflow: hidden;
          border-radius: 8px;
          background: #202020;
        }

        .highlight-card-spotify iframe {
          display: block;
          width: 100%;
          max-width: 100%;
          border: 0;
        }

        .highlights-empty {
          padding: 35px 20px;
          border: 1px dashed var(--hl-line);
          color: var(--hl-muted);
          font-size: 13px;
          text-align: center;
        }

        .highlights-footer {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          align-items: end;
          margin-top: 44px;
          padding: 35px 0;
          border-top: 1px solid var(--hl-line);
        }

        .highlights-footer > strong {
          font-size: 12px;
          letter-spacing: 0.08em;
        }

        .highlights-footer sup {
          margin-left: 3px;
          font-family: var(--font-mono, monospace);
          font-size: 8px;
        }

        .highlights-footer > div {
          font-size: clamp(20px, 3vw, 34px);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.06em;
        }

        .highlights-footer > span {
          color: var(--hl-muted);
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          line-height: 1.8;
          text-align: right;
        }

        .news-empty {
          display: grid;
          grid-template-columns: 42px 1fr 24px;
          gap: 14px;
          align-items: center;
          padding: 18px;
          border: 1px solid var(--hl-line);
          color: var(--hl-muted);
        }

        .news-empty strong {
          color: var(--hl-fg);
          font-size: 13px;
        }

        .editorial-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .editorial-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--hl-line);
          background: #fff;
          color: #101010;
        }

        .editorial-card-image {
          height: 210px;
          overflow: hidden;
        }

        .editorial-card-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .editorial-card-content {
          padding: 20px;
        }

        .editorial-card-category {
          display: block;
          margin-bottom: 10px;
          color: #77736c;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          text-transform: uppercase;
        }

        .editorial-card-content h3 {
          margin: 0 0 10px;
          font-size: 26px;
          line-height: 1;
        }

        .editorial-card-content h4 {
          margin: 0 0 12px;
          font-size: 16px;
        }

        .editorial-card-content p {
          font-size: 13px;
          line-height: 1.6;
        }

        .editorial-card-content > a {
          display: inline-block;
          margin-top: 12px;
          color: inherit;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
        }

        .editorial-card-spotify {
          margin-top: 16px;
          overflow: hidden;
          border-radius: 8px;
        }

        .editorial-card-spotify iframe {
          display: block;
          width: 100%;
          border: 0;
        }

        .highlights-loading {
          padding: 80px 20px;
          color: var(--hl-muted);
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          text-align: center;
        }
                  @media (max-width: 900px) {
          .highlights-grid,
          .editorial-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .highlight-card-image {
            height: 185px;
            flex-basis: 185px;
          }

          .highlights-hero h1 {
            font-size: clamp(52px, 10vw, 82px);
          }
        }

        @media (max-width: 600px) {
          .highlights-page {
            padding: 0 18px;
          }

          .highlights-hero {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 26px 0;
          }

          .highlights-hero h1 {
            font-size: clamp(48px, 15vw, 72px);
          }

          .highlights-hero-side {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            text-align: left;
          }

          .highlights-section {
            padding: 26px 0 34px;
          }

          .highlights-section-heading {
            display: block;
          }

          .highlights-section-heading h2 {
            font-size: 36px;
          }

          .highlights-section-heading p {
            margin-top: 10px;
            text-align: left;
          }

          .highlights-grid,
          .editorial-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .highlight-card-image {
            height: 190px;
            flex-basis: 190px;
          }

          .highlight-card-body {
            padding: 17px;
          }

          .highlight-card-title h3 {
            font-size: 32px;
          }

          .highlight-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .highlight-metrics > div:not(:nth-child(3n)) {
            border-right: 0;
          }

          .highlight-metrics > div:nth-child(odd) {
            border-right: 1px solid rgba(15, 15, 15, 0.09);
          }

          .highlights-footer {
            margin-left: -18px;
            margin-right: -18px;
            padding: 35px 18px;
            grid-template-columns: 1fr 1fr;
          }

          .highlights-footer > div {
            grid-column: 1 / -1;
            grid-row: 2;
          }

          .highlights-footer > span {
            grid-column: 2;
            grid-row: 1;
          }
        }

        @media (max-width: 420px) {
          .highlights-page {
            padding: 0 13px;
          }

          .highlights-hero {
            padding: 17px;
          }

          .highlights-hero-top,
          .highlights-hero-bottom {
            font-size: 8px;
          }

          .highlights-hero h1 {
            font-size: 49px;
          }

          .highlights-section-heading h2 {
            font-size: 38px;
          }

          .highlight-card-body {
            padding: 13px;
          }

          .highlight-metrics {
            gap: 9px 6px;
          }

          .highlight-metrics span {
            font-size: 7px;
          }

          .highlight-metrics strong {
            font-size: 15px;
          }

          .highlights-footer {
            margin-left: -13px;
            margin-right: -13px;
            padding: 30px 13px;
          }

          .news-empty {
            grid-template-columns: 30px 1fr 20px;
            gap: 8px;
            padding: 13px;
          }
        }

        /* CARTAO DE ARTISTA: FRENTE E VERSO SOBREPOSTOS */

        .highlight-card {
          --card-accent: #24a99b;
          position: relative;
          display: block;
          height: 100%;
          min-width: 0;
          overflow: visible;
          border: 1px solid var(--card-accent);
          border-radius: 5px;
          background: var(--card-accent);
          color: #101010;
          perspective: 1400px;
          transform: none;
          transition: box-shadow 420ms cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .highlight-card:hover {
          z-index: 2;
          transform: none;
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.11);
        }

        .highlight-card-inner {
          position: relative;
          display: grid;
          width: 100%;
          height: 100%;
          min-height: 100%;
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr);
          transform-style: preserve-3d;
          transition: transform 850ms cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .highlight-card.is-flipped .highlight-card-inner {
          transform: rotateY(180deg);
        }

        .highlight-card-face {
          grid-column: 1;
          grid-row: 1;
          width: 100%;
          height: 100%;
          min-width: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .highlight-card-front {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          border: 0;
          border-radius: 4px;
          background: #fff;
          color: #101010;
          cursor: pointer;
          font: inherit;
          text-align: left;
          appearance: none;
        }

        .highlight-card-back {
          position: relative;
          z-index: 0;
          display: flex;
          flex-direction: column;
          padding: 20px;
          overflow-wrap: anywhere;
          border-radius: 4px;
          background: var(--card-accent);
          color: #101010;
          transform: rotateY(180deg);
        }

        .highlight-card:not(.is-flipped) .highlight-card-back,
        .highlight-card.is-flipped .highlight-card-front {
          pointer-events: none;
        }

        .highlight-card.is-flipped .highlight-card-back {
          pointer-events: auto;
        }

        .highlight-card-image {
          position: relative;
          height: 210px;
          flex: 0 0 210px;
          overflow: hidden;
          background: var(--card-accent);
        }

        .highlight-card-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 700ms cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .highlight-card-front:hover .highlight-card-image img {
          transform: scale(1.045);
        }

        .highlight-number,
        .highlight-category {
          position: absolute;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--card-accent);
          color: #080808;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .highlight-number {
          top: 12px;
          right: 12px;
          width: 30px;
          height: 30px;
        }

        .highlight-category {
          bottom: 12px;
          left: 12px;
          padding: 7px 9px;
        }

        .highlight-image-placeholder {
          display: flex;
          width: 100%;
          height: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px;
          background: var(--card-accent);
          color: #080808;
          text-align: center;
        }

        .highlight-image-placeholder span {
          max-width: 90%;
          font-size: clamp(22px, 2.2vw, 34px);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.065em;
          text-transform: uppercase;
        }

        .highlight-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 20px;
          border-top: 5px solid var(--card-accent);
        }

        .highlight-kicker {
          display: block;
          margin-bottom: 8px;
          color: #77736c;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .highlight-card-flip-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin-top: auto;
          padding: 16px 10px 8px;
          border-top: 1px solid #dededb;
          color: #171717;
          font-size: 12px;
          text-align: center;
        }

        .highlight-card-back-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.25);
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .highlight-card-back-content {
          padding: 24px 0;
        }

        .highlight-card-back-content h3 {
          margin: 0 0 18px;
          font-size: clamp(30px, 3vw, 42px);
          line-height: 0.98;
          letter-spacing: -0.065em;
        }

        .highlight-card-back-content p {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          white-space: pre-line;
        }

        .highlight-card-article-link {
          display: inline-block;
          margin-top: 18px;
          padding-bottom: 5px;
          border-bottom: 1px solid currentColor;
          color: #101010;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
        }

        .highlight-spotify {
          margin-top: 20px;
          overflow: hidden;
          border-radius: 8px;
          background: #202020;
        }

        .highlight-spotify iframe {
          display: block;
          width: 100%;
          max-width: 100%;
          border: 0;
        }

        .highlight-card-back-button {
          display: flex;
          width: 100%;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: auto;
          padding: 13px 14px;
          border: 1px solid rgba(0, 0, 0, 0.45);
          background: transparent;
          color: #080808;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
        }

        .highlight-music-placeholder {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.08);
          font-family: var(--font-mono, monospace);
        }

        .highlight-card-front:focus-visible,
        .highlight-card-back-button:focus-visible,
        .highlight-card-article-link:focus-visible {
          outline: 3px solid #111;
          outline-offset: 4px;
        }

        @media (max-width: 900px) {
          .highlight-card-back {
            padding: 17px;
          }
        }

        @media (max-width: 600px) {
          .highlight-card-back {
            padding: 17px;
          }

          .highlight-card-back-content p {
            font-size: 13px;
          }
        }

        @media (max-width: 420px) {
          .highlight-card-back {
            padding: 13px;
          }

          .highlight-card-back-content {
            padding: 18px 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .highlight-card-inner {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
