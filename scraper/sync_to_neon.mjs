// Sube los ficheros canónicos del scraper (data/jugadores.json,
// data/calendario.json) a Neon, para que el front los sirva vía
// /api/players y /api/fixtures en vez de JSON estático.
//
// jugadores.json/calendario.json siguen generándose igual (merge_history.py
// / build_calendar.py) y siguen siendo la fuente de verdad local; este
// script solo los publica en la base de datos.
//
// Uso:
//   DATABASE_URL=postgres://... node sync_to_neon.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error('[error] falta DATABASE_URL en el entorno.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(__dirname, relativePath), 'utf-8'))
}

async function syncPlayers(players) {
  // Estado deportivo y estadísticas reales (scrape_status.py / scrape_stats.py).
  // Se añaden aquí por si la tabla es anterior a estos scrapers.
  await sql`ALTER TABLE players
    ADD COLUMN IF NOT EXISTS status text,
    ADD COLUMN IF NOT EXISTS status_note text,
    ADD COLUMN IF NOT EXISTS status_until text,
    ADD COLUMN IF NOT EXISTS play_probability int,
    ADD COLUMN IF NOT EXISTS played int,
    ADD COLUMN IF NOT EXISTS played5 int,
    ADD COLUMN IF NOT EXISTS stats jsonb`
  await sql`
    INSERT INTO players (id, name, team, pos, points, status, status_note, status_until, play_probability, played, played5, stats, updated_at)
    SELECT * FROM UNNEST(
      ${players.map((p) => p.id)}::text[],
      ${players.map((p) => p.name)}::text[],
      ${players.map((p) => p.team)}::text[],
      ${players.map((p) => p.pos)}::text[],
      ${players.map((p) => p.points)}::int[],
      ${players.map((p) => p.status ?? null)}::text[],
      ${players.map((p) => p.statusNote ?? null)}::text[],
      ${players.map((p) => p.statusUntil ?? null)}::text[],
      ${players.map((p) => p.playProbability ?? null)}::int[],
      ${players.map((p) => p.played ?? null)}::int[],
      ${players.map((p) => p.played5 ?? null)}::int[],
      ${players.map((p) => (p.stats ? JSON.stringify(p.stats) : null))}::jsonb[],
      ${players.map(() => new Date().toISOString())}::timestamptz[]
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      team = EXCLUDED.team,
      pos = EXCLUDED.pos,
      points = EXCLUDED.points,
      status = EXCLUDED.status,
      status_note = EXCLUDED.status_note,
      status_until = EXCLUDED.status_until,
      play_probability = EXCLUDED.play_probability,
      played = EXCLUDED.played,
      played5 = EXCLUDED.played5,
      stats = EXCLUDED.stats,
      updated_at = EXCLUDED.updated_at
  `
  console.log(`[ok] players: ${players.length} filas sincronizadas.`)
}

async function syncPriceHistory(players) {
  const ids = [],
    dates = [],
    prices = []
  for (const p of players) {
    for (const h of p.priceHistory || []) {
      ids.push(p.id)
      dates.push(h.date)
      prices.push(h.price)
    }
  }
  if (ids.length === 0) return
  await sql`
    INSERT INTO player_price_history (player_id, price_date, price)
    SELECT * FROM UNNEST(${ids}::text[], ${dates}::date[], ${prices}::numeric[])
    ON CONFLICT (player_id, price_date) DO UPDATE SET price = EXCLUDED.price
  `
  console.log(`[ok] player_price_history: ${ids.length} filas sincronizadas.`)
}

async function syncPointsHistory(players) {
  const ids = [],
    dates = [],
    points = []
  for (const p of players) {
    for (const h of p.pointsHistory || []) {
      ids.push(p.id)
      dates.push(h.date)
      points.push(h.points)
    }
  }
  if (ids.length === 0) return
  await sql`
    INSERT INTO player_points_history (player_id, points_date, points)
    SELECT * FROM UNNEST(${ids}::text[], ${dates}::date[], ${points}::int[])
    ON CONFLICT (player_id, points_date) DO UPDATE SET points = EXCLUDED.points
  `
  console.log(`[ok] player_points_history: ${ids.length} filas sincronizadas.`)
}

async function syncMatchdayPoints(players) {
  const ids = [],
    matchdays = [],
    points = []
  for (const p of players) {
    for (const md of p.pointsByMatchday || []) {
      ids.push(p.id)
      matchdays.push(md.matchday)
      points.push(md.points)
    }
  }
  if (ids.length === 0) return
  await sql`
    INSERT INTO player_matchday_points (player_id, matchday, points)
    SELECT * FROM UNNEST(${ids}::text[], ${matchdays}::int[], ${points}::int[])
    ON CONFLICT (player_id, matchday) DO UPDATE SET points = EXCLUDED.points
  `
  console.log(`[ok] player_matchday_points: ${ids.length} filas sincronizadas.`)
}

async function syncFixtures(calendario) {
  const teams = [],
    matchdays = [],
    opponents = [],
    homes = [],
    kickoffs = [],
    oddsHome = [],
    oddsDraw = [],
    oddsAway = []
  for (const [team, fixtures] of Object.entries(calendario)) {
    for (const f of fixtures) {
      teams.push(team)
      matchdays.push(f.matchday)
      opponents.push(f.opponent)
      homes.push(f.home)
      kickoffs.push(f.kickoff)
      oddsHome.push(f.odds?.home ?? null)
      oddsDraw.push(f.odds?.draw ?? null)
      oddsAway.push(f.odds?.away ?? null)
    }
  }

  // Cuotas 1X2 del partido (football-data.co.uk). Nulas si aún no se publican.
  await sql`ALTER TABLE team_fixtures
    ADD COLUMN IF NOT EXISTS odds_home numeric,
    ADD COLUMN IF NOT EXISTS odds_draw numeric,
    ADD COLUMN IF NOT EXISTS odds_away numeric`
  // El scraper solo trae partidos por jugar, así que se sustituyen esos y se
  // dejan los ya jugados: son los que dicen cuándo empezó la jornada en curso
  // (si se borraran, el front solo vería lo que queda de ella).
  await sql.transaction([
    sql`DELETE FROM team_fixtures WHERE kickoff > now()`,
    ...(teams.length > 0
      ? [
          sql`
            INSERT INTO team_fixtures (team, matchday, opponent, home, kickoff, odds_home, odds_draw, odds_away)
            SELECT * FROM UNNEST(
              ${teams}::text[],
              ${matchdays}::int[],
              ${opponents}::text[],
              ${homes}::boolean[],
              ${kickoffs}::timestamptz[],
              ${oddsHome}::numeric[],
              ${oddsDraw}::numeric[],
              ${oddsAway}::numeric[]
            )
          `,
        ]
      : []),
  ])
  console.log(`[ok] team_fixtures: ${teams.length} filas sincronizadas.`)
}

async function main() {
  const players = readJson('data/jugadores.json')
  const calendario = readJson('data/calendario.json')

  await syncPlayers(players)
  await syncPriceHistory(players)
  await syncPointsHistory(players)
  await syncMatchdayPoints(players)
  await syncFixtures(calendario)
}

main().catch((error) => {
  console.error('[error] sync_to_neon falló:', error)
  process.exit(1)
})
