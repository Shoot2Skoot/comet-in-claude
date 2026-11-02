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

// Fuel: the account's weekly usage limit. left is the share still unused,
// 0 to 1; resetsAt is when it refills, as an ISO 8601 time.
export type Fuel = { left: number; resetsAt?: string }

// One task on the list Claude keeps for the work at hand (the mission).
// activeForm is how it reads while under way ("Running tests").
export type MissionTask = {
  id: string
  subject: string
  activeForm?: string
  status: 'pending' | 'in_progress' | 'completed'
}

// Ship status: the git branch the session's folder is on, and how many files
// have changes not yet committed.
export type Ship = { branch: string; changed: number }

// o2 is the share of the context window still free (onboard memory), 0 to 1,
// or null before the first reading. alt picks which version of a mood's
// animation plays. say is a roll made when the state began; it picks the line
// the status shows from that state's pool, so the words change each time but
// hold steady within one state. fuel is null off a subscription, ship is null
// outside a git repository, and tasks is empty while there is no task list.
export type Buddy = {
  mood: Mood
  tool: ToolKind
  o2: number | null
  alt?: number
  say?: number
  fuel?: Fuel | null
  tasks?: MissionTask[]
  ship?: Ship | null
}

declare module 'claude-code' {
  interface PluginState {
    'astronaut-buddy': { buddy: Buddy }
  }
}
