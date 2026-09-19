import { useId, useMemo, useState } from 'react'
import { currentPrice, todayDelta } from './data/mockPlayers.tsx'
import type { Player } from './types.tsx'
import { formatDeltaShort } from './utils/format.tsx'
import { usePlayers } from './hooks/usePlayers.tsx'
import { useFixtures } from './hooks/useFixtures.tsx'
import { matchdayLabel, nextMatchdayWindow } from './utils/matchday'
import { useSquad } from './hooks/useSquad.tsx'
import { useTheme } from './hooks/useTheme.tsx'
import { Show, SignInButton, UserButton } from '@clerk/react'
import Market from './components/Market.tsx'
import TeamView from './components/TeamView.tsx'
import Ranking from './components/Ranking.tsx'
import PlayerDetail from './components/PlayerDetail.tsx'
import './App.css'

const FOOTER_LINK =
  'flex items-center gap-1.5 rounded-[10px] border border-hairline bg-ink-soft px-3 py-[7px] font-body text-[0.8rem] font-semibold text-muted no-underline transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--text)_18%,transparent)] hover:bg-paper-dim hover:text-text'

export default function App() {
  const { players } = usePlayers()
  const { fixtures, calendar } = useFixtures()
  const { squad, squadIds, totalValue, canAdd, addPlayer, removePlayer, teamName, renameTeam } = useSquad(players)
  const { theme, toggleTheme } = useTheme()
  const TABS = [
    { id: 'mercado', label: 'Mercado' },
    { id: 'equipo', label: teamName },
    { id: 'ranking', label: 'Ranking' },
  ]
  const [tab, setTab] = useState('mercado')
  const [selected, setSelected] = useState<Player | null>(null)
  const nextMatch = useMemo(() => matchdayLabel(nextMatchdayWindow(calendar)), [calendar])
  const pulse = useMemo(() => pulseStats(players), [players])

  return (
    <div className="app">
      <header className="glass sticky top-3 z-30 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-hairline py-2 pr-2.5 pl-3 text-text shadow-card">
        <div className="flex min-w-0 items-center gap-3.5">
          <AppMark size={30} />
          <span className="font-display text-[0.95rem] font-semibold tracking-[-0.01em] text-text">
            Fantasy <span className="font-medium text-muted">Stats</span>
          </span>
          {nextMatch && (
            <span
              className="inline-flex max-w-full items-center gap-[7px] whitespace-nowrap rounded-full border border-hairline bg-ink-soft py-[5px] pr-2.5 pl-[9px] text-[0.72rem] font-semibold max-[560px]:whitespace-normal"
              title={nextMatch.title}
            >
              <span className="live-dot" />
              {nextMatch.text}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <nav className="flex gap-[3px] rounded-[13px] border border-hairline bg-ink-soft p-[3px]" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`relative cursor-pointer rounded-[9px] border-none px-4 py-2 font-body text-[0.86rem] font-semibold transition-colors duration-200 ${
                  tab === t.id ? 'bg-gold text-turf-on shadow-card' : 'bg-transparent text-muted hover:text-text'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'equipo' && squad.length > 0 && (
                  <span className="ml-1.5 tabular-nums opacity-70">{squad.length}</span>
                )}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-hairline bg-ink-soft text-text transition-colors duration-200"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </button>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="btn btn-ghost">
                Iniciar sesión
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <div className="grid items-end gap-7 px-1 pt-10 pb-[26px] max-[820px]:grid-cols-1 max-[820px]:items-start min-[821px]:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div>
          <p className="m-0 mb-2.5 flex items-center gap-2.5 font-display text-[0.73rem] font-semibold uppercase tracking-[0.09em] text-text">
            Temporada 25/26
            <span className="h-px w-[26px] bg-[linear-gradient(90deg,var(--text),transparent)]" />
            {nextMatch && (
              <span className="font-medium normal-case tracking-[0.04em] text-muted">Jornada {nextMatch.matchday}</span>
            )}
          </p>
          <h1 className="m-0 font-display text-[clamp(1.7rem,5.6vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.028em] text-balance break-words">
            Cada precio de LaLiga Fantasy,
            <br />
            <span className="text-muted">día a día.</span>
          </h1>
          <p className="mt-3 max-w-[48ch] text-[0.98rem] leading-relaxed text-pretty text-muted">
            Sigue el valor de mercado, los puntos y el próximo rival de cada jugador de LaLiga
            Fantasy. Arma tu equipo, compara rendimiento por millón y detecta subidas y bajadas
            antes de fichar.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
          {pulse.map((p) => (
            <div key={p.label} className="bg-[color-mix(in_srgb,var(--paper-solid)_90%,transparent)] px-[15px] py-3.5">
              <p className="m-0 whitespace-nowrap text-[0.7rem] uppercase tracking-[0.07em] text-muted">{p.label}</p>
              <p
                className={`mt-1.5 mb-0 font-display text-[clamp(1rem,2.2vw,1.32rem)] font-semibold tracking-[-0.025em] tabular-nums [overflow-wrap:anywhere] ${
                  p.tone === 'rise' ? 'text-rise' : p.tone === 'fall' ? 'text-fall' : ''
                }`}
              >
                {p.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <main className="block">
        {tab === 'mercado' && (
          <Market
            players={players}
            fixtures={fixtures}
            squadIds={squadIds}
            canAdd={canAdd}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            onSelect={setSelected}
          />
        )}
        {tab === 'equipo' && (
          <TeamView
            squad={squad}
            fixtures={fixtures}
            totalValue={totalValue}
            removePlayer={removePlayer}
            onSelect={setSelected}
            onAddPlayer={() => setTab('mercado')}
            teamName={teamName}
            onRenameTeam={renameTeam}
          />
        )}
        {tab === 'ranking' && <Ranking players={players} onSelect={setSelected} />}
      </main>

      <footer className="mt-12 flex flex-col gap-[18px] rounded-[18px] border border-hairline bg-[color-mix(in_srgb,var(--paper-solid)_60%,transparent)] px-6 pt-6 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppMark size={28} />
            <div>
              <p className="m-0 font-display text-[0.95rem] font-semibold tracking-[-0.01em] text-text">Fantasy Stats</p>
              <p className="mt-0.5 mb-0 text-[0.78rem] text-muted">
                Valor de mercado, puntos y calendario de LaLiga Fantasy · Temporada 25/26
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="https://www.linkedin.com/in/samuel-martos-7953803ab/"
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
              aria-label="Perfil de LinkedIn de Samuel Martos"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56z" />
              </svg>
              LinkedIn
            </a>
            <a
              href="https://github.com/samuelmv76/laliga-fantasy-stats"
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
              aria-label="Repositorio del proyecto en GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.5 0-.24-.01-1.04-.01-1.89-2.78.61-3.37-1.2-3.37-1.2-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.28 9.28 0 0 1 5 0c1.9-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.6.69.5A10.03 10.03 0 0 0 22 12.2C22 6.58 17.52 2 12 2z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
        <div className="h-px bg-[color-mix(in_srgb,var(--text)_8%,transparent)]" />
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1.5 text-[0.78rem] text-muted [&>p]:m-0 [&>p]:max-w-[46ch]">
          <p>Valores de mercado y puntuaciones actualizados cada noche.</p>
          <p className="text-muted">
            Proyecto personal, no oficial ni afiliado a LaLiga. El equipo y el seguimiento se guardan en este
            navegador. © {new Date().getFullYear()} Samuel Martos
          </p>
        </div>
      </footer>

      <PlayerDetail
        player={selected}
        fixtures={fixtures}
        inSquad={selected ? squadIds.includes(selected.id) : false}
        onAdd={(p) => {
          addPlayer(p)
        }}
        onRemove={(id) => {
          removePlayer(id)
        }}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

// Próxima jornada = la más baja del calendario, con el primer partido que se juega.
function pulseStats(players: Player[]) {
  // /api/players es dato externo: sin histórico de precios no hay variación que resumir.
  const valid = players.filter(
    (p) => Array.isArray(p?.priceHistory) && p.priceHistory.length > 0 && currentPrice(p) > 0
  )
  if (valid.length === 0) return []
  const deltas = valid.map((p) => ({ player: p, delta: todayDelta(p) }))
  const up = deltas.filter((d) => d.delta > 0).length
  const down = deltas.filter((d) => d.delta < 0).length
  const avgPct =
    deltas.reduce((sum, d) => sum + d.delta / currentPrice(d.player), 0) / deltas.length * 100
  const best = deltas.reduce((a, b) => (b.delta > a.delta ? b : a))
  return [
    { label: 'Al alza hoy', value: `↑ ${up}`, tone: 'rise' },
    { label: 'A la baja', value: `↓ ${down}`, tone: 'fall' },
    {
      label: 'Variación media',
      value: `${avgPct >= 0 ? '↑' : '↓'} ${Math.abs(avgPct).toFixed(2).replace('.', ',')}%`,
      tone: avgPct >= 0 ? 'rise' : 'fall',
    },
    { label: 'Mayor subida', value: `${best.player.name} · ${formatDeltaShort(best.delta)}` },
  ]
}

function AppMark({ size = 32 }) {
  const uid = useId().replace(/:/g, '')
  const tile = `tile-${uid}`
  const blade = `blade-${uid}`
  const shard = `shard-${uid}`
  const rim = `rim-${uid}`
  return (
    <svg className="block shrink-0 rounded-[23.4%] drop-shadow-[0_4px_10px_#00000066]" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#232326" />
          <stop offset="1" stopColor="#0a0a0b" />
        </linearGradient>
        <linearGradient id={blade} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4a4a4f" />
          <stop offset="0.5" stopColor="#f5f5f7" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={shard} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000018" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${tile})`} />
      <path d="M8 56 26 38 26 56Z" fill={`url(#${shard})`} />
      <path d="M11 48 31 28 31 44 53 22" fill="none" stroke={`url(#${blade})`} strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M44 14h12v12" fill="none" stroke="#f5f5f7" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.4" fill="none" stroke={`url(#${rim})`} strokeWidth="1.5" />
    </svg>
  )
}
