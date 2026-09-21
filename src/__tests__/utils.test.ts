import { formatDate, formatTime, formatDateTime, truncate, slugify, getInitials, debounce, sleep, generateId } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toContain('Jan')
      expect(formatDate(date)).toContain('15')
      expect(formatDate(date)).toContain('2024')
    })
  })

  describe('formatTime', () => {
    it('formats time correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatTime(date)).toMatch(/\d+:\d+/)
    })
  })

  describe('formatDateTime', () => {
    it('combines date and time', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDateTime(date)
      expect(result).toContain('at')
    })
  })

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('hello world', 5)).toBe('hello...')
    })
    it('returns original if shorter', () => {
      expect(truncate('hi', 10)).toBe('hi')
    })
  })

  describe('slugify', () => {
    it('creates slug from string', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
      expect(slugify('Test@#$%')).toBe('test')
    })
  })

  describe('getInitials', () => {
    it('gets initials from name', () => {
      expect(getInitials('Jane Doe')).toBe('JD')
      expect(getInitials('John')).toBe('J')
      expect(getInitials('John A Smith')).toBe('JA')
    })
  })

  describe('sleep', () => {
    it('resolves after specified time', async () => {
      const start = Date.now()
      await sleep(50)
      expect(Date.now() - start).toBeGreaterThanOrEqual(40)
    })
  })

  describe('generateId', () => {
    it('generates unique ids', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })
  })
})