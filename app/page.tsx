"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { highlights } from "@/lib/casa-highlights";

type Track = {
  rank: number;
  title: string;
  artist: string;
  chart_date: string;
  artwork_url: string | null;
};

type Album = {
  rank: number;
  title: string;
  artist: string;
  chart_date: string;
  artwork_url: string | null;
};

type Artist = {
  artist_id: string;
  artist_rank: number;
  artist_name: string;
  profile_image_url: string | null;
  spotify_monthly_listeners: number | null;
};

type ArtistMetrics = {
  artist_id: string;
  artist_name: string;
  profile_image_url: string | null;
  total_chart_entries: number;
  top_10_entries: number;
  top_20_entries: number;
  best_rank: number | null;
  current_chart_entries: number;
  current_best_rank: number | null;
  spotify_monthly_listeners: number | null;
};

type RankingMode = "entries" | "best" | "listeners";

type PublishedHighlight = {
  id: string;
  category: string;
  artist_name: string;
  image_url: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  is_published: boolean;
};

type HomepageEditorialHighlight = {
  id: string;
  content_type: "article" | "interview";
  title: string;
  subtitle: string | null;
  category: string | null;
  link_url: string | null;
  image_url: string | null;
  sort_order: number;
};

type HomepageSection = { section_key: "articles" | "interviews" | "voting"; title: string; sort_order: number; is_enabled: boolean };
type HomepagePoll = { title: string; description: string; link_url: string };

const categoryTemplates: Record<string, (typeof highlights)[number]> = {
  artist_of_the_month: highlights[0],
  new_school_artist: highlights[1],
  new_school_group: highlights[2],
  old_school_group: highlights[3],
  freshman_of_the_month: highlights[4],
};

const categoryLabels: Record<string, string> = {
  artist_of_the_month: "ARTISTA DO MÊS",
  new_school_artist: "ARTISTA DO MÊS (NOVA ESCOLA)",
  new_school_group: "GRUPO DO MÊS (NOVA ESCOLA)",
  old_school_group: "GRUPO DO MÊS (VELHA ESCOLA)",
  freshman_of_the_month: "CALOIRO DO MÊS",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-PT").format(value);
}

function formatListeners(value: number | null) {
  if (value === null || value === undefined) return "SEM REGISTO";

  return new Intl.NumberFormat("pt-PT", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getSpotifyEmbed(url: string) {
  if (!url.trim()) return "";

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const index = parts.indexOf("track");

    if (index !== -1 && parts[index + 1]) {
      return `https://open.spotify.com/embed/track/${parts[index + 1]}`;
    }

    if (parsed.pathname.includes("/embed/")) return url;

    return "";
  } catch {
    return "";
  }
}

function SingleRow({ track }: { track: Track }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="casa-single-row">
      <span className="casa-single-rank">
        {String(track.rank).padStart(2, "0")}
      </span>

      <div className="casa-single-cover">
        {track.artwork_url && !imageFailed ? (
          <img
            src={track.artwork_url}
            alt={`Capa de ${track.title}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="casa-single-cover-empty">
            {String(track.rank).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="casa-single-info">
        <div className="casa-single-title">{track.title}</div>
        <div className="casa-single-artist">{track.artist}</div>
      </div>
    </article>
  );
}

function AlbumRow({ album }: { album: Album }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="casa-album-row">
      <span className="casa-album-rank">
        {String(album.rank).padStart(2, "0")}
      </span>

      <div className="casa-album-cover">
        {album.artwork_url && !imageFailed ? (
          <img
            src={album.artwork_url}
            alt={`Capa de ${album.title}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="casa-album-cover-empty">
            {String(album.rank).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="casa-album-info">
        <div className="casa-album-title">{album.title}</div>
        <div className="casa-album-artist">{album.artist}</div>
      </div>
    </article>
  );
}

function ArtistRow({
  artist,
  rank,
  rankingMode,
}: {
  artist: ArtistMetrics;
  rank: number;
  rankingMode: RankingMode;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const metric =
    rankingMode === "entries"
      ? formatNumber(artist.total_chart_entries)
      : rankingMode === "best"
        ? artist.best_rank != null
          ? `#${artist.best_rank}`
          : "SEM REGISTO"
        : formatListeners(artist.spotify_monthly_listeners);

  return (
    <article className="casa-artist-row-home">
      <span className="casa-artist-rank-home">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="casa-artist-image-home">
        {artist.profile_image_url && !imageFailed ? (
          <img
            src={artist.profile_image_url}
            alt={`Fotografia de ${artist.artist_name}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="casa-artist-image-empty">
            {String(rank).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="casa-artist-name-home">
        {artist.artist_name}
      </div>

      <div className="casa-artist-listeners-home">
        {metric}
      </div>
    </article>
  );
}

function HomeHighlightCard({
  artist,
  metrics,
  imageUrl,
}: {
  artist: (typeof highlights)[number];
  metrics?: ArtistMetrics;
  imageUrl?: string | null;
}) {
  const [flipped, setFlipped] = useState(false);
  const embedUrl = getSpotifyEmbed(artist.musicUrl);

  const finalImageUrl = imageUrl || metrics?.profile_image_url;

  return (
    <article
      className={`home-highlight-card ${flipped ? "is-flipped" : ""}`}
      style={{ "--card-accent": artist.color } as React.CSSProperties}
    >
      <div className="home-highlight-inner">
        <div className="home-highlight-front">
          <div className="home-highlight-image">
            {finalImageUrl ? (
              <img
                src={finalImageUrl}
                alt={`Fotografia de ${artist.name}`}
                loading="eager"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="home-highlight-placeholder">
                <span>{artist.name}</span>
                <small>CASA ORIGINAL SELECTION</small>
              </div>
            )}

            <span className="home-highlight-number">
              CASA / DESTAQUE
            </span>

            <span className="home-highlight-category">
              {artist.label}
            </span>
          </div>

          <div className="home-highlight-content">
            <div className="home-highlight-title">
              <div>
                <span className="home-highlight-kicker">
                  {artist.type}
                </span>

                <h3>{artist.name}</h3>
              </div>

              <span className="home-highlight-arrow">↗</span>
            </div>

            <div className="home-highlight-metrics">
              <div>
                <span>ENTRADAS NAS CHARTS</span>
                <strong>
                  {formatNumber(metrics?.total_chart_entries)}
                </strong>
              </div>

              <div>
                <span>MELHOR POSIÇÃO</span>
                <strong>
                  {metrics?.best_rank != null
                    ? `#${metrics.best_rank}`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>TOP 10</span>
                <strong>
                  {formatNumber(metrics?.top_10_entries)}
                </strong>
              </div>
            </div>

            {embedUrl ? (
              <div className="home-highlight-spotify">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="80"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title={`Spotify ${artist.name}`}
                />
              </div>
            ) : (
              <div className="home-highlight-music">
                <span>CASA SELECTION</span>
                <small>OUVE NO SPOTIFY</small>
                <strong>↗</strong>
              </div>
            )}

            <button
              type="button"
              className="home-highlight-more"
              onClick={() => setFlipped(true)}
            >
              LER SOBRE O ARTISTA
              <span>↗</span>
            </button>
          </div>
        </div>

        <div className="home-highlight-back">
          <div className="home-highlight-back-top">
            <span>CASA / ARTISTA EM DESTAQUE</span>
            <span>01</span>
          </div>

          <div className="home-highlight-back-category">
            {artist.label}
          </div>

          <h3>{artist.name}</h3>

          <div className="home-highlight-copy">
            {artist.description}
          </div>

          {artist.articleUrl && (
            <a
              className="home-highlight-article"
              href={artist.articleUrl}
              target="_blank"
              rel="noreferrer"
            >
              LER ARTIGO COMPLETO ↗
            </a>
          )}

          <button
            type="button"
            className="home-highlight-back-button"
            onClick={() => setFlipped(false)}
          >
            ↶ VOLTAR
          </button>
        </div>
      </div>
    </article>
  );
}
export default function HomePage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [metrics, setMetrics] = useState<ArtistMetrics[]>([]);
  const [publishedHighlights, setPublishedHighlights] =
    useState<PublishedHighlight[]>([]);
  const [homepageEditorialHighlights, setHomepageEditorialHighlights] = useState<HomepageEditorialHighlight[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([
    { section_key: "articles", title: "ARTIGOS", sort_order: 1, is_enabled: true },
    { section_key: "interviews", title: "ENTREVISTAS", sort_order: 2, is_enabled: true },
    { section_key: "voting", title: "VOTAÇÕES", sort_order: 3, is_enabled: false },
  ]);
  const [homepagePoll, setHomepagePoll] = useState<HomepagePoll | null>(null);
  const [rankingMode, setRankingMode] =
    useState<RankingMode>("listeners");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepage() {
      if (!supabase) {
        setError("Não foi possível estabelecer ligação à base de dados.");
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const [
        songsResult,
        artistsResult,
        metricsResult,
        albumsResult,
        highlightsResult,
        homepageSectionsResult,
        editorialHighlightsResult,
        homepagePollResult,
      ] = await Promise.all([
        supabase
          .from("casa_public_songs_chart")
          .select("rank, title, artist, chart_date, artwork_url")
          .order("rank", { ascending: true })
          .limit(10),

        supabase
          .from("casa_artist_rankings")
          .select(
            "artist_id, artist_rank, artist_name, profile_image_url, spotify_monthly_listeners"
          )
          .order("artist_rank", { ascending: true })
          .limit(10),

        supabase
          .from("casa_artist_rankings")
          .select(`
            artist_id,
            artist_name,
            profile_image_url,
            total_chart_entries,
            top_10_entries,
            top_20_entries,
            best_rank,
            current_chart_entries,
            current_best_rank,
            spotify_monthly_listeners
          `),

        supabase
          .from("casa_public_albums_chart")
          .select("rank, title, artist, chart_date, artwork_url")
          .order("rank", { ascending: true })
          .limit(10),

        supabase
          .from("casa_artist_of_the_month")
          .select(
            "id, category, artist_name, image_url, description, starts_at, ends_at, is_published"
          )
          .eq("is_published", true)
          .lte("starts_at", today)
          .or(`ends_at.is.null,ends_at.gte.${today}`)
          .order("starts_at", { ascending: false }),

        supabase.from("casa_homepage_sections").select("section_key,title,sort_order,is_enabled").order("sort_order"),
        supabase.from("casa_homepage_editorial").select("id,content_type,title,subtitle,category,link_url,image_url,sort_order").eq("is_enabled", true).order("sort_order"),
        supabase.from("casa_vote_content").select("title,description,link_url").eq("key", "poll").eq("is_enabled", true).maybeSingle(),
      ]);

      if (cancelled) return;

      if (songsResult.error) {
        console.error("Erro ao carregar singles:", songsResult.error);
      }

      if (artistsResult.error) {
        console.error("Erro ao carregar artistas:", artistsResult.error);
      }

      if (metricsResult.error) {
        console.error(
          "Erro ao carregar métricas dos destaques:",
          metricsResult.error
        );
      }

      if (albumsResult.error) {
        console.error("Erro ao carregar álbuns:", albumsResult.error);
      }

      if (highlightsResult.error) {
        console.error(
          "Erro ao carregar destaques publicados:",
          highlightsResult.error
        );
      } else {
        setPublishedHighlights(
          (highlightsResult.data ?? []) as PublishedHighlight[]
        );
      }

      if (homepageSectionsResult.data) setHomepageSections(homepageSectionsResult.data as HomepageSection[]);
      if (editorialHighlightsResult.error) {
        console.error(
          "Erro ao carregar os conteúdos editoriais da homepage:",
          editorialHighlightsResult.error
        );
      } else {
        setHomepageEditorialHighlights(
          (editorialHighlightsResult.data ?? []) as HomepageEditorialHighlight[]
        );
      }
      if (homepagePollResult.data) setHomepagePoll(homepagePollResult.data as HomepagePoll);

      if (
        songsResult.error &&
        artistsResult.error &&
        metricsResult.error &&
        albumsResult.error
      ) {
        setError("Não foi possível carregar os dados da CASA.");
        setLoading(false);
        return;
      }

      setTracks((songsResult.data ?? []) as Track[]);
      setArtists((artistsResult.data ?? []) as Artist[]);
      setAlbums((albumsResult.data ?? []) as Album[]);
      setMetrics((metricsResult.data ?? []) as ArtistMetrics[]);
      setLoading(false);
    }

    loadHomepage();

    return () => {
      cancelled = true;
    };
  }, []);

  function findArtist(name: string): ArtistMetrics | undefined {
  const normalizedName = normalize(name);

  const metric = metrics.find(
    (artist) => normalize(artist.artist_name) === normalizedName
  );

  const rankedArtist = artists.find(
    (artist) => normalize(artist.artist_name) === normalizedName
  );

  if (!metric && !rankedArtist) return undefined;

  return {
    ...(metric ?? {
      artist_id: rankedArtist?.artist_id ?? "",
      artist_name: rankedArtist?.artist_name ?? name,
      total_chart_entries: 0,
      top_10_entries: 0,
      top_20_entries: 0,
      best_rank: null,
      current_chart_entries: 0,
      current_best_rank: null,
      spotify_monthly_listeners:
        rankedArtist?.spotify_monthly_listeners ?? null,
    }),
    profile_image_url:
      metric?.profile_image_url ||
      rankedArtist?.profile_image_url ||
      null,
  };
}

  const rankedArtists = [...metrics].sort((a, b) => {
    if (rankingMode === "entries") {
      return (
        (b.total_chart_entries ?? -1) -
        (a.total_chart_entries ?? -1)
      );
    }

    if (rankingMode === "best") {
      return (
        (a.best_rank ?? Infinity) -
        (b.best_rank ?? Infinity)
      );
    }

    return (
      (b.spotify_monthly_listeners ?? -1) -
      (a.spotify_monthly_listeners ?? -1)
    );
  });

  const chartDate = tracks[0]?.chart_date;

  const formattedDate = chartDate
    ? new Date(`${chartDate}T12:00:00`)
        .toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase()
    : "EDIÇÃO CASA";

  const displayedHighlights =
    publishedHighlights.length > 0
      ? publishedHighlights.map((item) => {
          const template =
            categoryTemplates[item.category] || highlights[0];

          return {
            ...template,
            name: item.artist_name,
            type: categoryLabels[item.category] || template.type,
            description: item.description || template.description,
            imageUrl: item.image_url,
            musicUrl: "",
            articleUrl: "",
          };
        })
      : highlights.map((item) => ({
          ...item,
          imageUrl: null,
        }));

  return (
    <main className="casa-home" id="top">
      {error && (
        <div className="casa-home-message casa-home-error" role="alert">
          {error}
        </div>
      )}

      <div className="home-charts-grid">
        <div className="home-left-charts-column">
          <section className="casa-home-section" id="singles">
            <div className="casa-section-heading">
              <div>
                <span className="casa-section-kicker">
                  01 / RANKING NACIONAL
                </span>
                <h2>TOP 10 SINGLES</h2>
              </div>

              <Link href="/charts/singles" className="casa-section-link">
                CHART COMPLETO ↗
              </Link>
            </div>

            <div className="casa-section-meta">
              <span>CASA SINGLES CHART</span>
              <span>{formattedDate}</span>
            </div>

            {loading ? (
              <div className="casa-home-message">A CARREGAR SINGLES...</div>
            ) : tracks.length > 0 ? (
              <div className="casa-single-list">
                {tracks.map((track) => (
                  <SingleRow
                    key={`${track.rank}-${track.title}`}
                    track={track}
                  />
                ))}
              </div>
            ) : (
              <div className="casa-home-message">
                Não existem singles disponíveis para apresentar.
              </div>
            )}
          </section>

          <section
            className="casa-home-section casa-albums-section"
            id="albums"
          >
            <div className="casa-section-heading">
              <div>
                <span className="casa-section-kicker">
                  03 / ÁLBUNS EM DESTAQUE
                </span>
                <h2>TOP 10 ÁLBUNS</h2>
              </div>

              <Link href="/charts/albuns" className="casa-section-link">
                CHART COMPLETO ↗
              </Link>
            </div>

            <div className="casa-section-meta">
              <span>CASA ALBUMS CHART</span>
              <span>RANKING NACIONAL</span>
            </div>

            {loading ? (
              <div className="casa-home-message">A CARREGAR ÁLBUNS...</div>
            ) : albums.length > 0 ? (
              <div className="casa-album-list">
                {albums.map((album) => (
                  <AlbumRow
                    key={`${album.rank}-${album.title}`}
                    album={album}
                  />
                ))}
              </div>
            ) : (
              <div className="casa-home-message">
                Não existem álbuns disponíveis para apresentar.
              </div>
            )}
          </section>
        </div>

        <div className="home-right-charts-column">
          <section className="casa-home-section" id="artists">
            <div className="casa-section-heading">
              <div>
                <span className="casa-section-kicker">
                  02 / QUEM MOVE A MÚSICA
                </span>
                <h2>TOP 10 ARTISTAS</h2>
              </div>

              <Link href="/artistas" className="casa-section-link">
                VER TODOS ↗
              </Link>
            </div>

            <div className="casa-artist-ranking-switcher" role="group" aria-label="Critério de ordenação dos artistas">
              <button
                type="button"
                className={rankingMode === "entries" ? "active" : ""}
                aria-pressed={rankingMode === "entries"}
                onClick={() => setRankingMode("entries")}
              >
                N.º DE ENTRADAS
              </button>

              <button
                type="button"
                className={rankingMode === "best" ? "active" : ""}
                aria-pressed={rankingMode === "best"}
                onClick={() => setRankingMode("best")}
              >
                MELHOR POSIÇÃO
              </button>

              <button
                type="button"
                className={rankingMode === "listeners" ? "active" : ""}
                aria-pressed={rankingMode === "listeners"}
                onClick={() => setRankingMode("listeners")}
              >
                OUVINTES MENSAIS
              </button>
            </div>

            <div className="casa-section-meta">
              <span>
                {rankingMode === "entries"
                  ? "TOTAL DE ENTRADAS NAS CHARTS"
                  : rankingMode === "best"
                    ? "MELHOR POSIÇÃO HISTÓRICA"
                    : "OUVINTES MENSAIS · SPOTIFY"}
              </span>

              <span>RANKING CASA</span>
            </div>

            {loading ? (
              <div className="casa-home-message">
                A CARREGAR ARTISTAS...
              </div>
            ) : rankedArtists.length > 0 ? (
              <div className="casa-artist-list">
                {rankedArtists.slice(0, 10).map((artist, index) => (
                  <ArtistRow
                    key={artist.artist_id}
                    artist={artist}
                    rank={index + 1}
                    rankingMode={rankingMode}
                  />
                ))}
              </div>
            ) : (
              <div className="casa-home-message">
                Não existem artistas disponíveis para apresentar.
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="casa-home-section home-featured-section">
        <div className="casa-section-heading">
          <div>
            <span className="casa-section-kicker">
              03 / CASA ORIGINAL SELECTION
            </span>
            <h2>DESTAQUES</h2>
          </div>

          <Link href="/destaques" className="casa-section-link">
            VER TODOS ↗
          </Link>
        </div>

        <div className="home-featured-grid">
          {displayedHighlights.map((artist) => (
            <HomeHighlightCard
              key={artist.name}
              artist={artist}
              metrics={findArtist(artist.name)}
              imageUrl={artist.imageUrl}
            />
          ))}
        </div>

      </section>
      {homepageSections.filter((section) => section.is_enabled).sort((a, b) => a.sort_order - b.sort_order).map((section, sectionIndex) => {
        if (section.section_key === "voting") {
          if (!homepagePoll?.link_url) return null;
          return <div className="home-voting-banner" key="homepage-voting">
            <div><span>CASA AWARDS · A VOZ É TUA</span><h3>{homepagePoll.title || "QUEM MERECE VENCER?"}</h3><p>{homepagePoll.description || "Participa na votação dos destaques da música angolana."}</p></div>
            <a href={homepagePoll.link_url} target="_blank" rel="noreferrer">{homepagePoll.title || "VOTAR"} ↗</a>
          </div>;
        }
        const type = section.section_key === "articles" ? "article" : "interview";
        const items = homepageEditorialHighlights.filter((item) => item.content_type === type).sort((a, b) => a.sort_order - b.sort_order);
        return <section className="casa-home-section home-editorial-section" key={section.section_key}>
          <div className="casa-section-heading"><div><span className="casa-section-kicker">{String(sectionIndex + 4).padStart(2, "0")} / CASA EDITORIAL</span><h2>{section.title}</h2></div><Link href="/artigos" className="casa-section-link">EXPLORAR {section.title} ↗</Link></div>
          <div className="home-editorial-grid">{items.length ? items.map((item, index) => {
            const href = item.link_url?.trim() || "/artigos";
            const external = /^https?:\/\//i.test(href);
            return <Link key={item.id} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={`home-editorial-card ${type === "article" ? "home-news-card" : "home-interviews-card"}`}>
              <span>{String(index + 1).padStart(2, "0")} / CASA {type === "article" ? "LEITURAS" : "CONVERSAS"}</span>
              <div>{item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : null}<small>{item.category || section.title}</small><h3>{item.title}</h3>{item.subtitle ? <p>{item.subtitle}</p> : null}</div>
              <span className="home-editorial-arrow">↗</span>
            </Link>;
          }) : <Link href="/artigos" className={`home-editorial-card ${type === "article" ? "home-news-card" : "home-interviews-card"}`}><span>CASA / {section.title}</span><div><small>CASA EDITORIAL</small><h3>{type === "article" ? "HISTÓRIAS QUE MERECEM SER LIDAS." : "CONVERSAS COM QUEM CONSTRÓI A MÚSICA."}</h3><p>Os conteúdos selecionados pela equipa CASA aparecem aqui.</p></div><span className="home-editorial-arrow">↗</span></Link>}</div>
        </section>;
      })}

      <footer className="casa-home-footer">
        <Link href="/" className="casa-footer-logo">
          CASA®
        </Link>

        <div className="casa-footer-copy">
          CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS
          <br />
          MÚSICA · CULTURA · DADOS
          <br />
          © CASA
        </div>
      </footer>

      <style jsx global>{`
        .home-featured-section,
        .home-editorial-section {
          margin-top: 65px;
        }

        .home-featured-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
        }

        .home-highlight-card {
          grid-column: span 2;
          min-width: 0;
          height: 540px;
          perspective: 1100px;
        }

        .home-highlight-card:nth-child(1),
        .home-highlight-card:nth-child(2) {
          grid-column: span 3;
          height: 570px;
        }

        .home-highlight-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 650ms cubic-bezier(.2,.7,.2,1);
          transform-style: preserve-3d;
        }

        .home-highlight-card.is-flipped .home-highlight-inner {
          transform: rotateY(180deg);
        }

        .home-highlight-front,
        .home-highlight-back {
          position: absolute;
          inset: 0;
          overflow: hidden;
          backface-visibility: hidden;
          border: 1px solid var(--casa-border);
          border-radius: 5px;
        }

        .home-highlight-front {
          display: flex;
          flex-direction: column;
          background: #fff;
          color: #090909;
        }

        .home-highlight-image {
          height: 34%;
          min-height: 130px;
          position: relative;
          overflow: hidden;
          background: var(--card-accent);
        }

        .home-highlight-image > img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          inset: 0;
        }

        .home-highlight-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 15px;
          text-align: center;
          color: #090909;
        }

        .home-highlight-placeholder span {
          font-size: clamp(25px, 4vw, 48px);
          font-weight: 900;
          letter-spacing: -.07em;
          text-transform: uppercase;
        }

        .home-highlight-placeholder small {
          margin-top: 10px;
          font: 9px monospace;
        }

        .home-highlight-number,
        .home-highlight-category {
          position: absolute;
          top: 10px;
          padding: 7px 9px;
          background: #090909;
          color: white;
          font: 9px monospace;
        }

        .home-highlight-number { left: 10px; }
        .home-highlight-category { right: 10px; }

        .home-highlight-content {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 13px;
        }

        .home-highlight-title {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .home-highlight-kicker {
          font: 9px monospace;
          color: #858585;
        }

        .home-highlight-title h3 {
          margin: 4px 0 0;
          font-size: clamp(25px, 3vw, 38px);
          line-height: .95;
          letter-spacing: -.07em;
          font-weight: 850;
        }

        .home-highlight-arrow {
          color: var(--card-accent);
          font-size: 23px;
        }

        .home-highlight-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px 7px;
          padding: 10px 0;
          border-top: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
        }

        .home-highlight-metrics > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .home-highlight-metrics span {
          color: #858585;
          font: 8px monospace;
          line-height: 1.3;
        }

        .home-highlight-metrics strong {
          font-size: 15px;
          letter-spacing: -.04em;
          overflow-wrap: anywhere;
        }

        .home-highlight-spotify {
          margin-top: auto;
          overflow: hidden;
          border-radius: 7px;
        }

        .home-highlight-spotify iframe {
          display: block;
          border: 0;
        }

        .home-highlight-music {
          margin-top: auto;
          min-height: 48px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 3px 8px;
          padding: 8px 10px;
          border: 1px solid #e5e5e5;
        }

        .home-highlight-music span,
        .home-highlight-music small {
          color: #858585;
          font: 8px monospace;
        }

        .home-highlight-music strong {
          grid-column: 2;
          grid-row: 1 / 3;
          font-size: 14px;
        }

        .home-highlight-more {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 10px 12px;
          border: 0;
          background: var(--card-accent);
          color: #090909;
          font: 10px monospace;
          cursor: pointer;
        }

        .home-highlight-back {
          transform: rotateY(180deg);
          display: flex;
          flex-direction: column;
          padding: 18px;
          background: var(--card-accent);
          color: #090909;
        }

        .home-highlight-back-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font: 9px monospace;
        }

        .home-highlight-back-category {
          margin-top: 45px;
          font: 10px monospace;
        }

        .home-highlight-back h3 {
          margin: 10px 0 15px;
          font-size: clamp(35px, 5vw, 55px);
          line-height: .9;
          letter-spacing: -.08em;
        }

        .home-highlight-copy {
          font-size: 14px;
          line-height: 1.6;
        }

        .home-highlight-article {
          margin-top: auto;
          padding-top: 15px;
          font: 10px monospace;
          color: #090909;
        }

        .home-highlight-back-button {
          margin-top: 20px;
          padding: 12px;
          text-align: left;
          background: #090909;
          color: white;
          border: 0;
          font: 10px monospace;
          cursor: pointer;
        }

        .home-voting-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          padding: 22px;
          background: #fff;
          color: #090909;
          border: 1px solid var(--casa-border);
          border-left: 5px solid #F5D900;
        }

        .home-voting-banner > div > span {
          font: 9px monospace;
          color: #777;
        }

        .home-voting-banner h3 {
          margin: 7px 0;
          font-size: clamp(24px, 3vw, 38px);
          letter-spacing: -.06em;
        }

        .home-voting-banner p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .home-voting-banner a {
          flex-shrink: 0;
          padding: 14px 18px;
          background: #090909;
          color: white;
          font: 10px monospace;
          text-decoration: none;
        }

        .home-editorial-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .home-editorial-card {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 18px;
          color: #090909;
          text-decoration: none;
          border: 1px solid var(--casa-border);
          background: #fff;
        }

        .home-editorial-card > span:first-child,
        .home-editorial-card small {
          font: 9px monospace;
        }

        .home-editorial-card small {
          color: #777;
        }

        .home-editorial-card h3 {
          max-width: 430px;
          margin: 8px 0 0;
          font-size: clamp(25px, 4vw, 43px);
          line-height: .95;
          letter-spacing: -.07em;
        }

        .home-editorial-arrow {
          align-self: flex-end;
          font-size: 23px;
        }

        .home-news-card {
          border-top: 4px solid #24A99B;
        }

        .home-interviews-card {
          border-top: 4px solid #F184D2;
        }

        @media (max-width: 760px) {
          .home-highlight-card,
          .home-highlight-card:nth-child(1),
          .home-highlight-card:nth-child(2) {
            grid-column: span 6;
            height: 540px;
          }

          .home-voting-banner {
            align-items: flex-start;
            flex-direction: column;
          }

          .home-editorial-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px) {
          .home-highlight-card,
          .home-highlight-card:nth-child(1),
          .home-highlight-card:nth-child(2) {
            height: 510px;
          }

          .home-highlight-title h3 {
            font-size: 29px;
          }
        }

        .home-main-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 28px;
          align-items: start;
          margin-top: 35px;
        }

        .home-charts-column {
          display: flex;
          flex-direction: column;
          gap: 38px;
          min-width: 0;
        }

        .home-highlights-column {
          min-width: 0;
        }

        .home-main-layout .casa-home-section,
        .home-editorial-section {
          margin-top: 0;
        }

        .home-featured-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .home-highlight-card,
        .home-highlight-card:nth-child(1),
        .home-highlight-card:nth-child(2) {
          grid-column: auto;
          height: 215px;
          min-width: 0;
        }

        .home-highlight-image {
          height: 65px;
          min-height: 65px;
          flex-shrink: 0;
        }

        .home-highlight-placeholder span {
          font-size: 22px;
        }

        .home-highlight-placeholder small {
          font-size: 7px;
          margin-top: 4px;
        }

        .home-highlight-number,
        .home-highlight-category {
          top: 6px;
          padding: 4px 6px;
          font-size: 7px;
        }

        .home-highlight-content {
          padding: 9px;
          gap: 5px;
        }

        .home-highlight-kicker {
          font-size: 7px;
        }

        .home-highlight-title h3 {
          font-size: 19px;
          line-height: 1;
        }

        .home-highlight-arrow {
          font-size: 16px;
        }

        .home-highlight-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px;
          padding: 5px 0;
        }

        .home-highlight-metrics > div:nth-child(n+3) {
          display: none;
        }

        .home-highlight-metrics span {
          font-size: 6px;
        }

        .home-highlight-metrics strong {
          font-size: 10px;
        }

        .home-highlight-spotify,
        .home-highlight-music {
          display: none;
        }

        .home-highlight-more {
          margin-top: auto;
          padding: 6px 8px;
          font-size: 8px;
        }

        .home-highlight-back {
          padding: 12px;
        }

        .home-highlight-back-top {
          font-size: 7px;
        }

        .home-highlight-back-category {
          margin-top: 18px;
          font-size: 8px;
        }

        .home-highlight-back h3 {
          font-size: 29px;
          margin: 8px 0;
        }

        .home-highlight-copy {
          font-size: 11px;
          line-height: 1.4;
          overflow-y: auto;
        }

        .home-highlight-article {
          font-size: 8px;
        }

        .home-highlight-back-button {
          margin-top: 10px;
          padding: 8px;
          font-size: 8px;
        }

        .home-voting-banner {
          display: block;
          margin-top: 12px;
          padding: 13px;
        }

        .home-voting-banner h3 {
          font-size: 21px;
        }

        .home-voting-banner p {
          font-size: 11px;
          line-height: 1.4;
        }

        .home-voting-banner a {
          display: inline-block;
          margin-top: 10px;
          padding: 9px 11px;
          font-size: 8px;
        }

        .home-editorial-section {
          margin-top: 42px;
        }

        .home-editorial-grid {
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .home-editorial-card {
          min-height: 105px;
          padding: 12px;
        }

        .home-editorial-card h3 {
          font-size: 21px;
        }

        @media (max-width: 900px) {
          .home-main-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .home-highlights-column {
            margin-top: 10px;
          }

          .home-featured-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .home-highlight-card,
          .home-highlight-card:nth-child(1),
          .home-highlight-card:nth-child(2) {
            height: 215px;
          }
        }

        @media (max-width: 600px) {
          .home-main-layout {
            gap: 28px;
            margin-top: 25px;
          }

          .home-featured-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .home-highlight-card,
          .home-highlight-card:nth-child(1),
          .home-highlight-card:nth-child(2) {
            height: 215px;
          }

          .home-editorial-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 360px) {
          .home-featured-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Layout original das charts */

        .home-charts-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 30px;
          align-items: start;
          margin-top: 35px;
        }

        .home-charts-grid > .casa-home-section {
          min-width: 0;
          margin: 0;
        }

        .home-right-charts-column {
          display: flex;
          flex-direction: column;
          gap: 42px;
          min-width: 0;
        }

        .home-right-charts-column > .casa-home-section {
          min-width: 0;
          margin: 0;
        }

        .home-featured-section {
          margin-top: 58px;
        }

        .home-featured-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-auto-rows: 420px;
          gap: 14px;
          align-items: stretch;
        }

        .home-highlight-card,
        .home-highlight-card:nth-child(1),
        .home-highlight-card:nth-child(2) {
          grid-column: auto;
          grid-row: auto;
          height: 420px;
          min-width: 0;
        }

        .home-highlight-card:first-child {
          grid-column: span 2;
          grid-row: span 2;
          height: auto;
        }

        .home-highlight-card:first-child .home-highlight-image {
          height: 42%;
          min-height: 210px;
        }

        .home-highlight-card:first-child .home-highlight-content {
          padding: 20px;
          gap: 12px;
        }

        .home-highlight-card:first-child .home-highlight-title h3 {
          font-size: clamp(34px, 4vw, 54px);
        }

        .home-highlight-card:first-child .home-highlight-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .home-highlight-card:first-child .home-highlight-metrics span {
          font-size: 9px;
        }

        .home-highlight-card:first-child .home-highlight-metrics strong {
          font-size: 17px;
        }

        .home-highlight-card:first-child .home-highlight-copy {
          font-size: 15px;
          line-height: 1.65;
        }

        .home-highlight-image {
          height: 30%;
          min-height: 125px;
        }

        .home-highlight-content {
          padding: 14px;
          gap: 8px;
        }

        .home-highlight-title h3 {
          font-size: clamp(23px, 2.2vw, 32px);
        }

        .home-highlight-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .home-highlight-metrics > div:nth-child(n+5) {
          display: none;
        }

        .home-highlight-metrics span {
          font-size: 7px;
        }

        .home-highlight-metrics strong {
          font-size: 13px;
        }

        .home-highlight-spotify iframe {
          height: 80px;
        }

        .home-voting-banner {
          margin-top: 20px;
        }

        .home-editorial-section {
          margin-top: 58px;
        }

        .casa-albums-section {
          min-width: 0;
          margin: 0;
        }

        .casa-album-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 24px;
        }

        .casa-album-row {
          display: grid;
          grid-template-columns: 25px 46px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          min-width: 0;
          min-height: 73px;
          padding: 9px 0;
          border-bottom: 1px solid var(--casa-border);
          transition: transform 250ms ease;
        }

        .casa-album-row:hover {
          transform: translateX(3px);
        }

        .casa-album-cover {
          width: 46px;
          height: 46px;
          overflow: hidden;
          border-radius: 4px;
          background: var(--casa-border);
        }

        .casa-album-cover img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .casa-album-cover-empty {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          font: 12px monospace;
        }

        .casa-album-rank {
          color: var(--casa-muted, #888);
          font: 12px monospace;
        }

        .casa-album-info {
          min-width: 0;
        }

        .casa-album-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 750;
        }

        .casa-album-artist {
          margin-top: 4px;
          color: var(--casa-muted, #888);
          font-size: 11px;
        }

        .home-charts-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 30px;
          align-items: start;
          margin-top: 35px;
        }

        .home-left-charts-column {
          display: flex;
          flex-direction: column;
          gap: 42px;
          min-width: 0;
        }

        .home-right-charts-column {
          display: block;
          min-width: 0;
        }

        .home-left-charts-column > .casa-home-section,
        .home-right-charts-column > .casa-home-section {
          min-width: 0;
          margin: 0;
        }

        @media (max-width: 1050px) {
          .home-charts-grid {
            grid-template-columns: 1fr;
            gap: 38px;
          }

          .home-left-charts-column {
            gap: 38px;
          }
        }

        @media (max-width: 600px) {
          .home-charts-grid {
            margin-top: 25px;
            gap: 30px;
          }

          .home-left-charts-column {
            gap: 30px;
          }

          .casa-album-list {
            grid-template-columns: 1fr;
          }

          .casa-album-row {
            grid-template-columns: 25px 46px minmax(0, 1fr);
            min-height: 65px;
            gap: 9px;
          }

          .casa-album-cover {
            width: 46px;
            height: 46px;
          }

          .casa-album-title {
            font-size: 13px;
          }

          .casa-album-artist {
            font-size: 11px;
          }
        }

        /* Seletor dos três rankings de artistas */

        .casa-artist-ranking-switcher {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 15px 0 12px;
        }

        .casa-artist-ranking-switcher button {
          padding: 8px 11px;
          border: 1px solid var(--casa-border);
          border-radius: 30px;
          background: transparent;
          color: var(--casa-foreground);
          font-family: inherit;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .02em;
          cursor: pointer;
          transition:
            background 200ms ease,
            color 200ms ease,
            border-color 200ms ease,
            transform 200ms ease;
        }

        .casa-artist-ranking-switcher button:hover {
          transform: translateY(-2px);
          border-color: var(--casa-foreground);
        }

        .casa-artist-ranking-switcher button.active {
          background: var(--casa-foreground);
          color: var(--casa-background);
          border-color: var(--casa-foreground);
        }

        @media (max-width: 600px) {
          .casa-artist-ranking-switcher {
            gap: 5px;
          }

          .casa-artist-ranking-switcher button {
            padding: 7px 8px;
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}
