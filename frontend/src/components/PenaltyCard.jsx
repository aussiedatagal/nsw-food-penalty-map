import { useMemo } from 'react'
import { OFFENCE_CODES } from '../utils'

function PenaltyCard({ location, locationGroup, selectedShopIndex, onShopChange, onClose }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalPenaltyAmount = useMemo(() => {
    return location.penalties.reduce((sum, penalty) => {
      const amount = parseFloat(penalty.penalty_amount.replace(/[^0-9.]/g, '')) || 0
      return sum + amount
    }, 0)
  }, [location.penalties])

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const hasMultipleShops = locationGroup && locationGroup.shops && locationGroup.shops.length > 1

  return (
    <div className="penalty-card">
      <div className="card-header">
        <div>
          <div className="card-title">{location.name}</div>
          <div className="card-section-content" style={{ fontSize: '0.8125rem', color: '#6c757d' }}>
            {location.address}
          </div>
          {hasMultipleShops && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e9ecef' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {locationGroup.shops.length} Shops at This Location
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {locationGroup.shops.map((shop, idx) => (
                  <button
                    key={idx}
                    onClick={() => onShopChange(idx)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: selectedShopIndex === idx ? '2px solid #667eea' : '1px solid #dee2e6',
                      borderRadius: '6px',
                      background: selectedShopIndex === idx ? '#f0f4ff' : 'white',
                      color: selectedShopIndex === idx ? '#667eea' : '#212529',
                      fontSize: '0.8125rem',
                      fontWeight: selectedShopIndex === idx ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '200px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedShopIndex !== idx) {
                        e.target.style.background = '#f8f9fa'
                        e.target.style.borderColor = '#adb5bd'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedShopIndex !== idx) {
                        e.target.style.background = 'white'
                        e.target.style.borderColor = '#dee2e6'
                      }
                    }}
                  >
                    {shop.name}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                      ({shop.penalties.length})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
            Penalties ({location.penalties.length})
          </div>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.25rem' }}>Total Penalty Amount</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc3545' }}>
              {formatCurrency(totalPenaltyAmount)}
            </div>
          </div>
          <div className="penalty-list">
            {location.penalties
              .sort((a, b) => new Date(b.date_of_offence) - new Date(a.date_of_offence))
              .map((penalty, idx) => (
                <div key={idx} className="penalty-item">
                  <div className="penalty-date">
                    {formatDate(penalty.date_of_offence)}
                  </div>
                  <div className="card-section-content">
                    <strong>{(OFFENCE_CODES[penalty.offence_code] || penalty.offence_description || '').replace(/\s*-\s*(Individual|Corporation)$/i, '')}</strong>
                  </div>
                  {penalty.offence_nature && (
                    <div className="card-section-content" style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6c757d', lineHeight: '1.5' }}>
                      {penalty.offence_nature}
                    </div>
                  )}
                  <div className="penalty-amount">
                    {penalty.penalty_amount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e9ecef' }}>
                    <div>Issued: {formatDate(penalty.date_issued)}</div>
                    <div style={{ marginTop: '0.25rem' }}>By: {penalty.issued_by}</div>
                    {penalty.party_served && (
                      <div style={{ marginTop: '0.25rem' }}>Party: {penalty.party_served}</div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PenaltyCard
