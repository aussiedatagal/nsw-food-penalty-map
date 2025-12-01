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

  const parseCurrency = (str) => {
    const cleaned = str.replace(/[$,]/g, '')
    return parseFloat(cleaned)
  }

  const parseDate = (str) => {
    if (!str || str === 'Loading...') return null
    const date = new Date(str)
    return isNaN(date.getTime()) ? null : date.getTime()
  }

  const parseCount = (str) => {
    return parseInt(str, 10)
  }

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

  const handleSelectAllOffences = () => {
    const allCodes = new Set()
    offenceOptions.forEach(opt => {
      opt.codes.forEach(code => allCodes.add(code))
    })
    setFilters({ ...filters, offenceCodes: Array.from(allCodes) })
  }

  const handleSelectNoneOffences = () => {
    setFilters({ ...filters, offenceCodes: [] })
  }

  const handleSelectAllCouncils = () => {
    setFilters({ ...filters, councils: [...councils] })
  }

  const handleSelectNoneCouncils = () => {
    setFilters({ ...filters, councils: [] })
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
          parseValue={parseCurrency}
          editable={true}
        />
      </div>

      <div className="filter-group">
        <label>Cumulative Notice Amount</label>
        <RangeSlider
          min={totalPenaltyRange[0]}
          max={totalPenaltyRange[1]}
          value={filters.totalPenaltyAmount}
          onChange={(range) => setFilters({ ...filters, totalPenaltyAmount: range })}
          formatValue={formatCurrency}
          parseValue={parseCurrency}
          editable={true}
        />
      </div>

      <div className="filter-group">
        <label>Number of Offences</label>
        <RangeSlider
          min={offenceCountRange[0]}
          max={offenceCountRange[1]}
          value={filters.offenceCount}
          onChange={(range) => setFilters({ ...filters, offenceCount: range })}
          formatValue={formatCount}
          parseValue={parseCount}
          editable={true}
        />
      </div>

      <div className="filter-group">
        <div className="filter-group-header">
          <label>Offence Type</label>
          <div className="multiselect-actions">
            <button 
              type="button"
              className="multiselect-action-btn"
              onClick={handleSelectAllOffences}
            >
              All
            </button>
            <button 
              type="button"
              className="multiselect-action-btn"
              onClick={handleSelectNoneOffences}
            >
              None
            </button>
          </div>
        </div>
        <div className="multiselect-container">
          {offenceOptions.map(({ codes, description }) => {
            const allSelected = codes.every(code => (filters.offenceCodes || []).includes(code))
            const codesDisplay = codes.length > 1 ? codes.join(', ') : codes[0]
            return (
              <label key={description} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => handleOffenceChange(codes)}
                />
                <span>
                  {description}
                  <span style={{ fontSize: '0.875rem', color: '#6c757d', marginLeft: '0.5rem' }}>
                    ({codesDisplay})
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-group-header">
          <label>Council</label>
          <div className="multiselect-actions">
            <button 
              type="button"
              className="multiselect-action-btn"
              onClick={handleSelectAllCouncils}
            >
              All
            </button>
            <button 
              type="button"
              className="multiselect-action-btn"
              onClick={handleSelectNoneCouncils}
            >
              None
            </button>
          </div>
        </div>
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
