import { describe, it, expect } from 'vitest'
import {
  getMarkerColor,
  getBadgeColor,
  parsePenaltyAmount,
  getCanonicalUrl,
  OFFENCE_CODES
} from './utils'

describe('getMarkerColor', () => {
  it('returns light orange for 1 penalty', () => {
    expect(getMarkerColor(1)).toBe('#ffb74d')
  })

  it('returns orange for 2 penalties', () => {
    expect(getMarkerColor(2)).toBe('#ff9800')
  })

  it('returns dark orange for 3 penalties', () => {
    expect(getMarkerColor(3)).toBe('#ff6f00')
  })

  it('returns red-orange for 4 penalties', () => {
    expect(getMarkerColor(4)).toBe('#f4511e')
  })

  it('returns bright red for 5 penalties', () => {
    expect(getMarkerColor(5)).toBe('#e53935')
  })

  it('returns red for 6 penalties', () => {
    expect(getMarkerColor(6)).toBe('#c62828')
  })

  it('returns dark red for 8 penalties', () => {
    expect(getMarkerColor(8)).toBe('#b71c1c')
  })

  it('returns very dark red for 10+ penalties', () => {
    expect(getMarkerColor(10)).toBe('#8b0000')
    expect(getMarkerColor(15)).toBe('#8b0000')
  })
})

describe('getBadgeColor', () => {
  it('returns light orange badge for 1 penalty', () => {
    expect(getBadgeColor(1)).toEqual({ bg: '#fff3e0', color: '#ffb74d' })
  })

  it('returns orange badge for 2 penalties', () => {
    expect(getBadgeColor(2)).toEqual({ bg: '#fff3e0', color: '#ff9800' })
  })

  it('returns red badge for 6+ penalties', () => {
    expect(getBadgeColor(6)).toEqual({ bg: '#ffebee', color: '#c62828' })
  })

  it('returns very dark red badge for 10+ penalties', () => {
    expect(getBadgeColor(10)).toEqual({ bg: '#ffebee', color: '#8b0000' })
  })
})

describe('parsePenaltyAmount', () => {
  it('parses simple dollar amount', () => {
    expect(parsePenaltyAmount('$1,000')).toBe(1000)
  })

  it('parses amount without dollar sign', () => {
    expect(parsePenaltyAmount('500')).toBe(500)
  })

  it('parses multiple amounts and sums them', () => {
    expect(parsePenaltyAmount('$3,000 $700 $500')).toBe(4200)
  })

  it('handles amounts with commas', () => {
    expect(parsePenaltyAmount('$10,000')).toBe(10000)
  })

  it('returns 0 for null or undefined', () => {
    expect(parsePenaltyAmount(null)).toBe(0)
    expect(parsePenaltyAmount(undefined)).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parsePenaltyAmount('')).toBe(0)
  })

  it('returns 0 for non-string input', () => {
    expect(parsePenaltyAmount(123)).toBe(0)
  })

  it('handles decimal amounts', () => {
    expect(parsePenaltyAmount('$1,234.56')).toBe(1234.56)
  })

  it('handles multiple decimal amounts', () => {
    expect(parsePenaltyAmount('$1,000.50 $200.25')).toBe(1200.75)
  })
})

describe('getCanonicalUrl', () => {
  it('returns prosecution URL when prosecution_slug is provided', () => {
    const penalty = {
      type: 'prosecution',
      prosecution_slug: 'test-slug'
    }
    expect(getCanonicalUrl(penalty)).toBe('https://www.foodauthority.nsw.gov.au/offences/prosecutions/test-slug')
  })

  it('returns prosecution URL from prosecution_notice_id', () => {
    const penalty = {
      type: 'prosecution',
      prosecution_notice_id: 'prosecution-123'
    }
    expect(getCanonicalUrl(penalty)).toBe('https://www.foodauthority.nsw.gov.au/offences/prosecutions/123')
  })

  it('returns prosecution URL from penalty_notice_number when it starts with prosecution-', () => {
    const penalty = {
      type: 'prosecution',
      penalty_notice_number: 'prosecution-456'
    }
    expect(getCanonicalUrl(penalty)).toBe('https://www.foodauthority.nsw.gov.au/offences/prosecutions/456')
  })

  it('returns penalty notice URL for regular penalty notices', () => {
    const penalty = {
      penalty_notice_number: 'PN12345'
    }
    expect(getCanonicalUrl(penalty)).toBe('https://www.foodauthority.nsw.gov.au/offences/penalty-notices/PN12345')
  })

  it('returns null when no valid URL can be constructed', () => {
    const penalty = {}
    expect(getCanonicalUrl(penalty)).toBe(null)
  })

  it('handles prosecution flag without type', () => {
    const penalty = {
      prosecution: true,
      prosecution_slug: 'test'
    }
    expect(getCanonicalUrl(penalty)).toBe('https://www.foodauthority.nsw.gov.au/offences/prosecutions/test')
  })
})

describe('OFFENCE_CODES', () => {
  it('contains expected offence codes', () => {
    expect(OFFENCE_CODES['11339']).toBe('Fail to comply with Food Standards Code')
    expect(OFFENCE_CODES['11323']).toBe('Sell food that is unsuitable')
  })

  it('has multiple codes for same description', () => {
    const codes = Object.entries(OFFENCE_CODES)
      .filter(([_, desc]) => desc === 'Fail to comply with Food Standards Code')
      .map(([code]) => code)
    expect(codes.length).toBeGreaterThan(1)
  })
})


