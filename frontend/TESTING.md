# Testing Guide

This project includes comprehensive tests to ensure code quality and prevent regressions.

## Test Types

### Unit Tests
Unit tests for utility functions and React components using Vitest and React Testing Library.

**Location**: `src/**/*.test.js` and `src/**/*.test.jsx`

**Run unit tests**:
```bash
npm run test
```

**Run tests in watch mode**:
```bash
npm run test -- --watch
```

**Run tests with UI**:
```bash
npm run test:ui
```

**Run tests with coverage**:
```bash
npm run test:coverage
```

### E2E Tests
End-to-end tests using Playwright that test the full application flow, including mobile responsiveness.

**Location**: `e2e/**/*.spec.js`

**Run E2E tests**:
```bash
npm run test:e2e
```

**Run E2E tests with UI**:
```bash
npm run test:e2e:ui
```

**Run all tests**:
```bash
npm run test:all
```

## Test Coverage

### Unit Tests
- ✅ Utility functions (`utils.js`)
  - `getMarkerColor()` - Color coding for penalty counts
  - `getBadgeColor()` - Badge colors for UI
  - `parsePenaltyAmount()` - Parsing penalty amount strings
  - `getCanonicalUrl()` - Generating URLs for penalty notices
  - `OFFENCE_CODES` - Offence code constants

- ✅ React Components
  - `RangeSlider` - Range slider with editable inputs
  - `Filters` - Filter sidebar with all filter types
  - `PenaltyCard` - Penalty detail card modal

### E2E Tests
- ✅ Desktop functionality
  - Page loading and header display
  - Info section toggle
  - Sidebar open/close
  - Text search filtering
  - Penalty type filtering
  - Council filtering
  - Map display and markers
  - Location count display
  - Select all/none buttons

- ✅ Mobile viewport (375x667 - iPhone SE)
  - Responsive header
  - Sidebar behavior on mobile
  - Map legend visibility
  - Filter accessibility
  - Penalty card display

- ✅ Tablet viewport (768x1024 - iPad)
  - Responsive layout
  - Sidebar functionality

## Running Tests in CI/CD

The tests are designed to run in CI environments. E2E tests will automatically start the dev server if needed.

## Browser Support

E2E tests run on:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Writing New Tests

### Unit Test Example
```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Test Example
```javascript
import { test, expect } from '@playwright/test'

test('my feature works', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})
```

## Troubleshooting

### Tests fail with "Cannot find module"
Make sure all dependencies are installed:
```bash
npm install
```

### E2E tests fail to start
Make sure the dev server can start:
```bash
npm run dev
```

### Playwright browsers not installed
Install Playwright browsers:
```bash
npx playwright install
```


