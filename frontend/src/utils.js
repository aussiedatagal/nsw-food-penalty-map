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

export function getMarkerColor(count) {
  if (count >= 5) return '#d32f2f'
  if (count >= 3) return '#f57c00'
  if (count >= 2) return '#fbc02d'
  return '#ff9800'
}

export function getBadgeColor(count) {
  if (count >= 5) return { bg: '#ffebee', color: '#d32f2f' }
  if (count >= 3) return { bg: '#fff3e0', color: '#f57c00' }
  if (count >= 2) return { bg: '#fffde7', color: '#fbc02d' }
  return { bg: '#fff3e0', color: '#ff9800' }
}

/**
 * Parses a penalty amount string that may contain multiple amounts separated by spaces.
 * For example: "$3,000 $700 $500" will return 4200
 * @param {string} penaltyAmount - The penalty amount string (e.g., "$3,000 $700 $500")
 * @returns {number} - The sum of all amounts found in the string
 */
export function parsePenaltyAmount(penaltyAmount) {
  if (!penaltyAmount || typeof penaltyAmount !== 'string') return 0
  
  // Split by spaces to handle multiple amounts
  const parts = penaltyAmount.trim().split(/\s+/)
  
  let total = 0
  for (const part of parts) {
    // Extract numeric value from each part (removes $ and commas)
    const cleaned = part.replace(/[^0-9.]/g, '')
    const amount = parseFloat(cleaned) || 0
    total += amount
  }
  
  return total
}
