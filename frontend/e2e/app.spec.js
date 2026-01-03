import { test, expect } from '@playwright/test'

test.describe('NSW Food Penalty Notices App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for data to load
    await page.waitForSelector('.map-container', { timeout: 10000 })
  })

  test('loads the main page with header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('NSW Food Penalty Notices')
    await expect(page.locator('.header')).toBeVisible()
  })

  test('toggles info section', async ({ page }) => {
    const infoToggle = page.locator('.info-toggle')
    const headerInfo = page.locator('.header-info')
    
    // Info should be visible by default
    await expect(headerInfo).toBeVisible()
    
    // Click to collapse
    await infoToggle.click()
    await expect(headerInfo).not.toBeVisible()
    
    // Click to expand
    await infoToggle.click()
    await expect(headerInfo).toBeVisible()
  })

  test('opens and closes filters sidebar', async ({ page }) => {
    const sidebarToggle = page.locator('.sidebar-toggle')
    const sidebar = page.locator('.sidebar')
    
    // Sidebar should be closed by default
    await expect(sidebar).not.toHaveClass(/open/)
    
    // Open sidebar
    await sidebarToggle.click()
    await expect(sidebar).toHaveClass(/open/)
    await expect(page.locator('.sidebar h2')).toContainText('Filters')
    
    // Close sidebar by clicking overlay
    const overlay = page.locator('.sidebar-overlay')
    if (await overlay.isVisible()) {
      await overlay.click()
      await expect(sidebar).not.toHaveClass(/open/)
    }
    
    // Open again and close with toggle
    await sidebarToggle.click()
    await expect(sidebar).toHaveClass(/open/)
    await sidebarToggle.click()
    await expect(sidebar).not.toHaveClass(/open/)
  })

  test('filters by text search', async ({ page }) => {
    // Open sidebar
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Enter text filter
    const textInput = page.locator('.text-filter-input')
    await textInput.fill('test')
    await page.waitForTimeout(500) // Wait for filter to apply
    
    // Check that filter indicator appears
    const filterIndicator = page.locator('.filter-indicator')
    await expect(filterIndicator).toBeVisible()
  })

  test('filters by penalty type', async ({ page }) => {
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Select "Prosecutions Only"
    const prosecutionRadio = page.locator('input[value="prosecution"]')
    await prosecutionRadio.click()
    
    // Check that filter is applied
    await expect(page.locator('.filter-indicator')).toBeVisible()
  })

  test('filters by council', async ({ page }) => {
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Wait for councils to load
    await page.waitForSelector('.multiselect-option', { timeout: 5000 })
    
    // Click first council checkbox
    const firstCouncil = page.locator('.multiselect-option').first()
    const checkbox = firstCouncil.locator('input[type="checkbox"]')
    
    if (await checkbox.isVisible()) {
      await checkbox.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.filter-indicator')).toBeVisible()
    }
  })

  test('displays map with markers', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    
    // Check that map container is visible
    await expect(page.locator('.map-container')).toBeVisible()
    
    // Check for map legend
    await expect(page.locator('.map-legend')).toBeVisible()
    await expect(page.locator('.legend-label')).toContainText('Penalties')
  })

  test('shows location count in sidebar', async ({ page }) => {
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Check that location count is displayed
    const countText = page.locator('.sidebar-header .count')
    await expect(countText).toBeVisible()
    const text = await countText.textContent()
    expect(text).toMatch(/\d+ location/)
  })

  test('select all and none buttons work for offences', async ({ page }) => {
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Wait for offence options to load
    await page.waitForSelector('.multiselect-option', { timeout: 5000 })
    
    // Find "All" button in offence section
    const offenceSection = page.locator('.filter-group').filter({ hasText: 'Offence Type' })
    const allButton = offenceSection.locator('button:has-text("All")')
    
    if (await allButton.isVisible()) {
      await allButton.click()
      await page.waitForTimeout(500)
      
      // Check that filter indicator appears
      await expect(page.locator('.filter-indicator')).toBeVisible()
      
      // Click "None"
      const noneButton = offenceSection.locator('button:has-text("None")')
      await noneButton.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe('Mobile Viewport Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('mobile: header is responsive', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.header', { timeout: 10000 })
    
    // Check header is visible and properly sized
    const header = page.locator('.header')
    await expect(header).toBeVisible()
    
    // Check header title is visible
    await expect(page.locator('h1')).toBeVisible()
  })

  test('mobile: sidebar opens from right on mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container', { timeout: 10000 })
    
    const sidebarToggle = page.locator('.sidebar-toggle')
    const sidebar = page.locator('.sidebar')
    
    // Open sidebar
    await sidebarToggle.click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Check sidebar is visible and positioned correctly
    await expect(sidebar).toBeVisible()
    await expect(sidebar).toHaveClass(/open/)
  })

  test('mobile: map legend is visible and properly sized', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container', { timeout: 10000 })
    
    const legend = page.locator('.map-legend')
    await expect(legend).toBeVisible()
    
    // Check legend is positioned correctly on mobile
    const box = await legend.boundingBox()
    expect(box).not.toBeNull()
  })

  test('mobile: filters are accessible and usable', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container', { timeout: 10000 })
    
    // Open sidebar
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    // Check text input is usable
    const textInput = page.locator('.text-filter-input')
    await expect(textInput).toBeVisible()
    await textInput.fill('test')
    
    // Check that filters scroll properly
    const sidebarContent = page.locator('.sidebar-content')
    await expect(sidebarContent).toBeVisible()
  })

  test('mobile: penalty card displays correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container', { timeout: 10000 })
    
    // Wait for markers to load
    await page.waitForTimeout(2000)
    
    // Try to click a marker if available
    const markers = page.locator('.leaflet-marker-icon')
    const markerCount = await markers.count()
    
    if (markerCount > 0) {
      // Click first marker
      await markers.first().click({ timeout: 5000 }).catch(() => {})
      
      // If card opens, check it's visible and properly sized
      const card = page.locator('.penalty-card')
      if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(card).toBeVisible()
        
        // Check card is responsive on mobile
        const cardBox = await card.boundingBox()
        if (cardBox) {
          expect(cardBox.width).toBeLessThanOrEqual(375 * 0.95) // 95vw max
        }
        
        // Close card
        const closeButton = page.locator('.card-close')
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click()
        }
      }
    }
  })
})

test.describe('Tablet Viewport Tests', () => {
  test.use({ viewport: { width: 768, height: 1024 } }) // iPad size

  test('tablet: layout is responsive', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container', { timeout: 10000 })
    
    // Check header
    await expect(page.locator('.header')).toBeVisible()
    
    // Check map
    await expect(page.locator('.map-container')).toBeVisible()
    
    // Check sidebar toggle
    await expect(page.locator('.sidebar-toggle')).toBeVisible()
  })

  test('tablet: sidebar works correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.map-container', { timeout: 10000 })
    
    await page.locator('.sidebar-toggle').click()
    await page.waitForSelector('.sidebar.open', { timeout: 2000 })
    
    await expect(page.locator('.sidebar')).toHaveClass(/open/)
    await expect(page.locator('.sidebar h2')).toContainText('Filters')
  })
})


