// The readouts beside the astronaut, worked out from what the engine reports:
// fuel from the usage windows, the mission from the task tools, the ship from
// `git status`. Plain functions, so tests can check them directly.
import type { SessionRateLimit } from 'claude-code'

import type { Fuel, MissionTask, Ship } from '../types'

export function field(input: unknown, key: string): string {
  if (typeof input !== 'object' || input === null) return ''
  const value = (input as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

// Fuel: the weekly usage limit still unused. Other windows aren't shown.
export function fuelFrom(limits: readonly SessionRateLimit[]): Fuel | null {
  const week = limits.find(limit => limit.kind === 'seven_day')
  if (!week) return null
  return { left: Math.max(0, Math.min(1, 1 - week.percentUsed / 100)), resetsAt: week.resetsAt }
}

// The mission: the task list Claude keeps, rebuilt from its task tools as they
// run. Returns the new list, or undefined when the call changed nothing.
const STATUSES = ['pending', 'in_progress', 'completed'] as const

function asStatus(value: unknown): MissionTask['status'] | undefined {
  return STATUSES.find(status => status === value)
}

export function nextTasks(tasks: readonly MissionTask[], tool: string, e: unknown, result: unknown): MissionTask[] | undefined {
  const input = (typeof e === 'object' && e !== null ? e : {}) as Record<string, unknown>
  const output = (typeof result === 'object' && result !== null ? result : {}) as Record<string, unknown>
  if (tool === 'TaskCreate') {
    const id = (output.task as { id?: unknown } | undefined)?.id
    if (typeof id !== 'string') return undefined
    const task: MissionTask = { id, subject: field(input, 'subject'), status: 'pending' }
    const activeForm = field(input, 'activeForm')
    if (activeForm) task.activeForm = activeForm

    return [...tasks.filter(t => t.id !== id), task]
  }
  if (tool === 'TaskUpdate') {
    const id = field(input, 'taskId')
    if (!tasks.some(t => t.id === id)) return undefined
    if (input.status === 'deleted') return tasks.filter(t => t.id !== id)

    return tasks.map(t =>
      t.id !== id
        ? t
        : {
            ...t,
            subject: field(input, 'subject') || t.subject,
            activeForm: field(input, 'activeForm') || t.activeForm,
            status: asStatus(input.status) ?? t.status,
          },
    )
  }
  if (tool === 'TodoWrite' && Array.isArray(input.todos)) {
    return input.todos.map((todo: unknown, index): MissionTask => {
      const item = (typeof todo === 'object' && todo !== null ? todo : {}) as Record<string, unknown>
      return {
        id: String(index),
        subject: field(item, 'content'),
        activeForm: field(item, 'activeForm') || undefined,
        status: asStatus(item.status) ?? 'pending',
      }
    })
  }
  if (tool === 'TaskList' && Array.isArray(output.tasks)) {
    return output.tasks.map((listed: unknown): MissionTask => {
      const item = (typeof listed === 'object' && listed !== null ? listed : {}) as Record<string, unknown>
      const id = field(item, 'id')
      return {
        id,
        subject: field(item, 'subject'),
        activeForm: tasks.find(t => t.id === id)?.activeForm,
        status: asStatus(item.status) ?? 'pending',
      }
    })
  }

  return undefined
}

// Ship status: the git branch and how many files have uncommitted changes,
// from `git status` in the session's folder. Null outside a git repository.
export function shipFrom(porcelain: string): Ship | null {
  const lines = porcelain.split('\n').filter(line => line.length > 0)
  const head = lines[0]
  if (!head?.startsWith('## ')) return null
  let branch = head.slice(3)
  if (branch.startsWith('No commits yet on ')) branch = branch.slice('No commits yet on '.length)
  else if (branch.startsWith('HEAD (no branch)')) branch = 'detached'
  else branch = (branch.split('...')[0] ?? branch).split(' [')[0] ?? branch

  return { branch, changed: lines.length - 1 }
}
