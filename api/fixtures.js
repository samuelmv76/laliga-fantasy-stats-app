import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// Misma forma que el antiguo public/calendario.json: un objeto por equipo
// con sus próximos partidos, más los ya jugados de la jornada en curso: sin
// ellos el front no puede saber a qué hora empezó esa jornada.
export default async function handler(req, res) {
  try {
    // Las columnas de cuotas las crea sync_to_neon.mjs; si la base aún no las
    // tiene, se sirve el calendario sin ellas en vez de romper el endpoint.
    let rows
    try {
      rows = await sql`
        SELECT team, matchday, opponent, home, kickoff, odds_home, odds_draw, odds_away
        FROM team_fixtures
        WHERE kickoff > now()
          OR matchday = (SELECT matchday FROM team_fixtures WHERE kickoff > now() ORDER BY kickoff LIMIT 1)
        ORDER BY team, kickoff
      `
    } catch {
      rows = await sql`
        SELECT team, matchday, opponent, home, kickoff
        FROM team_fixtures
        WHERE kickoff > now()
          OR matchday = (SELECT matchday FROM team_fixtures WHERE kickoff > now() ORDER BY kickoff LIMIT 1)
        ORDER BY team, kickoff
      `
    }

    const byTeam = {}
    for (const { team, odds_home, odds_draw, odds_away, ...fixture } of rows) {
      if (odds_home != null && odds_draw != null && odds_away != null) {
        fixture.odds = { home: Number(odds_home), draw: Number(odds_draw), away: Number(odds_away) }
      }
      ;(byTeam[team] ??= []).push(fixture)
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')
    res.status(200).json(byTeam)
  } catch (error) {
    console.error('Error en /api/fixtures:', error)
    res.status(500).json({ error: 'error-servidor' })
  }
}
