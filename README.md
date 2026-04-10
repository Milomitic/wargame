# Medieval Wargame

MMO browser game di guerra ambientato nel medioevo. Gestisci il tuo feudo, costruisci edifici, recluta truppe, conquista territori e forma alleanze con altri giocatori.

## Panoramica

Il gioco si svolge su una mappa persistente condivisa dove ogni giocatore gestisce un feudo medievale. Le risorse vengono prodotte in tempo reale dagli edifici costruiti. Le truppe possono essere inviate in marcia per attaccare campi barbari (PvE) o feudi nemici (PvP). Il sistema diplomatico permette di formare alleanze per coordinare attacchi e difese.

### Caratteristiche principali

- **Gestione feudo** con 13 tipi di edificio, ognuno con livelli e bonus di produzione
- **5 risorse** (legno, pietra, ferro, cibo, oro) con produzione in tempo reale
- **5 tipi di truppa** (militia, infantry, archer, cavalry, catapult) con stats ATK/DEF
- **Mappa mondo** 61x61 con 6 tipi di terreno generati proceduralmente
- **Combattimento PvE** contro 25 campi barbari con difficolta scalabile e loot
- **Combattimento PvP** con raid, protezione newbie 72h, anti-griefing
- **Alleanze** con inviti, ruoli (leader/officer/member), protezione alleati
- **Vista villaggio** immersiva con edifici SVG interattivi
- **Real-time** via WebSocket (13 tipi di evento)

## Stack tecnologico

| Componente | Tecnologia |
|------------|-----------|
| Server | Node.js + Fastify + Socket.io |
| Database | SQLite via @libsql/client + Drizzle ORM |
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 |
| State management | Zustand + TanStack Query |
| Real-time | Socket.io |
| Monorepo | npm workspaces + TypeScript |

## Struttura progetto

```
wargame/
├── packages/
│   ├── client/          # Frontend React
│   │   └── src/
│   │       ├── components/
│   │       │   ├── layout/    # GameShell, Sidebar, TopBar, BottomBar
│   │       │   ├── village/   # VillageScene, BuildingSprite, BuildingDetail, BuildingArt
│   │       │   └── fief/      # BuildingPanel, TroopPanel, ResourceBar
│   │       ├── pages/         # DashboardPage, WorldMapPage, ArmyPage, AlliancePage, Login, Register
│   │       ├── stores/        # authStore, eventLogStore
│   │       ├── hooks/         # useSocket
│   │       └── api/           # REST client, Socket.io client
│   ├── server/          # Backend Fastify
│   │   └── src/
│   │       ├── routes/        # auth, fief, troop, map, march, alliance
│   │       ├── services/      # building, troop, fief, march, camp, alliance, report, map
│   │       ├── game/          # loop, tick processors (building, troop, march, camp)
│   │       ├── db/            # Drizzle schema, seed, migrations
│   │       ├── auth/          # password hashing, sessions, middleware
│   │       └── ws/            # Socket.io setup
│   └── shared/          # Tipi, costanti, validazione condivisi
│       └── src/
│           ├── types/         # player, fief, building, troop, combat, map, ws-events
│           ├── constants/     # buildings, troops, resources, combat, map, config
│           └── validation/    # Zod schemas
```

## Setup sviluppo

```bash
# Installa dipendenze
npm install

# Crea database
npm run db:seed

# Avvia server (porta 3000) + client (porta 5174)
npm run dev
```

Il gioco sara accessibile su `http://localhost:5174`.

## Roadmap

| Milestone | Stato | Contenuto |
|-----------|:-----:|-----------|
| **M1** — Setup + Auth | ✅ | Monorepo, registrazione, login, sessioni cookie, feudo starter con risorse |
| **M2** — Risorse + Edifici | ✅ | 13 edifici con costi scalabili, game loop 60s, produzione delta-time, Socket.io real-time |
| **M3** — Mappa + Territori | ✅ | Griglia 61x61, 6 terreni procedurali, pan/zoom, tile interattivi |
| **M4** — Truppe + PvE | ✅ | 5 tipi truppa, reclutamento, marce, 25 campi barbari, combattimento deterministico, report |
| **M5** — PvP + Raid | ✅ | Raid feudi nemici, bonus terreno/mura/offline, newbie shield 72h, anti-griefing |
| **M6** — Diplomazia + Alleanze | ✅ | Creazione alleanze, inviti, ruoli, kick, transfer, protezione alleati |
| **M7** — Albero Tecnologico | ⬜ | Edificio Accademia, 3-4 rami ricerca, bonus sbloccabili, tab TECH |
| **M8** — Eventi + Quest + Boss | ⬜ | Ciclo stagionale, eventi mondo, fazioni NPC autonome, boss regionali, quest |
| **M9** — Classifiche + Polish + Deploy | ⬜ | Leaderboard, tutorial onboarding, Docker, GitHub Actions CI/CD, deploy |
| **M10** — Intelligence / Spionaggio | ⬜ | Scout, report nemici, controspionaggio via Watchtower |
| **M11** — Trading tra Giocatori | ⬜ | Mercato globale, scambi diretti, tasse basate su livello Market |
| **M12** — Chat Globale / Alleanza | ⬜ | Chat real-time (globale, alleanza, DM), storico messaggi |
| **M13** — Consigliere AI | ⬜ | Ollama locale (Mistral 7B), template fallback, pannello consigliere in-game |
