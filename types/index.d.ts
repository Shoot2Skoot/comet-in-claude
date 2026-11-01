// What the astronaut is doing right now.
// hello: just arrived (session start). wake: woken from a nap by a new
// prompt. idle: floating. think: Claude is
// working out a reply. tool: a tool is running. agents: subagents are out.
// ask: Claude asked you a question. wait: Claude needs your permission.
// compact: the conversation is being compacted. done: the turn finished.
// abort: you stopped the turn. err: a tool call failed. sleep: nothing has
// happened for a while.
export type Mood =
  | 'hello'
  | 'wake'
  | 'idle'
  | 'think'
  | 'tool'
  | 'agents'
  | 'ask'
  | 'wait'
  | 'compact'
  | 'done'
  | 'abort'
  | 'err'
  | 'sleep'

// Which tool animation plays while mood is 'tool'.
// laptop: editing or writing files. weld: shell commands. mine: searching
// and reading files. web: web search and fetch. radio: connector (MCP)
// tools. list: task list updates. flag: git commit or push. lab: running
// tests. crate: installing packages. build: build commands. trash: deleting
// files. map: plan mode. photo: reading an image or
// taking a screenshot. rover: browser or computer control. log: memory
// tools. mail: sending a message. long: any tool running over 20 seconds.
// wrist: everything else.
export type ToolKind =
  | 'wrist'
  | 'laptop'
  | 'weld'
  | 'mine'
  | 'web'
  | 'radio'
  | 'list'
  | 'flag'
  | 'lab'
  | 'crate'
  | 'build'
  | 'trash'
  | 'map'
  | 'photo'
  | 'rover'
  | 'log'
  | 'mail'
  | 'long'

// o2 is the share of the context window still free, 0 to 1, or null before
// the first reading. alt picks which version of a mood's animation plays.
export type Buddy = { mood: Mood; tool: ToolKind; o2: number | null; alt?: number }

declare module 'claude-code' {
  interface PluginState {
    'astronaut-buddy': { buddy: Buddy }
  }
}
