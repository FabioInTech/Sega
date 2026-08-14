# Retro Hot Rod

An original top-down arcade racer inspired by the pacing, camera behavior,
and fuel-pressure mechanics of late-1980s arcade racers — built from
scratch with original code, art, audio, and track layouts (see
[`docs/research.md`](docs/research.md) for the design research this project
draws on).

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL in a browser. Everything runs client-side; no
backend is required.

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run typecheck  # TypeScript check only
```

## Controls

- **Arrow Up / W** — accelerate
- **Arrow Down / S** — brake
- **Arrow Left / A** — steer left
- **Arrow Right / D** — steer right
- **Space** — start / confirm

A connected gamepad (left stick to steer, right trigger/A to accelerate,
left trigger/B to brake, A to confirm) also works.

## Gameplay

- Race down a point-to-point track against 3 AI cars. The camera scrolls to
  keep the current race **leader** in view — fall too far behind and you'll
  be caught up automatically, at the cost of fuel.
- Fuel drains continuously; collect flashing pickups on the track to
  refill it. Hit zero and the run ends.
- Finish a race to earn credits based on your position and remaining fuel,
  then spend them in the Parts Shop on engine, top speed, tires, and bumper
  upgrades before the next race.
- Five original tracks: city, highway, countryside, desert, and snow.

## Project layout

```
src/
  main.ts          Phaser game bootstrap
  scenes/          Boot, Menu, Race, Results, Shop, GameOver
  vehicles/        Shared car physics + player/AI driving logic
  tracks/          Track configuration (procedurally built per race)
  systems/         Physics-adjacent systems: fuel, camera, collisions,
                   input, audio, upgrades, save data, track generation
  ui/              HUD
```

All art and audio are generated procedurally in code (see
`src/systems/TextureFactory.ts` and `src/systems/AudioSystem.ts`) — there
are no external asset files.
