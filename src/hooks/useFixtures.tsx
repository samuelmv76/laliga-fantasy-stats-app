import { useEffect, useMemo, useState } from 'react'
import { FIXTURES as MOCK_FIXTURES } from '../data/mockFixtures.tsx'
import type { FixturesByTeam } from '../types.tsx'

// Mismo patrón que usePlayers: intenta cargar el calendario real desde
// /api/fixtures (Neon, {equipo: [{matchday, opponent, home, kickoff}]}), y
// si la API no responde usa datos de prueba.
//
// Devuelve dos vistas del mismo dato: `calendar` tal cual llega (incluye los
// partidos ya jugados de la jornada en curso, que son los que dicen cuándo
// empezó) y `fixtures`, solo lo que queda por jugar, que es lo que significa
// "próximo partido" en el mercado y en la ficha.
export function useFixtures() {
  const [calendar, setCalendar] = useState<FixturesByTeam>(MOCK_FIXTURES)

  useEffect(() => {
    let cancelled = false

    fetch('/api/fixtures')
      .then((res) => {
        if (!res.ok) throw new Error('sin /api/fixtures todavía')
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') setCalendar(data)
      })
      .catch(() => {
        // se queda con FIXTURES de prueba, no pasa nada
      })

    return () => {
      cancelled = true
    }
  }, [])

  const fixtures = useMemo(() => {
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(calendar).map(([team, list]) => [team, list.filter((f) => Date.parse(f.kickoff) > now)])
    )
  }, [calendar])

  return { fixtures, calendar }
}
