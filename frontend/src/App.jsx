import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import PenaltyCard from './components/PenaltyCard'
import Filters from './components/Filters'
import { OFFENCE_CODES, getMarkerColor } from './utils'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function App() {
  const [penalties, setPenalties] = useState({})
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: [0, 0],
    penaltyAmount: [0, 10000],
    totalPenaltyAmount: [0, 100000],
    offenceCount: [1, 100],
    offenceCodes: [],
    councils: []
  })

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}penalty_notices.json`)
      .then(res => res.json())
      .then(data => setPenalties(data))
      .catch(err => console.error('Error loading penalty notices:', err))
  }, [])

  const groupedByLocation = useMemo(() => {
    const groups = {}
    Object.values(penalties).forEach(penalty => {
      if (!penalty.address?.lat || !penalty.address?.lon) return
      
      const key = `${penalty.address.lat.toFixed(4)},${penalty.address.lon.toFixed(4)}`
      if (!groups[key]) {
        groups[key] = {
          location: { lat: penalty.address.lat, lon: penalty.address.lon },
          name: penalty.name,
          address: penalty.address.full,
          council: penalty.council,
          penalties: []
        }
      }
      groups[key].penalties.push(penalty)
    })
    return groups
  }, [penalties])

  const councils = useMemo(() => {
    const set = new Set()
    Object.values(penalties).forEach(p => p.council && set.add(p.council))
    return Array.from(set).sort()
  }, [penalties])

  const dateRange = useMemo(() => {
    if (Object.keys(penalties).length === 0) return [0, 0]
    const dates = Object.values(penalties).map(p => new Date(p.date_of_offence).getTime())
    return [Math.min(...dates), Math.max(...dates)]
  }, [penalties])

  const penaltyRange = useMemo(() => {
    if (Object.keys(penalties).length === 0) return [0, 10000]
    const amounts = Object.values(penalties)
      .map(p => parseFloat(p.penalty_amount.replace(/[^0-9.]/g, '')) || 0)
    return [Math.min(...amounts), Math.max(...amounts)]
  }, [penalties])

  const totalPenaltyRange = useMemo(() => {
    if (Object.keys(groupedByLocation).length === 0) return [0, 100000]
    const totals = Object.values(groupedByLocation).map(group => {
      return group.penalties.reduce((sum, penalty) => {
        const amount = parseFloat(penalty.penalty_amount.replace(/[^0-9.]/g, '')) || 0
        return sum + amount
      }, 0)
    })
    return [Math.min(...totals), Math.max(...totals)]
  }, [groupedByLocation])

  const offenceCountRange = useMemo(() => {
    if (Object.keys(groupedByLocation).length === 0) return [1, 1]
    const counts = Object.values(groupedByLocation).map(group => group.penalties.length)
    return [Math.min(...counts), Math.max(...counts)]
  }, [groupedByLocation])

  const offenceOptionsFromData = useMemo(() => {
    const descriptionMap = new Map()
    Object.values(penalties).forEach(p => {
      if (p.offence_code && p.offence_description) {
        let description = p.offence_description.trim()
        description = description.replace(/\s*-\s*(Individual|Corporation)$/i, '').trim()
        
        if (!descriptionMap.has(description)) {
          descriptionMap.set(description, [])
        }
        if (!descriptionMap.get(description).includes(p.offence_code)) {
          descriptionMap.get(description).push(p.offence_code)
        }
      }
    })
    const options = Array.from(descriptionMap.entries())
      .map(([description, codes]) => ({ 
        code: codes[0],
        codes: codes,
        description 
      }))
      .sort((a, b) => a.description.localeCompare(b.description))
    
    console.log('📋 Generated offence options from data:', {
      total: options.length,
      options: options.map(opt => ({ description: opt.description, codes: opt.codes }))
    })
    return options
  }, [penalties])

  const allOffenceCodesInData = useMemo(() => {
    const allCodes = new Set()
    offenceOptionsFromData.forEach(opt => {
      opt.codes.forEach(code => allCodes.add(code))
    })
    return Array.from(allCodes)
  }, [offenceOptionsFromData])

  useEffect(() => {
    if (Object.keys(penalties).length > 0 && dateRange[0] !== 0 && dateRange[1] !== 0) {
      setFilters(prev => {
        if (prev.dateRange[0] === 0 && prev.dateRange[1] === 0) {
          return {
            ...prev,
            dateRange: dateRange,
            penaltyAmount: penaltyRange,
            totalPenaltyAmount: totalPenaltyRange,
            offenceCount: offenceCountRange,
            offenceCodes: allOffenceCodesInData,
            councils: councils
          }
        }
        return prev
      })
    }
  }, [penalties, dateRange, penaltyRange, totalPenaltyRange, offenceCountRange, councils, allOffenceCodesInData])

  const filteredLocations = useMemo(() => {
    const totalLocations = Object.values(groupedByLocation).length
    console.log('🔍 Filtering locations:', {
      totalLocations,
      filters: {
        dateRange: filters.dateRange.map(d => d === 0 ? 0 : new Date(d).toISOString()),
        penaltyAmount: filters.penaltyAmount,
        totalPenaltyAmount: filters.totalPenaltyAmount,
        offenceCount: filters.offenceCount,
        offenceCodesCount: filters.offenceCodes.length,
        councilsCount: filters.councils.length
      }
    })

    if (filters.dateRange[0] === 0 && filters.dateRange[1] === 0) {
      console.log('✅ No date filter - returning all locations')
      return Object.values(groupedByLocation)
    }

    const stats = {
      total: totalLocations,
      filteredByOffenceCount: 0,
      filteredByDate: 0,
      filteredByIndividualAmount: 0,
      filteredByTotalAmount: 0,
      filteredByCode: 0,
      filteredByCouncil: 0,
      passed: 0
    }

    const filtered = Object.values(groupedByLocation).filter(group => {
      const offenceCount = group.penalties.length
      const matchesOffenceCount = offenceCount >= filters.offenceCount[0] && offenceCount <= filters.offenceCount[1]
      
      if (!matchesOffenceCount) {
        stats.filteredByOffenceCount++
        return false
      }

      const totalAmount = group.penalties.reduce((sum, penalty) => {
        const amount = parseFloat(penalty.penalty_amount.replace(/[^0-9.]/g, '')) || 0
        return sum + amount
      }, 0)
      const matchesTotalAmount = totalAmount >= filters.totalPenaltyAmount[0] && totalAmount <= filters.totalPenaltyAmount[1]
      
      if (!matchesTotalAmount) {
        stats.filteredByTotalAmount++
        return false
      }

      const hasMatchingPenalty = group.penalties.some(penalty => {
        const date = new Date(penalty.date_of_offence).getTime()
        const amount = parseFloat(penalty.penalty_amount.replace(/[^0-9.]/g, '')) || 0
        const matchesDate = date >= filters.dateRange[0] && date <= filters.dateRange[1]
        const matchesAmount = amount >= filters.penaltyAmount[0] && amount <= filters.penaltyAmount[1]
        const matchesCode = filters.offenceCodes.length === 0 || filters.offenceCodes.includes(penalty.offence_code)
        const matchesCouncil = filters.councils.length === 0 || filters.councils.includes(penalty.council)
        
        return matchesDate && matchesAmount && matchesCode && matchesCouncil
      })

      if (!hasMatchingPenalty) {
        const samplePenalty = group.penalties[0]
        const date = new Date(samplePenalty.date_of_offence).getTime()
        const amount = parseFloat(samplePenalty.penalty_amount.replace(/[^0-9.]/g, '')) || 0
        if (date < filters.dateRange[0] || date > filters.dateRange[1]) stats.filteredByDate++
        else if (amount < filters.penaltyAmount[0] || amount > filters.penaltyAmount[1]) stats.filteredByIndividualAmount++
        else if (filters.offenceCodes.length > 0 && !filters.offenceCodes.includes(samplePenalty.offence_code)) stats.filteredByCode++
        else if (filters.councils.length > 0 && !filters.councils.includes(samplePenalty.council)) stats.filteredByCouncil++
      } else {
        stats.passed++
      }
      
      return hasMatchingPenalty
    })

    console.log('📊 Filter results:', {
      ...stats,
      finalCount: filtered.length,
      filteredOut: stats.total - filtered.length
    })

    return filtered
  }, [groupedByLocation, filters])

  const [infoExpanded, setInfoExpanded] = useState(true)

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <h1>NSW Food Penalty Notices</h1>
          <button 
            className="info-toggle"
            onClick={() => setInfoExpanded(!infoExpanded)}
            aria-label="Toggle information"
          >
            {infoExpanded ? '−' : '+'}
          </button>
        </div>
        {infoExpanded && (
          <div className="header-info">
            <p>
              Each marker represents a food business issued a penalty notice for violating food safety standards. 
              The data shows where regulatory action has been taken across New South Wales.
            </p>
            <p>
              <strong>Data source:</strong>{' '}
              <a href="https://www.foodauthority.nsw.gov.au/offences" target="_blank" rel="noopener noreferrer">
                NSW Food Authority
              </a>
            </p>
          </div>
        )}
      </div>
      <div className="main-content">
        <button 
          className="mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '✕' : '☰ Filters'}
        </button>
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div>
              <h2>Filters</h2>
              <div className="count">
                {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
              </div>
            </div>
            <button 
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close filters"
            >
              ×
            </button>
          </div>
          <div className="sidebar-content">
            <Filters
              filters={filters}
              setFilters={setFilters}
              councils={councils}
              offenceOptions={offenceOptionsFromData}
              dateRange={dateRange}
              penaltyRange={penaltyRange}
              totalPenaltyRange={totalPenaltyRange}
              offenceCountRange={offenceCountRange}
            />
          </div>
        </div>
        <div className="map-container">
          <div className="map-legend">
            <div className="legend-title">Number of Offences</div>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-marker" style={{ backgroundColor: '#ff9800' }}></div>
                <span>1</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker" style={{ backgroundColor: '#fbc02d' }}></div>
                <span>2</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker" style={{ backgroundColor: '#f57c00' }}></div>
                <span>3-4</span>
              </div>
              <div className="legend-item">
                <div className="legend-marker" style={{ backgroundColor: '#d32f2f' }}></div>
                <span>5+</span>
              </div>
            </div>
          </div>
          <MapContainer
            center={[-33.8688, 151.2093]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {filteredLocations.map((group, idx) => (
              <Marker
                key={idx}
                position={[group.location.lat, group.location.lon]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="
                    background-color: ${getMarkerColor(group.penalties.length)};
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    cursor: pointer;
                    transition: transform 0.2s;
                  "></div>`,
                  iconSize: [22, 22],
                  iconAnchor: [11, 11]
                })}
                eventHandlers={{
                  click: () => {
                    setSelectedLocation(group)
                    setSidebarOpen(false)
                  }
                }}
              >
                <Popup>
                  <div style={{ padding: '0.5rem' }}>
                    <strong>{group.name}</strong><br />
                    <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                      {group.penalties.length} penalty{group.penalties.length !== 1 ? 'ies' : 'y'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        {selectedLocation && (
          <>
            <div className="card-overlay" onClick={() => setSelectedLocation(null)} />
            <PenaltyCard
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default App
