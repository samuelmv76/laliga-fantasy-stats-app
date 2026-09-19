// Cuándo empieza y cuándo acaba la jornada que viene, a partir del
// calendario de /api/fixtures.
import { formatDay } from './format.tsx'
import type { FixturesByTeam } from '../types.tsx'

// Horas de partido agrupadas por jornada. El calendario guarda cada partido
// dos veces (una por equipo), pero aquí solo importan el primero y el último,
// así que da igual que vengan repetidas.
function entriesByMatchday(fixtures?: FixturesByTeam): Record<number, Date[]> {
  const byMatchday: Record<number, Date[]> = {}
  for (const fixture of Object.values(fixtures ?? {}).flat()) {
    // Dato externo: solo cuentan los partidos con jornada y hora válidas.
    if (!Number.isFinite(fixture?.matchday) || Number.isNaN(Date.parse(fixture?.kickoff))) continue
    ;(byMatchday[fixture.matchday] ??= []).push(new Date(fixture.kickoff))
  }
  return byMatchday
}

// { matchday, start, end, started, next } de la jornada en curso o la que
// viene, o null si no hay calendario. `started` es true cuando la jornada ya ha
// empezado, para decir "en juego hasta" en vez de "empieza". `next` es
// { matchday, start } de la jornada siguiente, para poder decir cuándo arranca
// la próxima mientras se juega esta.
export interface MatchdayWindow {
  matchday: number
  start: Date
  end: Date
  started: boolean
  next: { matchday: number; start: Date } | null
}

export function nextMatchdayWindow(fixtures?: FixturesByTeam, now: Date = new Date()): MatchdayWindow | null {
  const byMatchday = entriesByMatchday(fixtures)

  // La jornada en curso es la del siguiente partido por jugar, no la del
  // número más bajo: un aplazamiento deja partidos de una jornada anterior
  // con fecha muy posterior (la J6 jugándose en octubre), y quedarse con el
  // número más bajo daba esas fechas como las de la próxima jornada.
  const pendientes = Object.entries(byMatchday)
    .map(([matchday, kickoffs]) => {
      const orden = kickoffs.sort((a, b) => a.getTime() - b.getTime())
      return { matchday: Number(matchday), kickoffs: orden, next: orden.find((k) => k >= now) }
    })
    .filter((jornada) => jornada.next !== undefined)
    .sort((a, b) => a.next!.getTime() - b.next!.getTime())

  const [jornada, siguiente] = pendientes
  if (!jornada) return null

  return {
    matchday: jornada.matchday,
    start: jornada.kickoffs[0],
    end: jornada.kickoffs[jornada.kickoffs.length - 1],
    started: jornada.kickoffs[0] <= now,
    next: siguiente ? { matchday: siguiente.matchday, start: siguiente.kickoffs[0] } : null,
  }
}

// "vie 18/09 21:00". La fecha va siempre, aunque el partido sea mañana: con
// el día de la semana solo no se sabe de qué mes se habla, y entre jornadas
// puede haber tres semanas de parón.
export function formatKickoff(date: Date): string {
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${weekday} ${formatDay(date)} ${time}`
}

// "sáb 10/10": el día sin la hora. Es lo que cabe en la etiqueta corta del
// móvil, donde la jornada siguiente solo tiene que orientar, no dar la hora.
export function formatKickoffDay(date: Date): string {
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
  return `${weekday} ${formatDay(date)}`
}

// Texto de la píldora de la cabecera y su tooltip. `short` y `nextText` son la
// versión de una sola línea para la barra del móvil: el texto largo mete dos
// jornadas y cuatro fechas en 390 px y envuelve a tres líneas.
export function matchdayLabel(window: MatchdayWindow | null) {
  if (!window) return null
  const { matchday } = window
  const start = formatKickoff(window.start)
  const end = formatKickoff(window.end)

  if (window.started) {
    // Mientras se juega esta jornada, lo útil es cuándo arranca la siguiente:
    // es la hora a la que hay que tener el equipo hecho.
    const next = window.next && {
      matchday: window.next.matchday,
      start: formatKickoff(window.next.start),
    }
    const despues = next ? ` · J${next.matchday} empieza ${next.start}` : ''
    return {
      matchday,
      text: `J${matchday} · en juego hasta ${end}${despues}`,
      short: `J${matchday} en juego · hasta ${end}`,
      nextText: window.next ? `J${window.next.matchday} · ${formatKickoffDay(window.next.start)}` : null,
      title:
        `Jornada ${matchday} en juego: empezó ${start}, último partido ${end}.` +
        (next ? ` La jornada ${next.matchday} empieza ${next.start}.` : ''),
    }
  }

  // El calendario puede traer un único horario para toda la jornada (aún sin
  // confirmar): entonces no hay rango que enseñar.
  if (start === end) {
    return {
      matchday,
      text: `J${matchday} · ${start}`,
      short: `J${matchday} · ${start}`,
      nextText: null,
      title: `Jornada ${matchday}: ${start}.`,
    }
  }
  return {
    matchday,
    text: `J${matchday} · del ${start} al ${end}`,
    short: `J${matchday} · desde ${start}`,
    nextText: null,
    title: `Jornada ${matchday}: primer partido ${start}, último partido ${end}.`,
  }
}
