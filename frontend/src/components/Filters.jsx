import RangeSlider from './RangeSlider'

function Filters({ filters, setFilters, councils, offenceOptions, dateRange, penaltyRange, totalPenaltyRange, offenceCountRange }) {
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Loading...'
    return new Date(timestamp).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
  }

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatCount = (count) => count.toString()

  if (dateRange[0] === 0 && dateRange[1] === 0) {
    return <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>Loading filters...</div>
  }

  const handleOffenceChange = (codes) => {
    const current = filters.offenceCodes || []
    const allSelected = codes.every(code => current.includes(code))
    const updated = allSelected
      ? current.filter(c => !codes.includes(c))
      : [...new Set([...current, ...codes])]
    setFilters({ ...filters, offenceCodes: updated })
  }

  const handleCouncilChange = (council) => {
    const current = filters.councils || []
    const updated = current.includes(council)
      ? current.filter(c => c !== council)
      : [...current, council]
    setFilters({ ...filters, councils: updated })
  }

  const handleTextFilterChange = (value) => {
    setFilters({ ...filters, textFilter: value })
  }

  return (
    <div className="filters">
      <div className="filter-group">
            <label>Text Search (Regex)</label>
            <input
              type="text"
              className="text-filter-input"
              placeholder="Search name, offence, party served... (regex supported)"
              value={filters.textFilter || ''}
              onChange={(e) => handleTextFilterChange(e.target.value)}
            />
            <div className="text-filter-hint">
              Matches: name, offence description, offence nature, party served
            </div>
          </div>
          <div className="filter-group">
        <label>Notice Type</label>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="penaltyType"
              value="all"
              checked={filters.penaltyType === 'all'}
              onChange={(e) => setFilters({ ...filters, penaltyType: e.target.value })}
            />
            <span>All</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="penaltyType"
              value="prosecution"
              checked={filters.penaltyType === 'prosecution'}
              onChange={(e) => setFilters({ ...filters, penaltyType: e.target.value })}
            />
            <span>Prosecutions Only</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="penaltyType"
              value="penalty"
              checked={filters.penaltyType === 'penalty'}
              onChange={(e) => setFilters({ ...filters, penaltyType: e.target.value })}
            />
            <span>Penalties Only</span>
          </label>
        </div>
      </div>
      <div className="filter-group">
        <label>Date Range</label>
        <RangeSlider
          min={dateRange[0]}
          max={dateRange[1]}
          value={filters.dateRange}
          onChange={(range) => setFilters({ ...filters, dateRange: range })}
          formatValue={formatDate}
        />
      </div>

      <div className="filter-group">
        <label>Individual Notice Amount</label>
        <RangeSlider
          min={penaltyRange[0]}
          max={penaltyRange[1]}
          value={filters.penaltyAmount}
          onChange={(range) => setFilters({ ...filters, penaltyAmount: range })}
          formatValue={formatCurrency}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', color: '#6c757d' }}>Min:</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{ paddingRight: '0.25rem', fontSize: '0.875rem', color: '#6c757d' }}>$</span>
              <input
                type="number"
                value={filters.penaltyAmount[0]}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue) && numValue >= 0) {
                    const [min, max] = filters.penaltyAmount
                    const newMin = Math.max(penaltyRange[0], Math.min(numValue, max - 1))
                    setFilters({ ...filters, penaltyAmount: [newMin, max] })
                  }
                }}
                min={penaltyRange[0]}
                max={filters.penaltyAmount[1] - 1}
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', color: '#6c757d' }}>Max:</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{ paddingRight: '0.25rem', fontSize: '0.875rem', color: '#6c757d' }}>$</span>
              <input
                type="number"
                value={filters.penaltyAmount[1]}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue) && numValue >= 0) {
                    const [min, max] = filters.penaltyAmount
                    const newMax = Math.min(penaltyRange[1], Math.max(numValue, min + 1))
                    setFilters({ ...filters, penaltyAmount: [min, newMax] })
                  }
                }}
                min={filters.penaltyAmount[0] + 1}
                max={penaltyRange[1]}
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="filter-group">
        <label>Cumulative Notice Amount</label>
        <RangeSlider
          min={totalPenaltyRange[0]}
          max={totalPenaltyRange[1]}
          value={filters.totalPenaltyAmount}
          onChange={(range) => setFilters({ ...filters, totalPenaltyAmount: range })}
          formatValue={formatCurrency}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', color: '#6c757d' }}>Min:</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{ paddingRight: '0.25rem', fontSize: '0.875rem', color: '#6c757d' }}>$</span>
              <input
                type="number"
                value={filters.totalPenaltyAmount[0]}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue) && numValue >= 0) {
                    const [min, max] = filters.totalPenaltyAmount
                    const newMin = Math.max(totalPenaltyRange[0], Math.min(numValue, max - 1))
                    setFilters({ ...filters, totalPenaltyAmount: [newMin, max] })
                  }
                }}
                min={totalPenaltyRange[0]}
                max={filters.totalPenaltyAmount[1] - 1}
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', color: '#6c757d' }}>Max:</label>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <span style={{ paddingRight: '0.25rem', fontSize: '0.875rem', color: '#6c757d' }}>$</span>
              <input
                type="number"
                value={filters.totalPenaltyAmount[1]}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value)
                  if (!isNaN(numValue) && numValue >= 0) {
                    const [min, max] = filters.totalPenaltyAmount
                    const newMax = Math.min(totalPenaltyRange[1], Math.max(numValue, min + 1))
                    setFilters({ ...filters, totalPenaltyAmount: [min, newMax] })
                  }
                }}
                min={filters.totalPenaltyAmount[0] + 1}
                max={totalPenaltyRange[1]}
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="filter-group">
        <label>Number of Offences</label>
        <RangeSlider
          min={offenceCountRange[0]}
          max={offenceCountRange[1]}
          value={filters.offenceCount}
          onChange={(range) => setFilters({ ...filters, offenceCount: range })}
          formatValue={formatCount}
        />
      </div>

      <div className="filter-group">
        <label>Offence Type</label>
        <div className="multiselect-container">
          {offenceOptions.map(({ codes, description }) => {
            const allSelected = codes.every(code => (filters.offenceCodes || []).includes(code))
            return (
              <label key={description} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => handleOffenceChange(codes)}
                />
                <span>{description}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="filter-group">
        <label>Council</label>
        <div className="multiselect-container">
          {councils.map(council => (
            <label key={council} className="multiselect-option">
              <input
                type="checkbox"
                checked={(filters.councils || []).includes(council)}
                onChange={() => handleCouncilChange(council)}
              />
              <span>{council}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Filters
