"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Classification = "Mainstream" | "Nova Escola" | "Velha Escola";
type ActTypeFilter = "all" | "solo" | "group";

type Artist = {
  artist_id: string;
  artist_rank: number;
  artist_name: string;
  act_type: string | null;
  profile_image_url: string | null;
  spotify_monthly_listeners: number | null;
  spotify_listeners_observed_at: string | null;
  spotify_artist_id: string | null;
  artist_generations: string[];
};

type RankingRow = {
  artist_id: string;
  artist_rank: number;
  artist_name: string;
  act_type: string | null;
  profile_image_url: string | null;
  image_url: string | null;
  manual_image_url: string | null;
  spotify_monthly_listeners: number | null;
  spotify_listeners_observed_at: string | null;
  spotify_artist_id: string | null;
};

type RankingTab = Classification;

const colors = {
  blue: "#214BEF",
  orange: "#F0522B",
  cream: "#EEEAE1",
  black: "#111111",
  muted: "#77736D",
  line: "#D5D0C7",
};

const mono = '"IBM Plex Mono", monospace';
const sans =
  '"Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif';

function normalizeArtistName(name: string | null | undefined) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) {
    return "INDISPONÍVEL";
  }

  return new Intl.NumberFormat("pt-PT").format(value);
}

function ArtistImage({ artist }: { artist: Artist }) {
  const [failed, setFailed] = useState(false);

  const initials = artist.artist_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="listeners-image">
      {artist.profile_image_url && !failed ? (
        <img
          src={artist.profile_image_url}
          alt={`Fotografia de ${artist.artist_name}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials || "C"}</span>
      )}
    </div>
  );
}

export default function MonthlyListenersPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [activeTab, setActiveTab] =
    useState<RankingTab>("Mainstream");
  const [search, setSearch] = useState("");
  const [actTypeFilter, setActTypeFilter] =
    useState<ActTypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      if (!supabase) {
        setError("Configuração do Supabase não encontrada.");
        setLoading(false);
        return;
      }

      const [
        { data: rankingData, error: rankingError },
        { data: classificationData, error: classificationError },
      ] = await Promise.all([
        supabase
          .from("casa_artist_rankings")
          .select("*")
          .order("spotify_monthly_listeners", {
            ascending: false,
            nullsFirst: false,
          }),

        supabase
          .from("artists")
          .select("id, canonical_name, artist_generations"),
      ]);

      if (cancelled) return;

      if (rankingError) {
        console.error("Erro ao carregar ranking:", rankingError);
        setError(
          `Erro ao carregar os ouvintes mensais: ${rankingError.message}`,
        );
        setLoading(false);
        return;
      }

      if (classificationError) {
        console.error(
          "Erro ao carregar classificações:",
          classificationError,
        );
        setError(
          `Erro ao carregar as classificações: ${classificationError.message}`,
        );
        setLoading(false);
        return;
      }

      const classificationsByName = new Map<
        string,
        string[]
      >();

      const classificationsById = new Map<
        string,
        string[]
      >();

      for (const artist of classificationData ?? []) {
        const generations = artist.artist_generations ?? [];

        classificationsById.set(artist.id, generations);

        classificationsByName.set(
          normalizeArtistName(artist.canonical_name),
          generations,
        );
      }

      const rankingRows = (rankingData ?? []) as RankingRow[];

      const combinedArtists: Artist[] = rankingRows.map((artist) => {
        const generations =
          classificationsById.get(artist.artist_id) ??
          classificationsByName.get(
            normalizeArtistName(artist.artist_name),
          ) ??
          [];

        return {
          artist_id: artist.artist_id,
          artist_rank: artist.artist_rank,
          artist_name: artist.artist_name,
          act_type: artist.act_type ?? null,
          profile_image_url:
            artist.profile_image_url ??
            artist.image_url ??
            artist.manual_image_url ??
            null,
          spotify_monthly_listeners:
            artist.spotify_monthly_listeners ?? null,
          spotify_listeners_observed_at:
            artist.spotify_listeners_observed_at ?? null,
          spotify_artist_id:
            artist.spotify_artist_id ?? null,
          artist_generations: generations,
        };
      });

      console.log("CASA ouvintes mensais:", {
        totalNoRanking: rankingData?.length ?? 0,
        totalNaTabelaArtists: classificationData?.length ?? 0,
        totalComClassificacao: combinedArtists.filter(
          (artist) => artist.artist_generations.length > 0,
        ).length,
        exemploRanking: rankingData?.[0] ?? null,
        exemploClassificacao: classificationData?.[0] ?? null,
      });

      setArtists(combinedArtists);
      setLoading(false);
    }

    loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  const tabs: RankingTab[] = [
    "Mainstream",
    "Nova Escola",
    "Velha Escola",
  ];

  const tabDescriptions: Record<RankingTab, string> = {
    Mainstream: "O panorama completo da música angolana.",
    "Nova Escola": "Os artistas da nova geração.",
    "Velha Escola": "Os nomes que marcaram gerações.",
  };

  const classifiedArtists = useMemo(() => {
    const query = normalizeArtistName(search);

    return artists
      .filter((artist) =>
        artist.artist_generations.includes(activeTab),
      )
      .filter((artist) => {
        if (actTypeFilter === "all") return true;
        return artist.act_type === actTypeFilter;
      })
      .filter((artist) =>
        normalizeArtistName(artist.artist_name).includes(query),
      )
      .sort((a, b) => {
        const listenersA = a.spotify_monthly_listeners ?? -1;
        const listenersB = b.spotify_monthly_listeners ?? -1;

        return listenersB - listenersA;
      });
  }, [artists, activeTab, actTypeFilter, search]);

  const artistsWithListeners = classifiedArtists.filter(
    (artist) => artist.spotify_monthly_listeners !== null,
  ).length;

  const totalListeners = classifiedArtists.reduce(
    (total, artist) =>
      total + (artist.spotify_monthly_listeners ?? 0),
    0,
  );

  const latestMetricDate = classifiedArtists
    .map((artist) => artist.spotify_listeners_observed_at)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  const formattedMetricDate = latestMetricDate
    ? new Date(latestMetricDate).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "SEM REGISTOS";

  return (
    <main className="listeners-page">
      <section className="listeners-intro">
        <div>
          <div className="listeners-eyebrow">
            <span>●</span> MÚSICA ANGOLANA · AUDIÊNCIAS
          </div>

          <h1>
            QUEM É
            <br />
            MAIS OUVIDO
            <br />
            <span>EM ANGOLA?</span>
          </h1>
        </div>

        <p>
          Um ranking dos artistas angolanos com maior número
          de ouvintes mensais no Spotify, organizado por
          classificação musical.
        </p>
      </section>

      <section className="listeners-overview">
        <article className="listeners-stat">
          <span>ARTISTAS NA CLASSIFICAÇÃO</span>
          <strong>{classifiedArtists.length}</strong>
        </article>

        <article className="listeners-stat">
          <span>COM DADOS DE OUVINTES</span>
          <strong>{artistsWithListeners}</strong>
        </article>

        <article className="listeners-stat">
          <span>TOTAL DE OUVINTES</span>
          <strong>{formatNumber(totalListeners)}</strong>
        </article>
      </section>

      <section className="listeners-ranking">
        <div className="listeners-heading">
          <div>
            <span className="listeners-eyebrow">
              CLASSIFICAÇÃO POR AUDIÊNCIA
            </span>
            <h2>OUVINTES MENSAIS</h2>
          </div>

          <div className="listeners-date">
            FONTE: SPOTIFY
            <br />
            DADOS DE {formattedMetricDate.toUpperCase()}
          </div>
        </div>

        <div className="listeners-tabs" role="tablist">
          {tabs.map((tab) => {
            const count = artists.filter((artist) =>
              artist.artist_generations.includes(tab),
            ).length;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={
                  activeTab === tab
                    ? "listeners-tab listeners-tab-active"
                    : "listeners-tab"
                }
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="listeners-category-description">
          <strong>{activeTab.toUpperCase()}</strong>
          <span>{tabDescriptions[activeTab]}</span>
        </div>

        <div className="listeners-controls">
          <label className="listeners-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar artista"
              aria-label="Pesquisar artista"
            />
          </label>

          <div
            className="listeners-type-filter"
            role="group"
            aria-label="Filtrar por tipo de artista"
          >
            <button
              type="button"
              className={
                actTypeFilter === "all"
                  ? "listeners-type-button listeners-type-button-active"
                  : "listeners-type-button"
              }
              aria-pressed={actTypeFilter === "all"}
              onClick={() => setActTypeFilter("all")}
            >
              TODOS
            </button>

            <button
              type="button"
              className={
                actTypeFilter === "solo"
                  ? "listeners-type-button listeners-type-button-active"
                  : "listeners-type-button"
              }
              aria-pressed={actTypeFilter === "solo"}
              onClick={() => setActTypeFilter("solo")}
            >
              SOLO
            </button>

            <button
              type="button"
              className={
                actTypeFilter === "group"
                  ? "listeners-type-button listeners-type-button-active"
                  : "listeners-type-button"
              }
              aria-pressed={actTypeFilter === "group"}
              onClick={() => setActTypeFilter("group")}
            >
              GRUPO
            </button>
          </div>

          <span className="listeners-sort-label">
            ORDENADO POR OUVINTES MENSAIS
          </span>
        </div>

        {loading && (
          <div className="listeners-message">
            A CARREGAR OUVINTES MENSAIS...
          </div>
        )}

        {error && (
          <div className="listeners-error">{error}</div>
        )}

        {!loading && !error && (
          <>
            <div className="listeners-list-header">
              <span>POS.</span>
              <span />
              <span>ARTISTA</span>
              <span>TIPO</span>
              <span>OUVINTES MENSAIS</span>
            </div>

            <div className="listeners-list">
              {classifiedArtists.map((artist, index) => (
                <article
                  className="listeners-row"
                  key={artist.artist_id}
                >
                  <strong className="listeners-rank">
                    {String(index + 1).padStart(2, "0")}
                  </strong>

                  <ArtistImage artist={artist} />

                  <div className="listeners-artist-name">
                    <strong>{artist.artist_name}</strong>
                    <span>
                      {artist.artist_generations
                        .filter((generation) =>
                          tabs.includes(generation as RankingTab),
                        )
                        .join(" · ")}
                    </span>
                  </div>

                  <span className="listeners-act-type">
                    {artist.act_type === "group"
                      ? "GRUPO"
                      : "SOLO"}
                  </span>

                  <div className="listeners-value">
                    <strong>
                      {formatNumber(
                        artist.spotify_monthly_listeners,
                      )}
                    </strong>
                    <span>SPOTIFY</span>
                  </div>
                </article>
              ))}

              {classifiedArtists.length === 0 && (
                <div className="listeners-message">
                  Não encontrámos artistas nesta classificação.
                </div>
              )}
            </div>

            <div className="listeners-footer">
              <span>
                {classifiedArtists.length} ARTISTAS APRESENTADOS
              </span>
              <span>
                {artistsWithListeners} COM DADOS DE OUVINTES
              </span>
            </div>
          </>
        )}
      </section>

      <section className="listeners-bottom-band">
        <strong className="listeners-bottom-logo">
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
      </section>

      <footer className="listeners-bottom-footer">
        <span>
          CASA · CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS
        </span>
        <span>INDEPENDENTE POR NATUREZA.</span>
      </footer>

      <style jsx global>{`
        .listeners-page {
          --listeners-blue: #214bef;
          --listeners-orange: #f0522b;
          max-width: 1680px;
          margin: 0 auto;
          padding: 0 28px;
          color: ${colors.black};
          font-family: ${sans};
        }

        .listeners-page * {
          box-sizing: border-box;
        }

        .listeners-page a {
          color: inherit;
          text-decoration: none;
        }

        .listeners-page button,
        .listeners-page input {
          font: inherit;
        }

        .listeners-page .casa-header {
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid ${colors.black};
        }

        .listeners-page .casa-logo {
          font-size: clamp(42px, 5vw, 68px);
          font-weight: 900;
          letter-spacing: -0.095em;
          line-height: 0.9;
        }

        .listeners-page .casa-logo span {
          font-size: 15px;
          margin-left: 5px;
        }

        .listeners-page .casa-header-description {
          font: 9px ${mono};
          letter-spacing: 0.045em;
          text-align: right;
        }

        .listeners-page .casa-nav {
          min-height: 53px;
          display: flex;
          align-items: center;
          gap: 25px;
          border-bottom: 1px solid ${colors.line};
          font: 10px ${mono};
          letter-spacing: 0.06em;
          overflow-x: auto;
          white-space: nowrap;
        }

        .listeners-page .casa-nav-active {
          height: 53px;
          display: flex;
          align-items: center;
          border-bottom: 3px solid ${colors.orange};
        }

        .listeners-page .casa-market {
          margin-left: auto;
        }

        .listeners-page .casa-market strong {
          background: ${colors.black};
          color: ${colors.cream};
          padding: 4px 6px;
        }

        .listeners-intro {
          padding: 75px 0 45px;
          display: grid;
          grid-template-columns: 1.4fr 0.6fr;
          gap: 30px;
          align-items: end;
        }

        .listeners-eyebrow {
          font: 10px ${mono};
          letter-spacing: 0.06em;
          color: ${colors.blue};
        }

        .listeners-eyebrow span {
          color: ${colors.orange};
        }

        .listeners-intro h1 {
          font-size: clamp(48px, 7vw, 100px);
          line-height: 0.86;
          letter-spacing: -0.085em;
          font-weight: 850;
          margin: 20px 0 0;
        }

        .listeners-intro h1 span {
          color: ${colors.blue};
        }

        .listeners-intro p {
          font: 11px/1.7 ${mono};
          color: ${colors.muted};
          max-width: 340px;
          margin: 0 0 5px auto;
        }

        .listeners-overview {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 75px;
        }

        .listeners-stat {
          padding: 20px;
          min-height: 115px;
          border: 1px solid ${colors.line};
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
        }

        .listeners-stat span {
          font: 9px ${mono};
          letter-spacing: 0.07em;
          color: ${colors.muted};
        }

        .listeners-stat strong {
          font-size: clamp(27px, 3.5vw, 43px);
          line-height: 0.95;
          letter-spacing: -0.07em;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
        }

        .listeners-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          border-bottom: 1px solid ${colors.black};
          padding-bottom: 20px;
          margin-bottom: 20px;
        }

        .listeners-heading h2 {
          font-size: clamp(34px, 5vw, 68px);
          line-height: 0.9;
          letter-spacing: -0.08em;
          margin: 10px 0 0;
        }

        .listeners-date {
          font: 9px/1.7 ${mono};
          color: ${colors.muted};
          text-align: right;
        }

        .listeners-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 30px 0 0;
        }

        .listeners-tab {
          min-height: 62px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border: 1px solid ${colors.line};
          border-radius: 8px;
          background: transparent;
          color: ${colors.black};
          cursor: pointer;
          font: 10px ${mono};
          letter-spacing: 0.04em;
          text-align: left;
          transition: background 0.2s, color 0.2s;
        }

        .listeners-tab span {
          color: ${colors.muted};
          font-size: 11px;
        }

        .listeners-tab-active {
          background: ${colors.black};
          border-color: ${colors.black};
          color: ${colors.cream};
        }

        .listeners-tab-active span {
          color: ${colors.cream};
        }

        .listeners-category-description {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px 0;
          border-bottom: 1px solid ${colors.line};
          font: 10px ${mono};
        }

        .listeners-category-description strong {
          color: ${colors.blue};
          letter-spacing: 0.05em;
        }

        .listeners-category-description span {
          color: ${colors.muted};
        }

        .listeners-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin: 22px 0 25px;
        }

        .listeners-search {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid ${colors.line};
          padding: 10px 0;
          flex: 1 1 240px;
          max-width: 380px;
        }

        .listeners-search span {
          font-size: 22px;
          color: ${colors.muted};
        }

        .listeners-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font: 11px ${mono};
          color: ${colors.black};
        }

        .listeners-type-filter {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px;
          border: 1px solid ${colors.line};
          border-radius: 8px;
        }

        .listeners-type-button {
          border: 0;
          border-radius: 5px;
          padding: 9px 12px;
          background: transparent;
          color: ${colors.muted};
          cursor: pointer;
          font: 9px ${mono};
          letter-spacing: 0.04em;
          transition: background 0.2s, color 0.2s;
        }

        .listeners-type-button-active {
          background: ${colors.blue};
          color: white;
        }

        .listeners-type-button:focus-visible {
          outline: 2px solid ${colors.orange};
          outline-offset: 2px;
        }

        .listeners-sort-label {
          font: 9px ${mono};
          letter-spacing: 0.05em;
          color: ${colors.muted};
        }

        .listeners-list-header,
        .listeners-row {
          display: grid;
          grid-template-columns: 55px 58px minmax(180px, 1fr) 100px minmax(150px, 220px);
          align-items: center;
          gap: 14px;
        }

        .listeners-list-header {
          padding: 12px 10px;
          border-bottom: 1px solid ${colors.black};
          font: 9px ${mono};
          letter-spacing: 0.06em;
          color: ${colors.muted};
        }

        .listeners-list-header span:last-child {
          text-align: right;
        }

        .listeners-row {
          min-height: 88px;
          padding: 12px 10px;
          border-bottom: 1px solid ${colors.line};
        }

        .listeners-rank {
          font: 13px ${mono};
          color: ${colors.muted};
          font-variant-numeric: tabular-nums;
        }

        .listeners-image {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${colors.line};
          color: ${colors.black};
          font: 12px ${mono};
        }

        .listeners-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .listeners-artist-name {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .listeners-artist-name strong {
          font-size: 15px;
          letter-spacing: -0.035em;
        }

        .listeners-artist-name span,
        .listeners-act-type,
        .listeners-value span {
          font: 9px ${mono};
          letter-spacing: 0.04em;
          color: ${colors.muted};
        }

        .listeners-value {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
          text-align: right;
        }

        .listeners-value strong {
          font: 600 14px ${mono};
          font-variant-numeric: tabular-nums;
        }

        .listeners-message,
        .listeners-error {
          padding: 35px 10px;
          font: 10px/1.7 ${mono};
          color: ${colors.muted};
        }

        .listeners-error {
          color: ${colors.orange};
        }

        .listeners-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
          padding: 18px 0 70px;
          font: 9px ${mono};
          letter-spacing: 0.04em;
          color: ${colors.muted};
        }

        .listeners-bottom-band {
          min-height: 220px;
          background: ${colors.black};
          color: ${colors.cream};
          padding: 35px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 25px;
        }

        .listeners-bottom-logo {
          font-size: clamp(45px, 7vw, 85px);
          font-weight: 900;
          letter-spacing: -0.1em;
        }

        .listeners-bottom-logo sup {
          font: 12px ${mono};
          vertical-align: top;
          margin-left: 5px;
        }

        .listeners-bottom-band > div {
          font-size: clamp(22px, 3.5vw, 42px);
          line-height: 0.95;
          letter-spacing: -0.07em;
          font-weight: 850;
        }

        .listeners-bottom-band > span {
          font: 9px/1.8 ${mono};
          text-align: right;
          color: #bcb8b0;
        }

        .listeners-bottom-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
          padding: 17px 0 25px;
          font: 9px ${mono};
          color: ${colors.muted};
          letter-spacing: 0.04em;
        }

        @media (max-width: 760px) {
          .listeners-page {
            padding: 0 16px;
          }

          .listeners-page .casa-header {
            min-height: 76px;
          }

          .listeners-page .casa-header-description {
            max-width: 170px;
            font-size: 8px;
          }

          .listeners-page .casa-nav {
            gap: 20px;
          }

          .listeners-intro {
            grid-template-columns: 1fr;
            padding: 55px 0 35px;
          }

          .listeners-intro p {
            margin: 0;
          }

          .listeners-overview {
            gap: 8px;
            margin-bottom: 55px;
          }

          .listeners-stat {
            min-height: 100px;
            padding: 13px;
          }

          .listeners-stat span {
            font-size: 8px;
          }

          .listeners-heading {
            align-items: start;
          }

          .listeners-heading h2 {
            font-size: clamp(32px, 8vw, 48px);
          }

          .listeners-date {
            font-size: 8px;
          }

          .listeners-tab {
            min-height: 58px;
            padding: 10px;
            font-size: 8px;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
          }

          .listeners-controls {
            align-items: stretch;
          }

          .listeners-type-filter {
            flex: 0 0 auto;
          }

          .listeners-type-button {
            padding: 9px 10px;
            font-size: 8px;
          }

          .listeners-sort-label {
            width: 100%;
          }

          .listeners-list-header {
            display: none;
          }

          .listeners-row {
            grid-template-columns: 30px 46px minmax(0, 1fr) auto;
            gap: 10px;
            padding: 12px 3px;
          }

          .listeners-image {
            width: 44px;
            height: 44px;
          }

          .listeners-artist-name strong {
            font-size: 13px;
          }

          .listeners-artist-name span {
            font-size: 8px;
          }

          .listeners-act-type {
            display: none;
          }

          .listeners-value strong {
            font-size: 11px;
          }

          .listeners-value span {
            font-size: 8px;
          }

          .listeners-bottom-band {
            min-height: 190px;
            padding: 22px;
            flex-wrap: wrap;
          }

          .listeners-bottom-band > span {
            width: 100%;
            text-align: left;
          }
        }

        @media (max-width: 420px) {
          .listeners-overview {
            grid-template-columns: 1fr;
          }

          .listeners-stat {
            min-height: 85px;
          }

          .listeners-date {
            max-width: 105px;
          }

          .listeners-category-description {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .listeners-value strong {
            font-size: 10px;
          }
        }
      `}</style>
    </main>
  );
}