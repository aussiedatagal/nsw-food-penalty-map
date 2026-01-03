import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PenaltyCard from './PenaltyCard'

describe('PenaltyCard', () => {
  const mockLocation = {
    name: 'Test Restaurant',
    address: '123 Test St, Sydney',
    council: 'City of Sydney',
    penalties: [
      {
        date_of_offence: '2023-01-15',
        date_issued: '2023-02-01',
        offence_code: '11339',
        offence_description: 'Fail to comply with Food Standards Code',
        offence_nature: 'Test offence nature',
        penalty_amount: '$1,000',
        issued_by: 'NSW Food Authority',
        party_served: 'Test Party'
      }
    ]
  }

  const mockLocationGroup = {
    shops: [mockLocation],
    location: { lat: -33.8688, lon: 151.2093 },
    address: '123 Test St, Sydney',
    council: 'City of Sydney'
  }

  const defaultProps = {
    location: mockLocation,
    locationGroup: mockLocationGroup,
    onClose: vi.fn()
  }

  it('renders location name and address', () => {
    render(<PenaltyCard {...defaultProps} />)
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument()
    // Address appears multiple times, so use getAllByText and check it exists
    const addresses = screen.getAllByText('123 Test St, Sydney')
    expect(addresses.length).toBeGreaterThan(0)
  })

  it('renders council information', () => {
    render(<PenaltyCard {...defaultProps} />)
    expect(screen.getByText('City of Sydney')).toBeInTheDocument()
  })

  it('renders penalty information', () => {
    render(<PenaltyCard {...defaultProps} />)
    expect(screen.getByText(/penalties/i)).toBeInTheDocument()
    expect(screen.getByText('Fail to comply with Food Standards Code')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
  })

  it('renders offence date', () => {
    render(<PenaltyCard {...defaultProps} />)
    expect(screen.getByText(/jan.*2023/i)).toBeInTheDocument()
  })

  it('renders prosecution badge when penalty is a prosecution', () => {
    const prosecutionLocation = {
      ...mockLocation,
      penalties: [{
        ...mockLocation.penalties[0],
        type: 'prosecution',
        prosecution: true
      }]
    }
    const props = {
      ...defaultProps,
      location: prosecutionLocation,
      locationGroup: {
        ...mockLocationGroup,
        shops: [prosecutionLocation]
      }
    }
    render(<PenaltyCard {...props} />)
    expect(screen.getByText(/prosecution/i)).toBeInTheDocument()
  })

  it('renders multiple shops when locationGroup has multiple shops', () => {
    const multiShopGroup = {
      ...mockLocationGroup,
      shops: [
        mockLocation,
        {
          ...mockLocation,
          name: 'Another Restaurant',
          penalties: [mockLocation.penalties[0]]
        }
      ]
    }
    const props = {
      ...defaultProps,
      locationGroup: multiShopGroup
    }
    render(<PenaltyCard {...props} />)
    expect(screen.getByText(/2 shops at this location/i)).toBeInTheDocument()
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument()
    expect(screen.getByText('Another Restaurant')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PenaltyCard {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByRole('button', { name: /×/i })
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('displays total penalty amount for single shop', () => {
    render(<PenaltyCard {...defaultProps} />)
    expect(screen.getByText(/total penalty amount/i)).toBeInTheDocument()
  })

  it('displays total penalty amount for each shop in multi-shop view', () => {
    const multiShopGroup = {
      ...mockLocationGroup,
      shops: [
        mockLocation,
        {
          ...mockLocation,
          name: 'Another Restaurant',
          penalties: [mockLocation.penalties[0]]
        }
      ]
    }
    const props = {
      ...defaultProps,
      locationGroup: multiShopGroup
    }
    render(<PenaltyCard {...props} />)
    const totals = screen.getAllByText(/total penalty amount/i)
    expect(totals.length).toBeGreaterThan(0)
  })
})

