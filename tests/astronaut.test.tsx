import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

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

// The engine beneath the mod: each hook here answers as a session would.
// `percent` is how much of the context window is in use.
function world(on: On, percent = 30) {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'astronaut' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, tokens: percent * 2000, percent }, rateLimits: [] },
  }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('prompt.submit', (_, e) => ({ text: e.text }) as never)

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
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Comet is floating')
  await ui.unmount()
})

test('the name option renames the astronaut', { options: { name: 'Pip' } }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true } as never)
  await clock.advance(4000)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Pip is floating')
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
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Comet is patting Blip')
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
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Comet is patting Zorbelina the Ma')
  await ui.unmount()
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
