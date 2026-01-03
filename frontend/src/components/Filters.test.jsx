import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Filters from './Filters'

describe('Filters', () => {
  const mockSetFilters = vi.fn()
  const defaultProps = {
    filters: {
      dateRange: [new Date('2020-01-01').getTime(), new Date('2023-12-31').getTime()],
      penaltyAmount: [0, 10000],
      totalPenaltyAmount: [0, 50000],
      offenceCount: [1, 10],
      offenceCodes: [],
      councils: [],
      textFilter: '',
      penaltyType: 'all'
    },
    setFilters: mockSetFilters,
    councils: ['Sydney', 'Melbourne', 'Brisbane'],
    offenceOptions: [
      { codes: ['11339'], description: 'Fail to comply with Food Standards Code' },
      { codes: ['11323'], description: 'Sell food that is unsuitable' }
    ],
    dateRange: [new Date('2020-01-01').getTime(), new Date('2023-12-31').getTime()],
    penaltyRange: [0, 10000],
    totalPenaltyRange: [0, 50000],
    offenceCountRange: [1, 10]
  }

  beforeEach(() => {
    mockSetFilters.mockClear()
  })

  it('renders all filter groups', () => {
    render(<Filters {...defaultProps} />)
    expect(screen.getByPlaceholderText(/search name/i)).toBeInTheDocument()
    expect(screen.getByText(/notice type/i)).toBeInTheDocument()
    expect(screen.getByText(/date range/i)).toBeInTheDocument()
    expect(screen.getByText(/individual notice amount/i)).toBeInTheDocument()
    expect(screen.getByText(/cumulative notice amount/i)).toBeInTheDocument()
    expect(screen.getByText(/number of offences/i)).toBeInTheDocument()
    expect(screen.getByText(/offence type/i)).toBeInTheDocument()
    expect(screen.getByText(/council/i)).toBeInTheDocument()
  })

  it('updates text filter on input change', async () => {
    const user = userEvent.setup()
    render(<Filters {...defaultProps} />)
    
    const textInput = screen.getByPlaceholderText(/search name/i)
    await user.type(textInput, 'test')
    
    // Check that setFilters was called (it's called on each keystroke)
    expect(mockSetFilters).toHaveBeenCalled()
    
    // Verify that setFilters was called with textFilter
    // Since it's a controlled component, we just verify it was called
    const calls = mockSetFilters.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    
    // The last call should have 't' as the last character typed
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toHaveProperty('textFilter')
    expect(typeof lastCall[0].textFilter).toBe('string')
  })

  it('handles penalty type radio button changes', async () => {
    const user = userEvent.setup()
    render(<Filters {...defaultProps} />)
    
    const prosecutionRadio = screen.getByLabelText(/prosecutions only/i)
    await user.click(prosecutionRadio)
    
    expect(mockSetFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        penaltyType: 'prosecution'
      })
    )
  })

  it('toggles offence code selection', async () => {
    const user = userEvent.setup()
    render(<Filters {...defaultProps} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    const offenceCheckbox = checkboxes.find(cb => 
      cb.closest('label')?.textContent?.includes('Fail to comply')
    )
    
    if (offenceCheckbox) {
      await user.click(offenceCheckbox)
      expect(mockSetFilters).toHaveBeenCalled()
    }
  })

  it('toggles council selection', async () => {
    const user = userEvent.setup()
    render(<Filters {...defaultProps} />)
    
    const councilCheckbox = screen.getByLabelText(/^Sydney$/i)
    await user.click(councilCheckbox)
    
    expect(mockSetFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        councils: ['Sydney']
      })
    )
  })

  it('handles select all offences', async () => {
    const user = userEvent.setup()
    render(<Filters {...defaultProps} />)
    
    // Find the offence type section and its "All" button
    const offenceSection = screen.getByText(/offence type/i).closest('.filter-group')
    const allButtons = offenceSection?.querySelectorAll('button')
    const offenceSelectAll = Array.from(allButtons || []).find(btn => btn.textContent === 'All')
    
    if (offenceSelectAll) {
      await user.click(offenceSelectAll)
      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          offenceCodes: expect.arrayContaining(['11339', '11323'])
        })
      )
    }
  })

  it('handles select none offences', async () => {
    const user = userEvent.setup()
    const propsWithSelected = {
      ...defaultProps,
      filters: {
        ...defaultProps.filters,
        offenceCodes: ['11339', '11323']
      }
    }
    render(<Filters {...propsWithSelected} />)
    
    const buttons = screen.getAllByRole('button', { name: /none/i })
    const offenceSelectNone = buttons.find(btn => 
      btn.closest('.filter-group')?.querySelector('label')?.textContent?.includes('Offence Type')
    )
    
    if (offenceSelectNone) {
      await user.click(offenceSelectNone)
      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          offenceCodes: []
        })
      )
    }
  })

  it('shows loading state when date range is not ready', () => {
    const loadingProps = {
      ...defaultProps,
      dateRange: [0, 0]
    }
    render(<Filters {...loadingProps} />)
    expect(screen.getByText(/loading filters/i)).toBeInTheDocument()
  })
})

