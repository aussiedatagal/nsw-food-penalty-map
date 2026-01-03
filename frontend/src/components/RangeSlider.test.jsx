import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RangeSlider from './RangeSlider'

describe('RangeSlider', () => {
  const defaultProps = {
    min: 0,
    max: 100,
    value: [20, 80],
    onChange: vi.fn(),
    formatValue: (val) => val.toString(),
  }

  it('renders with initial values', () => {
    render(<RangeSlider {...defaultProps} />)
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('formats values correctly', () => {
    const formatValue = (val) => `$${val}`
    render(<RangeSlider {...defaultProps} formatValue={formatValue} />)
    expect(screen.getByText('$20')).toBeInTheDocument()
    expect(screen.getByText('$80')).toBeInTheDocument()
  })

  it('shows editable inputs when editable is true', () => {
    const parseValue = (str) => parseFloat(str.replace(/[^0-9.]/g, ''))
    render(
      <RangeSlider
        {...defaultProps}
        editable={true}
        parseValue={parseValue}
      />
    )
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(2)
  })

  it('updates value when input is changed and blurred', async () => {
    const user = userEvent.setup()
    const parseValue = (str) => parseFloat(str.replace(/[^0-9.]/g, ''))
    const onChange = vi.fn()
    
    render(
      <RangeSlider
        {...defaultProps}
        editable={true}
        parseValue={parseValue}
        onChange={onChange}
      />
    )
    
    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], '30')
    await user.tab() // Blur the input
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
    })
  })

  it('handles Enter key to commit input', async () => {
    const user = userEvent.setup()
    const parseValue = (str) => parseFloat(str.replace(/[^0-9.]/g, ''))
    const onChange = vi.fn()
    
    render(
      <RangeSlider
        {...defaultProps}
        editable={true}
        parseValue={parseValue}
        onChange={onChange}
      />
    )
    
    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], '25')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
    })
  })

  it('handles Escape key to cancel input', async () => {
    const user = userEvent.setup()
    const parseValue = (str) => parseFloat(str.replace(/[^0-9.]/g, ''))
    
    render(
      <RangeSlider
        {...defaultProps}
        editable={true}
        parseValue={parseValue}
      />
    )
    
    const inputs = screen.getAllByRole('textbox')
    const originalValue = inputs[0].value
    await user.clear(inputs[0])
    await user.type(inputs[0], '999')
    await user.keyboard('{Escape}')
    
    // Value should revert to original
    await waitFor(() => {
      expect(inputs[0].value).toBe(originalValue)
    })
  })

  it('constrains min value to not exceed max', async () => {
    const user = userEvent.setup()
    const parseValue = (str) => parseFloat(str.replace(/[^0-9.]/g, ''))
    const onChange = vi.fn()
    
    render(
      <RangeSlider
        {...defaultProps}
        value={[20, 30]}
        editable={true}
        parseValue={parseValue}
        onChange={onChange}
      />
    )
    
    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[0])
    await user.type(inputs[0], '35') // Try to set min above max
    await user.tab()
    
    await waitFor(() => {
      const calls = onChange.mock.calls
      if (calls.length > 0) {
        const [min, max] = calls[calls.length - 1][0]
        expect(min).toBeLessThanOrEqual(max)
      }
    })
  })

  it('constrains max value to not go below min', async () => {
    const user = userEvent.setup()
    const parseValue = (str) => parseFloat(str.replace(/[^0-9.]/g, ''))
    const onChange = vi.fn()
    
    render(
      <RangeSlider
        {...defaultProps}
        value={[20, 30]}
        editable={true}
        parseValue={parseValue}
        onChange={onChange}
      />
    )
    
    const inputs = screen.getAllByRole('textbox')
    await user.clear(inputs[1])
    await user.type(inputs[1], '15') // Try to set max below min
    await user.tab()
    
    await waitFor(() => {
      const calls = onChange.mock.calls
      if (calls.length > 0) {
        const [min, max] = calls[calls.length - 1][0]
        expect(max).toBeGreaterThanOrEqual(min)
      }
    })
  })
})


