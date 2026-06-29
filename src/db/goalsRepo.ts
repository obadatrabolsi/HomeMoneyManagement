import { db } from './schema'
import { id } from '../lib/uuid'
import type { Goal, GoalContribution } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateGoalInput {
  name: string
  targetAmount: number
  currency: string
  targetDate?: string
  notes?: string
  icon?: string
  color?: string
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const count = await db.goals.count()
  const goal: Goal = {
    id: id(),
    name: input.name,
    targetAmount: input.targetAmount,
    currency: input.currency,
    targetDate: input.targetDate,
    notes: input.notes,
    icon: input.icon ?? 'target',
    color: input.color ?? '#10b981',
    isArchived: false,
    sortOrder: count,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  await db.goals.add(goal)
  return goal
}

export async function updateGoal(goalId: string, patch: Partial<Goal>): Promise<void> {
  await db.goals.update(goalId, { ...patch, updatedAt: nowIso() })
}

export async function archiveGoal(goalId: string): Promise<void> {
  await db.goals.update(goalId, { isArchived: true, updatedAt: nowIso() })
}

export async function listGoals(includeArchived = false): Promise<Goal[]> {
  const rows = await db.goals.toArray()
  return rows
    .filter(g => includeArchived || !g.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export interface AddContributionInput {
  goalId: string
  amount: number
  date: string
  note?: string
}

export async function addContribution(input: AddContributionInput): Promise<GoalContribution> {
  const c: GoalContribution = { id: id(), createdAt: nowIso(), ...input }
  await db.goalContributions.add(c)
  return c
}

export async function listContributions(goalId: string): Promise<GoalContribution[]> {
  const rows = await db.goalContributions.where('goalId').equals(goalId).toArray()
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export interface GoalProgress {
  goal: Goal
  current: number
  remaining: number
  percent: number
  reached: boolean
}

export async function goalsWithProgress(includeArchived = false): Promise<GoalProgress[]> {
  const [goals, contributions] = await Promise.all([
    listGoals(includeArchived),
    db.goalContributions.toArray(),
  ])
  const sums: Record<string, number> = {}
  for (const c of contributions) sums[c.goalId] = (sums[c.goalId] ?? 0) + c.amount
  return goals.map(goal => {
    const current = sums[goal.id] ?? 0
    const percent = goal.targetAmount > 0 ? Math.round((current / goal.targetAmount) * 100) : 0
    const reached = goal.targetAmount > 0 && current >= goal.targetAmount
    return { goal, current, remaining: Math.max(goal.targetAmount - current, 0), percent, reached }
  })
}
