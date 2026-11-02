import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Buddy, MissionTask, Mood, Ship, ToolKind } from '../types'
import { ALTS, BAND_HEIGHT, RANDOM_ALTS, bandFor, describe, svgFor } from './art'
import { field, fuelFrom, nextTasks, shipFrom } from './readouts'

const PANE = 'astronaut'
const DEFAULT_NAME = 'Comet'
const DEFAULT_ALIEN = 'Blip'
// Long enough for a real name, short enough to fit the tag under the alien.
const ALIEN_NAME_MAX = 16
// Nothing happening for this long sends the astronaut to sleep.
const SLEEP_AFTER_MS = 5 * 60 * 1000
// How long the one-off reactions show before going back.
const HELLO_MS = 3500
const WAKE_MS = 2200
const DONE_MS = 5000
const ERR_MS = 2500
const ABORT_MS = 2500
// A tool still running after this long switches to the waiting animation.
const LONG_TOOL_MS = 20_000
// A turn that ran at least this long gets fireworks when it finishes.
const LONG_TURN_MS = 2 * 60 * 1000
const FIREWORKS = 3

const buddy = atom({ plugin: 'astronaut-buddy', key: 'buddy' } as const, {
  mood: 'idle',
  tool: 'wrist',
  o2: null,
  alt: 0,
} as Buddy)

// What the turn in flight is doing. These start over when the mod reloads,
// which is fine: they only describe the moment.
let isBusy = false
let toolsRunning = 0
let agentsRunning = 0
let thinkAlt = 0
let lastActive = 0
let wakeUntil = 0
let revert: { cancel: () => void } | undefined
let ticker: { cancel: () => void } | undefined

const TEST_RUN =
  /\b(pytest|jest|vitest|mocha|rspec|phpunit|go test|cargo test|dotnet test|(npm|pnpm|yarn|bun)( run)? test|playwright test|claude plugin test)\b/
const INSTALL =
  /\b((npm|pnpm|yarn|bun) (install|i|add)|pip3? install|uv (add|pip install)|brew install|apt(-get)? install|cargo (add|install)|gem install|go get)\b/
const BUILD =
  /\b((npm|pnpm|yarn|bun) (run )?build|tsc|cargo build|go build|make|vite build|next build|gradle|mvn|xcodebuild|docker build)\b/
const DELETE = /(^|[;&|]\s*|\s)(rm|rmdir|trash|del|unlink)\s/
const GIT_SHIP = /\bgit\s+(commit|push|merge|tag)\b/
const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg|heic|tiff?)$/i
const SENDING = /(send|reply|forward|post|draft)/i
const MESSAGING = /(mail|slack|teams|imessage|message|sms)/i

// Which animation a tool gets.
function kindOf(tool: string, input: unknown): ToolKind {
  if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(tool)) return 'laptop'
  if (tool === 'Read' && IMAGE.test(field(input, 'file_path'))) return 'photo'
  if (/^(Read|Grep|Glob|LS)$/.test(tool)) return 'mine'
  if (/^(WebSearch|WebFetch)$/.test(tool)) return 'web'
  if (/^(TodoWrite|TaskCreate|TaskUpdate|TaskList|TaskGet)$/.test(tool)) return 'list'
  if (/^(ExitPlanMode|EnterPlanMode)$/.test(tool)) return 'map'
  if (/(screenshot|snapshot|capture)/i.test(tool)) return 'photo'
  if (/(browser|chrome|navigate|computer|playwright|tabs_)/i.test(tool)) return 'rover'
  if (/memory/i.test(tool)) return 'log'
  if (MESSAGING.test(tool) && SENDING.test(tool)) return 'mail'
  if (tool.startsWith('mcp__')) return 'radio'
  if (/^(Bash|PowerShell)$/.test(tool)) {
    const command = field(input, 'command')
    if (GIT_SHIP.test(command)) return 'flag'
    if (TEST_RUN.test(command)) return 'lab'
    if (INSTALL.test(command)) return 'crate'
    if (BUILD.test(command)) return 'build'
    if (DELETE.test(command)) return 'trash'
    return 'weld'
  }
  if (/^(BashOutput|KillShell)$/.test(tool)) return 'weld'
  return 'wrist'
}

function pick(count: number, not?: number): number {
  if (count <= 1) return 0
  let n = Math.floor(Math.random() * count)
  if (n === not) n = (n + 1) % count
  return n
}

// Thinking keeps one version for the whole turn so it doesn't flicker
// between versions every time a tool finishes. The others pick fresh.
function altFor(mood: Mood): number {
  return mood === 'think' ? thinkAlt : pick(RANDOM_ALTS[mood] ?? 1)
}

// A fresh pick of the status line, made whenever the state changes.
function roll(): number {
  return Math.floor(Math.random() * 1_000_000)
}

// The astronaut in a new state, with a new line when anything shown changed
// and the same line when nothing did, so the words never flicker mid-step.
function moved(b: Buddy, mood: Mood, tool: ToolKind, alt: number | undefined): Buddy {
  const isSame = b.mood === mood && b.tool === tool && b.alt === alt
  return { ...b, mood, tool, alt, say: isSame ? b.say : roll() }
}

// What to fall back to once a reaction has played.
function settled(): Mood {
  if (!isBusy) return 'idle'
  if (agentsRunning > 0) return 'agents'
  return toolsRunning > 0 ? 'tool' : 'think'
}

async function setMood($: EngineInterface, mood: Mood, tool?: ToolKind, alt?: number) {
  revert?.cancel()
  revert = undefined
  await update($, buddy, b =>
    moved(b, mood, tool ?? b.tool, alt ?? (b.mood === mood && mood !== 'tool' ? b.alt : altFor(mood))),
  )
}

// Show a reaction for a moment, then settle back to what fits.
async function flash($: EngineInterface, mood: Mood, ms: number, alt?: number) {
  await setMood($, mood, undefined, alt)
  revert = $.clock.after(ms, () => {
    void update($, buddy, b => {
      if (b.mood !== mood) return b
      const next = settled()
      return moved(b, next, b.tool, altFor(next))
    })
  })
}

async function touch($: EngineInterface) {
  lastActive = await $.clock.now()
}

// Every 30 seconds: doze off after a long quiet spell, and while idle,
// switch to a different idle animation so it doesn't get stale.
async function tick($: EngineInterface) {
  const now = await $.clock.now()
  const current = await read($, buddy)
  const isQuiet = !isBusy && now - lastActive > SLEEP_AFTER_MS
  // Only write when something changes: every write redraws the panel and
  // restarts its animation.
  if (!isBusy) await readShip($)
  if (isQuiet && (current.mood === 'idle' || current.mood === 'done')) {
    await update($, buddy, b => moved(b, 'sleep', b.tool, pick(ALTS.sleep ?? 1)))
  } else if (current.mood === 'idle') {
    await update($, buddy, b => moved(b, 'idle', b.tool, pick(ALTS.idle ?? 1, b.alt)))
  }
}

// The gauges. Onboard memory (o2) is the share of the context window still
// free; fuel is the weekly usage limit still unused. Each write redraws the
// banner and restarts its animation, so they're written only when a whole
// point moves.
const point = (share: number | null | undefined) => (share === null || share === undefined ? null : Math.round(share * 100))

async function setGauges($: EngineInterface, percent: number | undefined, limits: readonly SessionRateLimit[]) {
  const fuel = fuelFrom(limits)
  await update($, buddy, b => {
    const o2 = typeof percent === 'number' ? Math.max(0, 1 - percent / 100) : b.o2
    const isSame =
      point(o2) === point(b.o2) && point(fuel?.left) === point(b.fuel?.left) && fuel?.resetsAt === b.fuel?.resetsAt
    return isSame ? b : { ...b, o2, fuel }
  })
}

async function readGauges($: EngineInterface) {
  const usage = await $.session.usage()
  await setGauges($, usage.context.percent, usage.rateLimits)
}

// Keeps the mission readout in step with Claude's task list after a task
// tool runs, subagents' updates included.
async function trackTasks($: EngineInterface, tool: string, e: unknown, result: unknown) {
  const current = await read($, buddy)
  const tasks = nextTasks(current.tasks ?? [], tool, e, result)
  if (tasks) await setTasks($, tasks)
}

const TASK_TOOLS = /^(TaskCreate|TaskUpdate|TaskList|TodoWrite)$/

async function setTasks($: EngineInterface, tasks: MissionTask[]) {
  await update($, buddy, b => (JSON.stringify(b.tasks ?? []) === JSON.stringify(tasks) ? b : { ...b, tasks }))
}

async function readShip($: EngineInterface) {
  let ship: Ship | null = null
  try {
    const { exitCode, stdout } = await $.process.run(['git', 'status', '--porcelain=v1', '--branch'], { timeoutMs: 5000 })
    if (exitCode === 0) ship = shipFrom(stdout)
  } catch {
    ship = null
  }
  await update($, buddy, b => (JSON.stringify(b.ship ?? null) === JSON.stringify(ship) ? b : { ...b, ship }))
}

// Tools that can change files, after which the ship status is read again.
const CHANGES_FILES = new Set<ToolKind>(['laptop', 'weld', 'flag', 'lab', 'crate', 'build', 'trash'])

export const register: Register = (on, options) => {
  const name = String(options.name ?? '').trim() || DEFAULT_NAME
  const alien = String(options.alienName ?? '').trim().slice(0, ALIEN_NAME_MAX) || DEFAULT_ALIEN

  on('session.start', async ($, e, next) => {
    // The astronaut lives in the banner above the prompt box; /astronaut
    // opens the bigger side panel for anyone who wants it.
    await $.command.register({ name: 'astronaut', description: `Open ${name} in a bigger side panel` })
    isBusy = false
    toolsRunning = 0
    agentsRunning = 0
    await touch($)
    await readGauges($).catch(() => undefined)
    await readShip($)
    await flash($, 'hello', HELLO_MS)
    ticker?.cancel()
    ticker = $.clock.every(30_000, () => {
      void tick($)
    })

    return next(e)
  })

  on('command.run', { command: 'astronaut' }, async $ => {
    await $.ui.open({ id: PANE, title: name })

    return { text: `${name} is here.` }
  })

  // A new prompt wakes a sleeping astronaut with a stretch first.
  on('prompt.submit', async ($, e, next) => {
    await touch($)
    const current = await read($, buddy)
    // A finished mission clears when the next one starts.
    const tasks = current.tasks ?? []
    if (tasks.length > 0 && tasks.every(t => t.status === 'completed')) await setTasks($, [])
    if (current.mood === 'sleep') {
      wakeUntil = lastActive + WAKE_MS
      await flash($, 'wake', WAKE_MS)
    } else {
      await setMood($, 'think')
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      isBusy = true
      toolsRunning = 0
      agentsRunning = 0
      thinkAlt = pick(RANDOM_ALTS.think ?? 1)
      await touch($)
      // Let the wake-up stretch finish; it settles into thinking by itself.
      if (lastActive >= wakeUntil) await setMood($, 'think')
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    await touch($)
    // While helper drones (subagents) are out, their own tool calls don't
    // change the animation.
    const isInsideAgent = e.agentId !== undefined && agentsRunning > 0
    const isAgent = tool === 'Agent' || tool === 'Task'
    let longTimer: { cancel: () => void } | undefined
    if (isAgent) {
      agentsRunning += 1
      await setMood($, 'agents')
    } else if (!isInsideAgent) {
      toolsRunning += 1
      if (tool === 'AskUserQuestion') {
        await setMood($, 'ask')
      } else {
        const kind = kindOf(tool, e)
        await setMood($, 'tool', kind)
        // Still going after a while: switch to checking the watch.
        longTimer = $.clock.after(LONG_TOOL_MS, () => {
          void update($, buddy, b => (b.mood === 'tool' && b.tool === kind ? moved(b, 'tool', 'long', b.alt) : b))
        })
      }
    }

    const ran = await next(e)
    longTimer?.cancel()
    if (TASK_TOOLS.test(tool) && ran.deny === undefined && ran.isError !== true) {
      await trackTasks($, tool, e, ran.result)
    }

    if (isAgent) {
      agentsRunning = Math.max(0, agentsRunning - 1)
    } else if (!isInsideAgent) {
      toolsRunning = Math.max(0, toolsRunning - 1)
    }
    await touch($)
    if (isInsideAgent) return ran
    if (!isAgent && CHANGES_FILES.has(kindOf(tool, e))) await readShip($)
    const hasFailed = ran.deny === undefined && ran.isError === true
    if (hasFailed) {
      await flash($, 'err', ERR_MS)
    } else if (isBusy && (isAgent ? agentsRunning === 0 : toolsRunning === 0)) {
      await setMood($, settled())
    }

    return ran
  }).catch(($, e, next) => next(e))

  // Live gauges: the engine measures after each response.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await setGauges($, e.context.percent, e.rateLimits)

    return result
  }).catch(($, e, next) => next(e))

  // A permission prompt actually put to you: wave for attention until the
  // call runs. This is raised only when a dialog is about to show, so in auto
  // mode the asks the classifier settles by itself don't set off the wave.
  // A question to the person already has its own animation.
  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.tool_name !== 'AskUserQuestion') await setMood($, 'wait')

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      isBusy = false
      toolsRunning = 0
      agentsRunning = 0
      await touch($)
      await readGauges($).catch(() => undefined)
      await readShip($)
      if (e.isAborted) {
        await flash($, 'abort', ABORT_MS)
      } else {
        // A long turn gets fireworks; a normal one picks a celebration.
        await flash($, 'done', DONE_MS, e.durationMs >= LONG_TURN_MS ? FIREWORKS : undefined)
      }
    }

    return next(e)
  })

  // Compacting frees up onboard memory: swap in a fresh tank while it runs.
  on('session.compact', async ($, e, next) => {
    await setMood($, 'compact')
    const result = await next(e)
    await readGauges($).catch(() => undefined)
    await setMood($, settled())

    return result
  }).catch(($, e, next) => next(e))

  // The banner above the prompt box. A survey that needs the band gets it.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const state = await read($, buddy)

    if (e.surface === 'terminal') {
      const { Text } = $.ui.resolve(e)

      return <Text dimColor>{describe(state, name, alien)}</Text>
    }
    if (e.surface !== 'desktop') return next(e)
    const { Box, Svg } = $.ui.resolve(e)

    // The box takes the band's whole width, so the drawing inside has a width
    // to fill instead of falling back to a narrow default.
    return (
      <Box flexGrow={1} width="100%">
        <Svg source={bandFor(state, name, alien)} alt={describe(state, name, alien)} height={BAND_HEIGHT} isInteractive />
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const state = await read($, buddy)

    if (e.surface === 'terminal') {
      const { Text } = $.ui.resolve(e)

      return <Text>{describe(state, name, alien)}</Text>
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={svgFor(state, name, alien)} alt={describe(state, name, alien)} isInteractive />
  })
}
