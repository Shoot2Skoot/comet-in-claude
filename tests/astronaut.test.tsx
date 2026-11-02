import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { THINK_LINES, lineFor, linesFor } from '../hooks/lines'
import { fuelFrom, shipFrom } from '../hooks/readouts'
import type { Mood, ToolKind } from '../types'

const PANE = {
  plugin: 'astronaut-buddy',
  component: 'Pane',
  requestId: 'astronaut',
  props: {
    title: 'Comet',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const BAND = {
  plugin: 'astronaut-buddy',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

// The engine beneath the mod: each hook here answers as a session would.
// `percent` is how much of the context window is in use.
// `limits` are the account's usage windows, as the engine reports them.
function world(on: On, percent = 30, limits: unknown[] = []) {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'astronaut' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, tokens: percent * 2000, percent }, rateLimits: limits },
  }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('prompt.submit', (_, e) => ({ text: e.text }) as never)
  // No settings hook beneath: a permission prompt passes with no decision.
  on('classic.PermissionRequest', () => ({}))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  return clock
}

async function begin($: Engine) {
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)
  await $.turn.start({ text: 'fix the bug', turnId: 't1' } as never)
}

async function scene($: Engine): Promise<string> {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()

  return String(svg?.props.source ?? '')
}

test('each kind of tool gets its own animation, then back to thinking', async ($, on) => {
  world(on)
  const cases = [
    ['Edit', { file_path: '/a.ts', old_string: 'a', new_string: 'b' }, 'st-tool v-laptop'],
    ['Bash', { command: 'ls -la' }, 'st-tool v-weld'],
    ['Bash', { command: 'git commit -m "fix"' }, 'st-tool v-flag'],
    ['Bash', { command: 'npm run test' }, 'st-tool v-lab'],
    ['Bash', { command: 'pnpm add zod' }, 'st-tool v-crate'],
    ['Read', { file_path: '/a.ts' }, 'st-tool v-mine'],
    ['WebSearch', { query: 'comets' }, 'st-tool v-web'],
    ['mcp__gmail__search', { query: 'news' }, 'st-tool v-radio'],
    ['TodoWrite', { todos: [] }, 'st-tool v-list'],
    ['WebFetch', { url: 'https://example.com', prompt: 'summary' }, 'st-tool v-web'],
    ['Skill', { skill: 'pdf' }, 'st-tool v-wrist'],
    ['ToolSearch', { query: 'select:x' }, 'st-tool v-wrist'],
    ['Bash', { command: 'npm run build' }, 'st-tool v-build'],
    ['Bash', { command: 'rm -rf dist' }, 'st-tool v-trash'],
    ['Read', { file_path: '/shots/home.png' }, 'st-tool v-photo'],
    ['ExitPlanMode', { plan: 'do it' }, 'st-tool v-map'],
    ['mcp__claude-in-chrome__navigate', { url: 'https://example.com' }, 'st-tool v-rover'],
    ['mcp__claude-in-chrome__computer', { action: 'screenshot' }, 'st-tool v-rover'],
    ['mcp__browser__take_screenshot', {}, 'st-tool v-photo'],
    ['mcp__memory__memory_write', { path: '/a.md' }, 'st-tool v-log'],
    ['mcp__Gmail__send_message', { to: 'a@b.c' }, 'st-tool v-mail'],
    ['AskUserQuestion', { questions: [] }, 'st-ask'],
  ] as const
  // Each call waits at the bottom until the test has looked at the panel.
  let release = () => {}
  let entered = () => {}
  let gate = Promise.resolve()
  on('tool.call', async () => {
    entered()
    await gate

    return { result: {} } as never
  })
  await begin($)
  for (const [tool, args, cls] of cases) {
    gate = new Promise<void>(r => (release = r))
    const inside = new Promise<void>(r => (entered = r))
    const call = $.tool.call({ tool, ...args } as never)
    await inside
    expect(await scene($)).toContain(`class="${cls}`)
    release()
    await call
    expect(await scene($)).toContain('class="st-think')
  }
})

test('helper drones stay out while a subagent works', async ($, on) => {
  world(on)
  let release = () => {}
  let entered = () => {}
  const gate = new Promise<void>(r => (release = r))
  const inside = new Promise<void>(r => (entered = r))
  on('tool.call', async (_, e) => {
    if (String(e.tool) === 'Agent') {
      entered()
      await gate
    }

    return { result: {} } as never
  })
  await begin($)
  const agent = $.tool.call({ tool: 'Agent', description: 'look around', prompt: 'look' } as never)
  await inside
  expect(await scene($)).toContain('class="st-agents')
  // The subagent's own tool call leaves the drones up.
  await $.tool.call({ tool: 'Read', file_path: '/a.ts', agentId: 'a1' } as never)
  expect(await scene($)).toContain('class="st-agents')
  release()
  await agent
  expect(await scene($)).toContain('class="st-think')
})

test('a failed command flinches, then goes back to thinking', async ($, on) => {
  const clock = world(on)
  on('tool.call', { tool: 'Bash' } as never, () => ({ result: {}, isError: true }) as never)
  await begin($)
  await $.tool.call({ tool: 'Bash', command: 'false' } as never)
  expect(await scene($)).toContain('class="st-err')
  await clock.advance(3000)
  expect(await scene($)).toContain('class="st-think')
})

test('arrives, celebrates a finished turn, idles, then naps', async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)
  expect(await scene($)).toContain('class="st-hello')
  await clock.advance(4000)
  expect(await scene($)).toContain('class="st-idle')
  await $.turn.start({ text: 'fix the bug', turnId: 't1' } as never)
  await $.turn.complete({ answer: 'done', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  const done = await scene($)
  expect(done).toContain('class="st-done')
  // 30% of the context used leaves 70% of the tank: 0.7 of the 16-wide bar.
  expect(done).toContain('width="11.2"')
  await clock.advance(6000)
  expect(await scene($)).toContain('class="st-idle')
  await clock.advance(6 * 60 * 1000)
  expect(await scene($)).toContain('class="st-sleep')
})

test('a stopped turn gets a shrug', async ($, on) => {
  world(on)
  await begin($)
  await $.turn.complete({ answer: '', durationMs: 10, isAborted: true, turnId: 't1', reason: 'aborted' } as never)
  expect(await scene($)).toContain('class="st-abort')
})

test('compacting swaps in a fresh tank', async ($, on) => {
  world(on)
  let release = () => {}
  let entered = () => {}
  const gate = new Promise<void>(r => (release = r))
  const inside = new Promise<void>(r => (entered = r))
  on('session.compact', async (_, e) => {
    entered()
    await gate

    return { messages: e.messages } as never
  })
  await begin($)
  const compacting = $.session.compact({
    trigger: 'manual',
    messages: [{ role: 'user', text: 'hello', toolUses: [] }],
  } as never)
  await inside
  expect(await scene($)).toContain('class="st-compact')
  release()
  await compacting
  expect(await scene($)).toContain('class="st-think')
})

test('low oxygen turns the antenna light red', async ($, on) => {
  const clock = world(on, 90)
  await begin($)
  await $.turn.complete({ answer: 'done', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  await clock.advance(6000)
  expect(await scene($)).toMatch(/class="st-idle v-\w+ a-\d low"/)
})

test('the text-only view uses the default name', async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  await clock.advance(4000)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toMatch(/^Comet .+ · memory 70% free$/)
  await ui.unmount()
})

test('the name option renames the astronaut', { options: { name: 'Pip' } }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  await clock.advance(4000)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toMatch(/^Pip .+ · memory 70% free$/)
  await ui.unmount()
})

// Settles on the alien pal. Which idle version plays is random, so start the
// session again until it lands there (1 in 7 each time).
async function patting($: Engine, clock: ReturnType<typeof mock.clock>, surface: 'terminal' | 'desktop') {
  for (let tries = 0; tries < 100; tries++) {
    await $.session.start({ cwd: '/', surface, isInteractive: true } as never)
    await clock.advance(4000)
    if (/class="st-idle v-\w+ a-4/.test(await scene($))) return
  }
  throw new Error('idle never settled on the alien pal')
}

test('the alien pal is called Blip unless renamed', async ($, on) => {
  const clock = world(on)
  await patting($, clock, 'terminal')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const line = /^Comet (.+?) · memory/.exec((await ui.find({ type: 'Text' }))?.text ?? '')?.[1]
  expect(linesFor('idle', 'wrist', 4, 'Blip')).toContain(line)
  expect(line).toContain('Blip')
  await ui.unmount()
  expect(await scene($)).toContain('>Blip</text>')
})

test('the alienName option renames the alien, on its tag too', { options: { alienName: 'Zorbelina the Magnificent' } }, async ($, on) => {
  const clock = world(on)
  await patting($, clock, 'desktop')
  const svg = await scene($)
  expect(svg).toContain('class="st-idle v-wrist a-4')
  // Cut to 16 characters so it fits the tag.
  expect(svg).toContain('>Zorbelina the Ma</text>')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const line = /^Comet (.+?) · memory/.exec((await ui.find({ type: 'Text' }))?.text ?? '')?.[1] ?? ''
  expect(line).toContain('Zorbelina the Ma')
  expect(line).not.toContain('Zorbelina the Magnificent')
  await ui.unmount()
})

test('the banner above the prompt shows the astronaut and what it is doing', async ($, on) => {
  world(on, 38)
  await begin($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const box = await ui.find({ type: 'Box' })
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()
  // A full-width box around it, and drawn as an image, so it takes that width.
  expect(box?.props.width).toBe('100%')
  expect(svg?.props.isInteractive).toBeUndefined()
  expect(svg?.props.height).toBe(88)
  const source = String(svg?.props.source ?? '')
  expect(source).toContain('class="st-think')
  expect(THINK_LINES as readonly string[]).toContain(/<\/tspan> ([^<]+)<\/text>/.exec(source)?.[1])
  expect(source).toContain('62% free')
  const text = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const said = /^Comet (.+) · memory 62% free$/.exec((await text.find({ type: 'Text' }))?.text ?? '')?.[1]
  expect(THINK_LINES as readonly string[]).toContain(said)
  await text.unmount()
})

test('a survey gets the band to itself', async ($, on) => {
  world(on)
  // The engine's own band beneath the mod: here it draws nothing.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  await begin($)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})

test('a permission prompt put to you gets the frantic wave', async ($, on) => {
  world(on)
  await begin($)
  expect(await scene($)).toContain('class="st-think')
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
  expect(await scene($)).toContain('class="st-wait')
})

test('a question to you is not a permission prompt', async ($, on) => {
  world(on)
  await begin($)
  await $.classic.PermissionRequest({ tool_name: 'AskUserQuestion', tool_input: {} } as never)
  expect(await scene($)).not.toContain('class="st-wait')
})

test('every state has its own pool of lines, written plainly', () => {
  const moods: Mood[] = ['hello', 'wake', 'think', 'agents', 'ask', 'wait', 'compact', 'done', 'abort', 'err', 'sleep']
  const tools: ToolKind[] = ['wrist', 'laptop', 'weld', 'mine', 'web', 'radio', 'list', 'flag', 'lab', 'crate', 'build', 'trash', 'map', 'photo', 'rover', 'log', 'mail', 'long']
  const pools = [
    ...moods.map(m => linesFor(m, 'wrist', 0, 'Blip')),
    ...tools.map(t => linesFor('tool', t, 0, 'Blip')),
    ...[0, 1, 2, 3, 4, 5, 6].map(alt => linesFor('idle', 'wrist', alt, 'Blip')),
  ]
  for (const pool of pools) {
    expect(pool.length).toBeGreaterThanOrEqual(4)
    expect(new Set(pool).size).toBe(pool.length)
    for (const line of pool) expect(line).not.toMatch(/[\u2018\u2019\u201C\u201D\u2014]/)
  }
  expect(THINK_LINES.length).toBeGreaterThanOrEqual(50)
  // The alien pal's lines all name it.
  for (const line of linesFor('idle', 'wrist', 4, 'Zib')) expect(line).toContain('Zib')
  // The roll picks the line, so the same roll shows the same words.
  expect(lineFor('tool', 'weld', 0, 3, 'Blip')).toBe(lineFor('tool', 'weld', 0, 3, 'Blip'))
})

test('the words change from one step to the next', async ($, on) => {
  world(on)
  on('tool.call', () => ({ result: {} }) as never)
  await begin($)
  const seen = new Set<string>()
  for (let i = 0; i < 12; i++) {
    await $.tool.call({ tool: 'Bash', command: 'make' } as never)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    seen.add(String((await ui.find({ type: 'Text' }))?.text))
    await ui.unmount()
  }
  // Back to thinking after each command, with a new line most times.
  expect(seen.size).toBeGreaterThan(3)
})

// What the terminal's one-line readout says right now.
async function readout($: Engine): Promise<string> {
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const text = String((await ui.find({ type: 'Text' }))?.text ?? '')
  await ui.unmount()

  return text
}

async function banner($: Engine): Promise<string> {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()

  return String(svg?.props.source ?? '')
}

test('fuel is the weekly limit still unused, with when it refuels', async ($, on) => {
  world(on, 30, [
    { kind: 'five_hour', percentUsed: 80, resetsAt: '2026-11-02T03:00:00Z' },
    { kind: 'seven_day', percentUsed: 42, resetsAt: '2026-11-05T21:00:00Z' },
  ])
  await begin($)
  expect(await readout($)).toContain('fuel 58%')
  const source = await banner($)
  expect(source).toContain('>Fuel</text>')
  expect(source).toContain('58%<tspan')
  expect(source).toContain('refuels ')
  // A weekly window under a longer name still counts; the five-hour one isn't shown.
  expect(fuelFrom([{ kind: 'seven_day_opus', percentUsed: 10 }])?.left).toBe(0.9)
  expect(await readout($)).not.toContain('20%')
  expect(fuelFrom([{ kind: 'five_hour', percentUsed: 80 }])).toBeNull()
})

test('/astronaut says which usage windows the app reports', async ($, on) => {
  world(on, 30, [{ kind: 'seven_day', percentUsed: 42 }])
  await begin($)
  const answer = await $.command.run({ command: 'astronaut', args: '', origin: { kind: 'composer' } } as never)
  expect(JSON.stringify(answer)).toContain('seven_day 42% used')
})

test('without a weekly limit there is no fuel gauge', async ($, on) => {
  world(on)
  await begin($)
  expect(await readout($)).not.toContain('fuel')
  expect(await banner($)).not.toContain('>Fuel</text>')
})

test('onboard memory follows the context window as it fills', async ($, on) => {
  world(on, 30)
  await begin($)
  expect(await readout($)).toContain('memory 70% free')
  await $.session.measure({ context: { window: 200000, tokens: 100000, percent: 50 }, rateLimits: [], changed: ['context'] } as never)
  expect(await readout($)).toContain('memory 50% free')
})

test('the mission shows the task under way and how many are done', async ($, on) => {
  world(on)
  let id = 0
  on('tool.call', (_, e) => {
    const call = e as unknown as Record<string, string>
    if (call.tool === 'TaskCreate') return { result: { task: { id: String(++id), subject: call.subject } } } as never

    return { result: { success: true, taskId: call.taskId, updatedFields: ['status'] } } as never
  })
  await begin($)
  for (const subject of ['Read the routine screen', 'Add the streak counter', 'Run the tests']) {
    await $.tool.call({ tool: 'TaskCreate', subject, description: subject } as never)
  }
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' } as never)
  await $.tool.call({ tool: 'TaskUpdate', taskId: '2', status: 'in_progress', activeForm: 'Adding the streak counter' } as never)
  expect(await banner($)).toContain('1/3: Adding the streak counter')
  expect(await readout($)).toContain('mission 1/3')
  // A deleted task leaves the count.
  await $.tool.call({ tool: 'TaskUpdate', taskId: '3', status: 'deleted' } as never)
  expect(await readout($)).toContain('mission 1/2')
  // Done with all of it: complete, then cleared when the next prompt comes.
  await $.tool.call({ tool: 'TaskUpdate', taskId: '2', status: 'completed' } as never)
  expect(await banner($)).toContain('2/2: complete')
  await $.turn.complete({ turnId: 't1', answer: 'done', isAborted: false, durationMs: 1000 } as never)
  await $.prompt.submit({ text: 'next thing' } as never)
  expect(await readout($)).not.toContain('mission')
})

test('a todo list counts as the mission too', async ($, on) => {
  world(on)
  on('tool.call', () => ({ result: {} }) as never)
  await begin($)
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'Plan', status: 'completed', activeForm: 'Planning' },
      { content: 'Build', status: 'in_progress', activeForm: 'Building' },
      { content: 'Ship', status: 'pending', activeForm: 'Shipping' },
    ],
  } as never)
  expect(await banner($)).toContain('1/3: Building')
})

test('ship status reads the branch and counts uncommitted files from git status', () => {
  expect(shipFrom('## feature/streaks...origin/feature/streaks [ahead 1]\n M src/routine.ts\n?? src/streak.ts\n')).toEqual({
    branch: 'feature/streaks',
    changed: 2,
  })
  expect(shipFrom('## main\n')).toEqual({ branch: 'main', changed: 0 })
  expect(shipFrom('## No commits yet on main\n?? README.md\n')).toEqual({ branch: 'main', changed: 1 })
  expect(shipFrom('## HEAD (no branch)\n')).toEqual({ branch: 'detached', changed: 0 })
  expect(shipFrom('')).toBeNull()
})

test('without git to ask, there is no ship status and nothing breaks', async ($, on) => {
  world(on)
  await begin($)
  expect(await readout($)).not.toContain('committed')
  expect(await banner($)).not.toContain('>Ship </tspan>')
})

test('idle switches to a different idle animation every 30 seconds', async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)
  await clock.advance(4000)
  const altOf = (svg: string) => /class="st-idle v-\w+ (a-\d)/.exec(svg)?.[1]
  const first = altOf(await scene($))
  expect(first).toBeDefined()
  await clock.advance(30_000)
  const second = altOf(await scene($))
  expect(second).toBeDefined()
  expect(second).not.toBe(first)
})

test('a tool that runs a long time switches to checking the watch', async ($, on) => {
  const clock = world(on)
  let release = () => {}
  let entered = () => {}
  const gate = new Promise<void>(r => (release = r))
  const inside = new Promise<void>(r => (entered = r))
  on('tool.call', async () => {
    entered()
    await gate

    return { result: {} } as never
  })
  await begin($)
  const call = $.tool.call({ tool: 'Bash', command: 'sleep 60' } as never)
  await inside
  expect(await scene($)).toContain('class="st-tool v-weld')
  await clock.advance(21_000)
  expect(await scene($)).toContain('class="st-tool v-long')
  release()
  await call
  expect(await scene($)).toContain('class="st-think')
})

test('a new prompt wakes a sleeping astronaut with a stretch', async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)
  await clock.advance(6 * 60 * 1000)
  expect(await scene($)).toContain('class="st-sleep')
  await $.prompt.submit({ text: 'morning' } as never)
  await $.turn.start({ text: 'morning', turnId: 't2' } as never)
  expect(await scene($)).toContain('class="st-wake')
  await clock.advance(3000)
  expect(await scene($)).toContain('class="st-think')
})

test('a long turn ends with fireworks', async ($, on) => {
  world(on)
  await begin($)
  await $.turn.complete({ answer: 'done', durationMs: 200_000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  expect(await scene($)).toMatch(/class="st-done v-\w+ a-3/)
})
