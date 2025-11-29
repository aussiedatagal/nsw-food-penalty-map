import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import PenaltyCard from './components/PenaltyCard'
import Filters from './components/Filters'
import { OFFENCE_CODES, getMarkerColor, parsePenaltyAmount } from './utils'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function App() {
  const [groupedLocations, setGroupedLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [selectedShopIndex, setSelectedShopIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [defaultFilters, setDefaultFilters] = useState(null)
  const [filters, setFilters] = useState({
    dateRange: [0, 0],
    penaltyAmount: [0, 10000],
    totalPenaltyAmount: [0, 100000],
    offenceCount: [1, 100],
    offenceCodes: [],
    councils: [],
    textFilter: '',
    penaltyType: 'all' // 'all', 'prosecution', 'penalty'
  })

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}grouped_locations.json`)
      .then(res => res.json())
      .then(data => {
        const transformed = data.map(group => ({
          location: { lat: group.address.lat, lon: group.address.lon },
          name: group.name,
          address: group.address.full,
          council: group.council,
          party_served: group.party_served,
          penalties: group.penalties
        }))
        setGroupedLocations(transformed)
      })
      .catch(err => console.error('Error loading grouped locations:', err))
  }, [])

  const groupedByLocation = useMemo(() => {
    const groups = {}
    groupedLocations.forEach((group, idx) => {
      const key = `${group.location.lat.toFixed(4)},${group.location.lon.toFixed(4)}-${idx}`
      groups[key] = group
    })
    return groups
  }, [groupedLocations])

  const councils = useMemo(() => {
    const set = new Set()
    groupedLocations.forEach(group => {
      if (group.council) set.add(group.council)
      group.penalties.forEach(penalty => {
        if (penalty.council) set.add(penalty.council)
      })
    })
    return Array.from(set).sort()
  }, [groupedLocations])

  const dateRange = useMemo(() => {
    if (groupedLocations.length === 0) return [0, 0]
    const dates = []
    groupedLocations.forEach(group => {
      group.penalties.forEach(penalty => {
        if (penalty.date_of_offence) {
          dates.push(new Date(penalty.date_of_offence).getTime())
        }
      })
    })
    return dates.length > 0 ? [Math.min(...dates), Math.max(...dates)] : [0, 0]
  }, [groupedLocations])

  const penaltyRange = useMemo(() => {
    if (groupedLocations.length === 0) return [0, 10000]
    const amounts = []
    groupedLocations.forEach(group => {
      group.penalties.forEach(penalty => {
        const amount = parsePenaltyAmount(penalty.penalty_amount)
        amounts.push(amount)
      })
    })
    return amounts.length > 0 ? [Math.min(...amounts), Math.max(...amounts)] : [0, 10000]
  }, [groupedLocations])

  const totalPenaltyRange = useMemo(() => {
    if (Object.keys(groupedByLocation).length === 0) return [0, 100000]
    const totals = Object.values(groupedByLocation).map(group => {
      return group.penalties.reduce((sum, penalty) => {
        const amount = parsePenaltyAmount(penalty.penalty_amount)
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
    groupedLocations.forEach(group => {
      group.penalties.forEach(p => {
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
    })
    const options = Array.from(descriptionMap.entries())
      .map(([description, codes]) => ({ 
        code: codes[0],
        codes: codes,
        description 
      }))
      .sort((a, b) => a.description.localeCompare(b.description))
    
    console.log('Generated offence options from data:', {
      total: options.length,
      options: options.map(opt => ({ description: opt.description, codes: opt.codes }))
    })
    return options
  }, [groupedLocations])

  const allOffenceCodesInData = useMemo(() => {
    const allCodes = new Set()
    offenceOptionsFromData.forEach(opt => {
      opt.codes.forEach(code => allCodes.add(code))
    })
    return Array.from(allCodes)
  }, [offenceOptionsFromData])

  useEffect(() => {
    if (groupedLocations.length > 0 && dateRange[0] !== 0 && dateRange[1] !== 0) {
      setFilters(prev => {
        if (prev.dateRange[0] === 0 && prev.dateRange[1] === 0) {
          const newFilters = {
            ...prev,
            dateRange: dateRange,
            penaltyAmount: penaltyRange,
            totalPenaltyAmount: totalPenaltyRange,
            offenceCount: offenceCountRange,
            offenceCodes: allOffenceCodesInData,
            councils: councils
          }
          // Set defaults when filters are first initialized
          if (!defaultFilters) {
          setDefaultFilters({
            dateRange: dateRange,
            penaltyAmount: penaltyRange,
            totalPenaltyAmount: totalPenaltyRange,
            offenceCount: offenceCountRange,
            offenceCodes: allOffenceCodesInData,
            councils: councils,
            textFilter: '',
            penaltyType: 'all'
          })
        }
        return newFilters
        }
        return prev
      })
    }
  }, [groupedLocations, dateRange, penaltyRange, totalPenaltyRange, offenceCountRange, councils, allOffenceCodesInData, defaultFilters])

  const filteredLocations = useMemo(() => {
    const totalLocations = Object.values(groupedByLocation).length
    console.log('Filtering locations:', {
      totalLocations,
      filters: {
        dateRange: filters.dateRange.map(d => d === 0 ? 0 : new Date(d).toISOString()),
        penaltyAmount: filters.penaltyAmount,
        totalPenaltyAmount: filters.totalPenaltyAmount,
        offenceCount: filters.offenceCount,
        offenceCodesCount: filters.offenceCodes.length,
        councilsCount: filters.councils.length,
        textFilter: filters.textFilter
      }
    })

    if (filters.dateRange[0] === 0 && filters.dateRange[1] === 0) {
      return Object.values(groupedByLocation)
    }

    const matchesTextFilter = (text) => {
      if (!filters.textFilter || filters.textFilter.trim() === '') return true
      try {
        const regex = new RegExp(filters.textFilter, 'i')
        return regex.test(text || '')
      } catch (e) {
        return (text || '').toLowerCase().includes(filters.textFilter.toLowerCase())
      }
    }

    const stats = {
      total: totalLocations,
      filteredByOffenceCount: 0,
      filteredByDate: 0,
      filteredByIndividualAmount: 0,
      filteredByTotalAmount: 0,
      filteredByCode: 0,
      filteredByCouncil: 0,
      filteredByText: 0,
      passed: 0
    }

    const filtered = Object.values(groupedByLocation).filter(group => {
      if (filters.textFilter && filters.textFilter.trim() !== '') {
        const matchesName = matchesTextFilter(group.name)
        const matchesPartyServed = matchesTextFilter(group.party_served)
        const matchesAnyPenalty = group.penalties.some(penalty => 
          matchesTextFilter(penalty.offence_description) || 
          matchesTextFilter(penalty.offence_nature)
        )
        
        if (!matchesName && !matchesPartyServed && !matchesAnyPenalty) {
          stats.filteredByText++
          return false
        }
      }

      const offenceCount = group.penalties.length
      const matchesOffenceCount = offenceCount >= filters.offenceCount[0] && offenceCount <= filters.offenceCount[1]
      
      if (!matchesOffenceCount) {
        stats.filteredByOffenceCount++
        return false
      }

      const totalAmount = group.penalties.reduce((sum, penalty) => {
        const amount = parsePenaltyAmount(penalty.penalty_amount)
        return sum + amount
      }, 0)
      const matchesTotalAmount = totalAmount >= filters.totalPenaltyAmount[0] && totalAmount <= filters.totalPenaltyAmount[1]
      
      if (!matchesTotalAmount) {
        stats.filteredByTotalAmount++
        return false
      }

      const hasMatchingPenalty = group.penalties.some(penalty => {
        if (filters.penaltyType === 'prosecution') {
          const isProsecution = penalty.type === 'prosecution' || !!penalty.prosecution
          if (!isProsecution) {
            return false
          }
        } else if (filters.penaltyType === 'penalty') {
          const isProsecution = penalty.type === 'prosecution' || !!penalty.prosecution
          if (isProsecution) {
            return false
          }
        }
        
        const dateToUse = penalty.date_of_offence || penalty.date_issued
        const date = dateToUse ? new Date(dateToUse).getTime() : null
        const amount = parsePenaltyAmount(penalty.penalty_amount)
        const matchesDate = !date || isNaN(date)
          ? (filters.dateRange[0] === 0 && filters.dateRange[1] === 0)
          : (date >= filters.dateRange[0] && date <= filters.dateRange[1])
        const matchesAmount = amount >= filters.penaltyAmount[0] && amount <= filters.penaltyAmount[1]
        const allCodesSelected = defaultFilters && 
          defaultFilters.offenceCodes.length > 0 &&
          filters.offenceCodes.length === defaultFilters.offenceCodes.length &&
          defaultFilters.offenceCodes.every(code => filters.offenceCodes.includes(code))
        const matchesCode = penalty.offence_code === null
          ? allCodesSelected
          : (filters.offenceCodes.length === 0 || filters.offenceCodes.includes(penalty.offence_code))
        const allCouncilsSelected = defaultFilters && 
          defaultFilters.councils.length > 0 &&
          filters.councils.length === defaultFilters.councils.length &&
          defaultFilters.councils.every(council => filters.councils.includes(council))
        const matchesCouncil = penalty.council === null || penalty.council === undefined
          ? allCouncilsSelected
          : (filters.councils.length === 0 || filters.councils.includes(penalty.council))
        
        return matchesDate && matchesAmount && matchesCode && matchesCouncil
      })

      if (!hasMatchingPenalty) {
        const samplePenalty = group.penalties[0]
        const date = new Date(samplePenalty.date_of_offence).getTime()
        const amount = parsePenaltyAmount(samplePenalty.penalty_amount)
        if (date < filters.dateRange[0] || date > filters.dateRange[1]) stats.filteredByDate++
        else if (amount < filters.penaltyAmount[0] || amount > filters.penaltyAmount[1]) stats.filteredByIndividualAmount++
        else if (filters.offenceCodes.length > 0 && !filters.offenceCodes.includes(samplePenalty.offence_code)) stats.filteredByCode++
        else if (filters.councils.length > 0 && !filters.councils.includes(samplePenalty.council)) stats.filteredByCouncil++
      } else {
        stats.passed++
      }
      
      return hasMatchingPenalty
    })

    console.log('Filter results:', {
      ...stats,
      finalCount: filtered.length,
      filteredOut: stats.total - filtered.length
    })

    return filtered
  }, [groupedByLocation, filters, defaultFilters])

  const locationsByCoordinates = useMemo(() => {
    const coordMap = new Map()
    
    filteredLocations.forEach(group => {
      const key = `${group.location.lat.toFixed(6)},${group.location.lon.toFixed(6)}`
      
      if (!coordMap.has(key)) {
        coordMap.set(key, {
          location: group.location,
          address: group.address,
          council: group.council,
          shops: []
        })
      }
      
      coordMap.get(key).shops.push(group)
    })
    
    return Array.from(coordMap.values())
  }, [filteredLocations])

  const [infoExpanded, setInfoExpanded] = useState(true)

  const hasActiveFilters = useMemo(() => {
    if (!defaultFilters) return false
    
    if (filters.textFilter && filters.textFilter.trim() !== '') return true
    if (filters.offenceCodes.length !== defaultFilters.offenceCodes.length) return true
    if (filters.councils.length !== defaultFilters.councils.length) return true
    if (filters.dateRange[0] !== defaultFilters.dateRange[0] || 
        filters.dateRange[1] !== defaultFilters.dateRange[1]) return true
    if (filters.penaltyAmount[0] !== defaultFilters.penaltyAmount[0] || 
        filters.penaltyAmount[1] !== defaultFilters.penaltyAmount[1]) return true
    if (filters.totalPenaltyAmount[0] !== defaultFilters.totalPenaltyAmount[0] || 
        filters.totalPenaltyAmount[1] !== defaultFilters.totalPenaltyAmount[1]) return true
    if (filters.offenceCount[0] !== defaultFilters.offenceCount[0] || 
        filters.offenceCount[1] !== defaultFilters.offenceCount[1]) return true
    if (filters.penaltyType !== defaultFilters.penaltyType) return true
    
    return false
  }, [filters, defaultFilters])

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>NSW Food Penalty Notices</h1>
            <div className="header-byline">
              by <a href="https://aussiedatagal.github.io/" target="_blank" rel="noopener noreferrer">Aussie Data Gal</a>
              {' • '}
              Data source: <a href="https://www.foodauthority.nsw.gov.au/offences" target="_blank" rel="noopener noreferrer">
                NSW Food Authority
              </a>
            </div>
          </div>
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
             The NSW Food Authority publishes lists of businesses that have breached or are alleged to have breached NSW food safety laws.
              Publishing the lists gives consumers more information to make decisions about where they eat or buy food.
             Each marker represents a food business issued a penalty notice for violating food safety standards. 
            </p>
          </div>
        )}
      </div>
      <div className="main-content">
        <button 
          className={`sidebar-toggle ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '✕' : '☰ Filters'}
          {hasActiveFilters && <span className="filter-indicator" aria-label="Filters active"></span>}
        </button>
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div>
              <h2>Filters</h2>
              <div className="count">
                {locationsByCoordinates.length} location{locationsByCoordinates.length !== 1 ? 's' : ''} found
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
            center={[-33.8688, 150.9]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Created by <a href="https://aussiedatagal.github.io/" target="_blank" rel="noopener noreferrer">Aussie Data Gal</a>'
            />
            {locationsByCoordinates.map((locationGroup, idx) => {
              const totalPenalties = locationGroup.shops.reduce((sum, shop) => sum + shop.penalties.length, 0)
              
              return (
                <Marker
                  key={idx}
                  position={[locationGroup.location.lat, locationGroup.location.lon]}
                  icon={L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="
                      background-color: ${getMarkerColor(totalPenalties)};
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
                      setSelectedLocation(locationGroup)
                      setSelectedShopIndex(0)
                      setSidebarOpen(false)
                    }
                  }}
                />
              )
            })}
          </MapContainer>
        </div>
        {selectedLocation && (
          <>
            <div className="card-overlay" onClick={() => {
              setSelectedLocation(null)
              setSelectedShopIndex(0)
            }} />
            <PenaltyCard
              location={selectedLocation.shops[selectedShopIndex]}
              locationGroup={selectedLocation}
              selectedShopIndex={selectedShopIndex}
              onShopChange={setSelectedShopIndex}
              onClose={() => {
                setSelectedLocation(null)
                setSelectedShopIndex(0)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default App
