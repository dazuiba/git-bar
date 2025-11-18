#!/usr/bin/env node
/**
 * Git daily commit bar chart (date x author)
 * Usage:
 *   gitbar [--author kw] [--author kw2] [--days N]
 * Env:
 *   GIT_BAR_LIMIT  max commits fetched when --days is not set (default 30)
 * Notes:
 *   - Multiple --author values are ORed, case-insensitive
 *   - --days N limits to last N days (disables -n LIMIT)
 *   - Columns: date, hash, author, message(10 chars), colored bar, stats (ins+,del-)
 */
import { execSync } from 'node:child_process'

const DATE_WIDTH = 10 // YYYY-MM-DD
const HASH_WIDTH = 9
const AUTHOR_WIDTH = 12
const MESSAGE_WIDTH = 10
const HARD_BAR_CAP = 120
const DEFAULT_LIMIT = Number(process.env.GIT_BAR_LIMIT || '30')

// Args
const authorFilters: string[] = []
let daysFilter: number | null = null
let showHelp = false
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--author') {
    const v = process.argv[++i]
    if (v) authorFilters.push(v)
  } else if (arg === '--days') {
    const n = Number(process.argv[++i])
    if (!Number.isNaN(n)) daysFilter = n
  } else if (arg === '--help' || arg === '-h') {
    showHelp = true
  }
}

if (showHelp) {
  console.log(`Usage: gitbar [--author kw] [--author kw2] [--days N]\n` +
    `Options:\n` +
    `  --author <kw>   Filter by author substring (OR, case-insensitive, repeatable)\n` +
    `  --days <N>      Only commits from the last N days (disables -n limit)\n` +
    `Env:\n` +
    `  GIT_BAR_LIMIT   Max commits fetched when --days is unset (default 30)\n`)
  process.exit(0)
}

const gitArgs = [
  'log',
  '--shortstat',
  '--date=short',
  `--pretty=format:%cd%x09%h%x09%an%x09%s`,
]
if (!daysFilter) {
  gitArgs.splice(1, 0, `-n ${DEFAULT_LIMIT}`)
}
if (authorFilters.length > 0) {
  gitArgs.push('--regexp-ignore-case')
  gitArgs.push('--extended-regexp')
  const pattern = authorFilters.length === 1 ? authorFilters[0] : `(${authorFilters.join('|')})`
  gitArgs.push(`--author='${pattern}'`)
}
if (daysFilter && daysFilter > 0) gitArgs.push(`--since='${daysFilter} days ago'`)

const logCmd = `git ${gitArgs.join(' ')}`
const raw = execSync(logCmd, { encoding: 'utf8' })
const lines = raw.split(/\r?\n/)

type Entry = {
  date: string
  hash: string
  author: string
  subject: string
  insertions: number
  deletions: number
}

const entries: Entry[] = []
let current: Entry | null = null
for (const line of lines) {
  if (!line.trim()) continue
  if (!line.startsWith(' ')) {
    if (current) entries.push(current)
    const [date, hash, author, ...rest] = line.split('\t')
    const subject = rest.join('\t') || ''
    current = { date, hash, author, subject, insertions: 0, deletions: 0 }
  } else if (current) {
    const ins = line.match(/(\d+)\s+insertions?\(\+\)/)
    const del = line.match(/(\d+)\s+deletions?\(-\)/)
    if (ins) current.insertions += Number(ins[1])
    if (del) current.deletions += Number(del[1])
  }
}
if (current) entries.push(current)

// group by date + author
 type Daily = {
  date: string
  author: string
  hash: string
  message: string
  insertions: number
  deletions: number
}
const dailyMap = new Map<string, Daily>()
for (const e of entries) {
  const key = `${e.date}::${e.author}`
  const msg = `${e.author} ${e.subject}`.trim()
  const existing = dailyMap.get(key)
  if (!existing) {
    dailyMap.set(key, {
      date: e.date,
      author: e.author,
      hash: e.hash,
      message: msg,
      insertions: e.insertions,
      deletions: e.deletions,
    })
  } else {
    existing.insertions += e.insertions
    existing.deletions += e.deletions
    if (msg.length > existing.message.length) {
      existing.message = msg
      existing.hash = e.hash
    }
  }
}

const dailyEntries = Array.from(dailyMap.values()).sort((a, b) => {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  const aa = a.author.toLowerCase()
  const bb = b.author.toLowerCase()
  if (aa === bb) return 0
  return aa < bb ? -1 : 1
})

const totals = dailyEntries.map((e) => e.insertions + e.deletions)
const sortedTotals = [...totals].sort((a, b) => a - b)
const p95Index = Math.max(0, Math.floor(sortedTotals.length * 0.95) - 1)
const scaleMax = Math.max(sortedTotals[p95Index] ?? 0, 1)

const padOrCut = (text: string, width: number) => {
  if (text.length > width) return text.slice(0, Math.max(0, width - 3)) + '...'
  return text.padEnd(width, ' ')
}

const COLORS = [
  '\u001b[31m',
  '\u001b[32m',
  '\u001b[33m',
  '\u001b[34m',
  '\u001b[35m',
  '\u001b[36m',
  '\u001b[91m',
  '\u001b[92m',
  '\u001b[93m',
  '\u001b[94m',
  '\u001b[95m',
  '\u001b[96m',
]
const RESET = '\u001b[0m'

const colorFor = (author: string) => {
  const clean = author.toLowerCase()
  let hash = 0
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]
}
const paint = (txt: string, author: string) => {
  if (!process.stdout.isTTY) return txt
  return `${colorFor(author)}${txt}${RESET}`
}

const termWidth = typeof process.stdout.columns === 'number' ? process.stdout.columns : 80
const statsLenMax = Math.max(4, ...dailyEntries.map((e) => `${e.insertions}+,${e.deletions}-`.length))
const baseWidth = DATE_WIDTH + HASH_WIDTH + AUTHOR_WIDTH + MESSAGE_WIDTH + statsLenMax + 5
const availableForBar = Math.max(1, termWidth - baseWidth)
const maxBarWidth = Math.max(1, Math.min(availableForBar, HARD_BAR_CAP))

for (const e of dailyEntries) {
  const total = e.insertions + e.deletions
  let barLen = Math.round((total / scaleMax) * maxBarWidth)
  if (total > 0 && barLen === 0) barLen = 1

  const dateCol = padOrCut(e.date, DATE_WIDTH)
  const hashCol = padOrCut(e.hash, HASH_WIDTH)
  const authorCol = padOrCut(e.author, AUTHOR_WIDTH)
  const msgCol = padOrCut(e.message.replace(/^\s+/, ''), MESSAGE_WIDTH)
  const stats = `${e.insertions}+,${e.deletions}-`

  const prefixLen = dateCol.length + 1 + hashCol.length + 1 + authorCol.length + 1 + msgCol.length + 1
  const lineAvail = Math.max(1, Math.min(HARD_BAR_CAP, termWidth - prefixLen - 1 - stats.length))
  barLen = Math.min(barLen, lineAvail)
  const bar = '█'.repeat(barLen)

  console.log(
    `${dateCol} ${hashCol} ${paint(authorCol, e.author)} ${msgCol} ${paint(bar, e.author)} ${stats}`
  )
}
