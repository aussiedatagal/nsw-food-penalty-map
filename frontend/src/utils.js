export const OFFENCE_CODES = {
  "11339": "Fail to comply with Food Standards Code",
  "11338": "Fail to comply with Food Standards Code",
  "11343": "Sell food packaged/labelled contravening Food Standards Code",
  "11359": "Fail to comply with a prohibition order",
  "11341": "Sell food that fails to comply with the Food Standards Code",
  "11323": "Sell food that is unsuitable",
  "11331": "Supply food not of nature required by purchaser",
  "11321": "Handle food in manner likely to render it unsuitable",
  "73091": "Not keep and produce for inspection copy of food safety supervisor certificate",
  "23091": "Not keep and produce for inspection copy of food safety supervisor certificate",
  "11373": "Not comply with requirements of food safety scheme",
  "11322": "Sell food that is unsuitable",
  "11325": "Use misleading/deceptive advertising/packaging/labelling of food",
  "11370": "Carry on food business/activity without a licence",
  "23085": "Not appoint food safety supervisor for premises",
  "73085": "Not appoint food safety supervisor for premises",
  "11315": "Carry on food business/activity without a licence",
  "11367": "Fail to notify appropriate enforcement agency",
  "11328": "Sell food packaged/labelled that falsely describes the food",
  "11368": "Fail to notify appropriate enforcement agency",
  "11358": "Fail to comply with a prohibition order",
  "11317": "Handle food in manner likely to render it unsafe",
  "23086": "Not continue to have food safety supervisor for premises",
  "73086": "Not continue to have food safety supervisor for premises"
}

const uniqueOffences = {}
Object.entries(OFFENCE_CODES).forEach(([code, desc]) => {
  if (!uniqueOffences[desc]) {
    uniqueOffences[desc] = code
  }
})

export const OFFENCE_OPTIONS = Object.entries(uniqueOffences).map(([desc, code]) => ({
  code,
  description: desc
})).sort((a, b) => a.description.localeCompare(b.description))

// Continuous color scale from light (few offences) to dark (many offences)
// Using a gradient from light orange -> orange -> red -> dark red
// All colors represent violations, with darker = more severe
export function getMarkerColor(count) {
  // Color stops for a continuous scale - all represent violations
  // 1: light orange/peach (#ffb74d)
  // 2: orange (#ff9800)
  // 3: dark orange (#ff6f00)
  // 4: red-orange (#f4511e)
  // 5: red (#e53935)
  // 6+: dark red (#c62828)
  
  if (count >= 10) return '#8b0000'  // Very dark red
  if (count >= 8) return '#b71c1c'   // Dark red
  if (count >= 6) return '#c62828'   // Red
  if (count >= 5) return '#e53935'   // Bright red
  if (count >= 4) return '#f4511e'   // Red-orange
  if (count >= 3) return '#ff6f00'   // Dark orange
  if (count >= 2) return '#ff9800'   // Orange
  return '#ffb74d'                   // Light orange (still a violation)
}

export function getBadgeColor(count) {
  // Matching badge colors with light backgrounds - all represent violations
  if (count >= 10) return { bg: '#ffebee', color: '#8b0000' }
  if (count >= 8) return { bg: '#ffebee', color: '#b71c1c' }
  if (count >= 6) return { bg: '#ffebee', color: '#c62828' }
  if (count >= 5) return { bg: '#ffebee', color: '#e53935' }
  if (count >= 4) return { bg: '#fff3e0', color: '#f4511e' }
  if (count >= 3) return { bg: '#fff3e0', color: '#ff6f00' }
  if (count >= 2) return { bg: '#fff3e0', color: '#ff9800' }
  return { bg: '#fff3e0', color: '#ffb74d' }  // Light orange background
}

/**
 * Parses a penalty amount string that may contain multiple amounts separated by spaces.
 * For example: "$3,000 $700 $500" will return 4200
 * @param {string} penaltyAmount - The penalty amount string (e.g., "$3,000 $700 $500")
 * @returns {number} - The sum of all amounts found in the string
 */
export function parsePenaltyAmount(penaltyAmount) {
  if (!penaltyAmount || typeof penaltyAmount !== 'string') return 0
  
  const parts = penaltyAmount.trim().split(/\s+/)
  
  let total = 0
  for (const part of parts) {
    const cleaned = part.replace(/[^0-9.]/g, '')
    const amount = parseFloat(cleaned) || 0
    total += amount
  }
  
  return total
}

export function getCanonicalUrl(penalty) {
  if (penalty.type === 'prosecution' || penalty.prosecution) {
    if (penalty.prosecution_slug) {
      return `https://www.foodauthority.nsw.gov.au/offences/prosecutions/${penalty.prosecution_slug}`
    }
    const nodeId = penalty.prosecution_notice_id?.replace('prosecution-', '') || 
                   penalty.penalty_notice_number?.replace('prosecution-', '')
    if (nodeId && nodeId.match(/^\d+$/)) {
      return `https://www.foodauthority.nsw.gov.au/offences/prosecutions/${nodeId}`
    }
  }
  
  if (penalty.penalty_notice_number && !penalty.penalty_notice_number.startsWith('prosecution-')) {
    return `https://www.foodauthority.nsw.gov.au/offences/penalty-notices/${penalty.penalty_notice_number}`
  }
  
  return null
}
