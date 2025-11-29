import { useState } from 'react'
import { getBadgeColor } from '../utils'

function ResultsList({ locations, onSelect }) {
  const [collapsed, setCollapsed] = useState(true)

  if (locations.length === 0) {
    return (
      <div className="results-panel collapsed">
        <div className="results-header" onClick={() => setCollapsed(!collapsed)}>
          <h3>No results found</h3>
          <span className="results-toggle">{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`results-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="results-header" onClick={() => setCollapsed(!collapsed)}>
        <div>
          <h3>Results</h3>
          <span className="results-count">
            {locations.length} location{locations.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="results-toggle">{collapsed ? '▼' : '▲'}</span>
      </div>
      {!collapsed && (
        <div className="results-list">
          {locations
            .sort((a, b) => b.penalties.length - a.penalties.length)
            .map((location, idx) => {
              const badge = getBadgeColor(location.penalties.length)
              const prosecutionCount = location.penalties.filter(p => p.type === 'prosecution' || !!p.prosecution).length
              return (
                <div
                  key={idx}
                  className="result-item"
                  onClick={() => onSelect(location)}
                >
                  <div className="result-name">{location.name}</div>
                  <div className="result-details">{location.address}</div>
                  <span
                    className="result-badge"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {location.penalties.length} penalty{location.penalties.length !== 1 ? 'ies' : 'y'}
                    {prosecutionCount > 0 && (
                      <span style={{ marginLeft: '0.35rem', fontSize: '0.7rem', opacity: 0.9 }}>
                        ({prosecutionCount} prosecution{prosecutionCount !== 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default ResultsList
