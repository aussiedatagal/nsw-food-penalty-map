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

  return (
    <div className="filters">
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
