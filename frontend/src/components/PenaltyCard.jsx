import { useMemo } from 'react'
import { OFFENCE_CODES, parsePenaltyAmount, getCanonicalUrl } from '../utils'

function PenaltyCard({ location, locationGroup, onClose }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Group shops with their penalties, sorted by newest infringement date
  const shopsWithPenalties = useMemo(() => {
    if (!locationGroup || !locationGroup.shops || locationGroup.shops.length === 1) {
      // Single shop - return as is
      const shopTotal = location.penalties.reduce((sum, penalty) => {
        return sum + parsePenaltyAmount(penalty.penalty_amount)
      }, 0)
      const sortedPenalties = [...location.penalties].sort((a, b) => {
        const dateA = a.date_of_offence ? new Date(a.date_of_offence).getTime() : 0
        const dateB = b.date_of_offence ? new Date(b.date_of_offence).getTime() : 0
        return dateB - dateA // Newest first
      })
      return [{
        name: location.name,
        totalAmount: shopTotal,
        penalties: sortedPenalties
      }]
    }
    
    // Multiple shops - process each shop
    const shops = locationGroup.shops.map(shop => {
      const shopTotal = shop.penalties.reduce((sum, penalty) => {
        return sum + parsePenaltyAmount(penalty.penalty_amount)
      }, 0)
      
      // Sort penalties by newest infringement date
      const sortedPenalties = [...shop.penalties].sort((a, b) => {
        const dateA = a.date_of_offence ? new Date(a.date_of_offence).getTime() : 0
        const dateB = b.date_of_offence ? new Date(b.date_of_offence).getTime() : 0
        return dateB - dateA // Newest first
      })
      
      // Get newest date for sorting shops
      const newestDate = sortedPenalties.length > 0 && sortedPenalties[0].date_of_offence
        ? new Date(sortedPenalties[0].date_of_offence).getTime()
        : 0
      
      return {
        name: shop.name,
        totalAmount: shopTotal,
        penalties: sortedPenalties,
        newestDate
      }
    })
    
    // Sort shops by newest infringement date
    return shops.sort((a, b) => b.newestDate - a.newestDate)
  }, [location, locationGroup])

  const totalPenaltiesCount = useMemo(() => {
    return shopsWithPenalties.reduce((sum, shop) => sum + shop.penalties.length, 0)
  }, [shopsWithPenalties])

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const hasMultipleShops = locationGroup && locationGroup.shops && locationGroup.shops.length > 1

  return (
    <div className="penalty-card">
      <div className="card-header">
        <div>
          <div className="card-title">
            {hasMultipleShops ? `${locationGroup.shops.length} Shops at This Location` : location.name}
          </div>
          <div className="card-section-content" style={{ fontSize: '0.8125rem', color: '#6c757d' }}>
            {location.address}
          </div>
        </div>
        <button className="card-close" onClick={onClose}>×</button>
      </div>

      <div className="card-body">
        <div className="card-section">
          <div className="card-section-title">Location</div>
          <div className="card-section-content">
            <div>{location.address}</div>
            <div style={{ marginTop: '0.5rem', color: '#6c757d', fontSize: '0.8125rem' }}>{location.council}</div>
          </div>
        </div>

        <div className="card-section">
          <div className="card-section-title">
            Penalties ({totalPenaltiesCount})
          </div>
          {!hasMultipleShops && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>Total Penalty Amount</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc3545' }}>
                {formatCurrency(shopsWithPenalties[0].totalAmount)}
              </div>
            </div>
          )}
          <div className="penalty-list">
            {hasMultipleShops ? (
              // Multiple shops: show grouping with headers
              shopsWithPenalties.map((shop, shopIdx) => (
                <div key={shopIdx}>
                  {shopIdx > 0 && (
                    <div className="shop-delimiter"></div>
                  )}
                  <div className="shop-header">
                    <div className="shop-name">{shop.name}</div>
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>Total Penalty Amount</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc3545' }}>
                        {formatCurrency(shop.totalAmount)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                        {shop.penalties.length} {shop.penalties.length !== 1 ? 'penalties' : 'penalty'}
                      </div>
                    </div>
                  </div>
                  {shop.penalties.map((penalty, penaltyIdx) => {
                    const isProsecution = penalty.type === 'prosecution' || !!penalty.prosecution
                    return (
                      <div key={penaltyIdx} className="penalty-item">
                        <div className="penalty-date">
                          {penalty.date_of_offence ? formatDate(penalty.date_of_offence) : 'No offence date'}
                        </div>
                    {isProsecution && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Prosecution
                        </span>
                      </div>
                    )}
                    <div className="card-section-content">
                      <strong>
                        {(OFFENCE_CODES[penalty.offence_code] || penalty.offence_description || '')
                          .replace(/\s*-\s*(Individual|Corporation)$/i, '')}
                      </strong>
                      {penalty.offence_code && (
                        <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem', fontWeight: 'normal' }}>
                          Offence Code: {penalty.offence_code}
                        </div>
                      )}
                    </div>
                    {penalty.offence_nature && (
                      <div className="card-section-content" style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6c757d', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                        {penalty.offence_nature}
                      </div>
                    )}
                    <div className="penalty-amount">
                      {penalty.penalty_amount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e9ecef' }}>
                      {penalty.date_issued && (
                        <div>Issued: {formatDate(penalty.date_issued)}</div>
                      )}
                      {penalty.issued_by && (
                        <div style={{ marginTop: '0.25rem' }}>By: {penalty.issued_by}</div>
                      )}
                      {penalty.party_served && (
                        <div style={{ marginTop: '0.25rem' }}>Party: {penalty.party_served}</div>
                      )}
                      {isProsecution && penalty.prosecution?.court && (
                        <div style={{ marginTop: '0.25rem' }}>Court: {penalty.prosecution.court}</div>
                      )}
                      {getCanonicalUrl(penalty) && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <a
                            href={getCanonicalUrl(penalty)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#667eea',
                              textDecoration: 'none',
                              fontSize: '0.8125rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.textDecoration = 'none'
                            }}
                          >
                            View on NSW Food Authority
                            <span style={{ fontSize: '0.7rem' }}>↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                    </div>
                  )
                })}
              </div>
            ))
            ) : (
              // Single shop: show simple list without shop header
              shopsWithPenalties[0].penalties.map((penalty, penaltyIdx) => {
                const isProsecution = penalty.type === 'prosecution' || !!penalty.prosecution
                return (
                  <div key={penaltyIdx} className="penalty-item">
                    <div className="penalty-date">
                      {penalty.date_of_offence ? formatDate(penalty.date_of_offence) : 'No offence date'}
                    </div>
                    {isProsecution && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Prosecution
                        </span>
                      </div>
                    )}
                    <div className="card-section-content">
                      <strong>
                        {(OFFENCE_CODES[penalty.offence_code] || penalty.offence_description || '')
                          .replace(/\s*-\s*(Individual|Corporation)$/i, '')}
                      </strong>
                      {penalty.offence_code && (
                        <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem', fontWeight: 'normal' }}>
                          Offence Code: {penalty.offence_code}
                        </div>
                      )}
                    </div>
                    {penalty.offence_nature && (
                      <div className="card-section-content" style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6c757d', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                        {penalty.offence_nature}
                      </div>
                    )}
                    <div className="penalty-amount">
                      {penalty.penalty_amount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e9ecef' }}>
                      {penalty.date_issued && (
                        <div>Issued: {formatDate(penalty.date_issued)}</div>
                      )}
                      {penalty.issued_by && (
                        <div style={{ marginTop: '0.25rem' }}>By: {penalty.issued_by}</div>
                      )}
                      {penalty.party_served && (
                        <div style={{ marginTop: '0.25rem' }}>Party: {penalty.party_served}</div>
                      )}
                      {isProsecution && penalty.prosecution?.court && (
                        <div style={{ marginTop: '0.25rem' }}>Court: {penalty.prosecution.court}</div>
                      )}
                      {getCanonicalUrl(penalty) && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <a
                            href={getCanonicalUrl(penalty)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#667eea',
                              textDecoration: 'none',
                              fontSize: '0.8125rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.textDecoration = 'none'
                            }}
                          >
                            View on NSW Food Authority
                            <span style={{ fontSize: '0.7rem' }}>↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PenaltyCard
