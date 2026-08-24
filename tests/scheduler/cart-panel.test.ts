import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = () => readFileSync(
  new URL('../../components/scheduler/SchedulerCartPanel.vue', import.meta.url),
  'utf8',
)

describe('scheduler cart panel', () => {
  it('renders a curated two-row list of common subject chips instead of every subject', () => {
    const cartPanelSource = source()

    // Two curated rows for one-click quick picks (loading all subjects would
    // defeat the purpose of quick selection)
    expect(cartPanelSource).toContain("['UFUG', 'UCUG', 'DLED']")
    expect(cartPanelSource).toContain("['AIAA', 'AMAT', 'DSAA', 'FTEC', 'MICS', 'MOES', 'ROAS', 'SMMG']")
    expect(cartPanelSource).toContain('cart-panel__subjects-row')

    // No longer loads the full subject list dynamically
    expect(cartPanelSource).not.toContain('getSubjects')
    expect(cartPanelSource).not.toContain('subjectFilters')
  })

  it('keeps add and remove actions as subtle outlined icon buttons matching status icons', () => {
    const cartPanelSource = source()

    // 30px transparent buttons (not the old 40px solid circles)
    expect(cartPanelSource).toContain('width: 30px')
    expect(cartPanelSource).toContain('height: 30px')
    expect(cartPanelSource).toContain('background: transparent')
    expect(cartPanelSource).toContain('border-radius: 8px')
    expect(cartPanelSource).not.toContain('inline-size: 40px')
    expect(cartPanelSource).not.toContain('background: var(--semantic-success)')

    // Circle-outline icons, same family as the status icons
    expect(cartPanelSource).toContain('lucide:circle-plus')
    expect(cartPanelSource).toContain('lucide:circle-minus')
    expect(cartPanelSource).toContain('color: var(--interactive-primary)')
    expect(cartPanelSource).toContain('color: var(--semantic-error)')
  })

  it('reports per-course add/remove status feedback (loading/success/fail)', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain("type ActionStatus = 'idle' | 'loading' | 'success' | 'fail'")
    expect(cartPanelSource).toContain('setActionStatus')
    expect(cartPanelSource).toContain('lucide:circle-check')
    expect(cartPanelSource).toContain('lucide:circle-x')
    expect(cartPanelSource).toContain('lucide:loader-circle')

    // Status icons render as real inline SVGs (not CSS-mask spans) to avoid
    // sub-pixel misalignment from mask scaling at non-integer sizes
    expect(cartPanelSource).toContain('mode="svg"')

    // Loading/success icons sit inside a 30px centered status slot so they
    // share the exact geometry of the add/remove buttons (no horizontal drift)
    expect(cartPanelSource).toContain('cart-panel__status-slot')
    expect(cartPanelSource).toContain('width: 30px')
    expect(cartPanelSource).toContain('justify-content: center')
  })

  it('renders the cart drawer as an overlay-backed bottom card with total credits', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain('cart-panel__drawer-overlay')
    expect(cartPanelSource).toContain('@click.self="handleDrawerClick"')
    expect(cartPanelSource).toContain('cart-panel__drawer-card')
    expect(cartPanelSource).toContain('cart-panel__drawer-header')
    expect(cartPanelSource).toContain('cart-panel__drawer-remove')
    expect(cartPanelSource).toContain('t(\'scheduler.totalCredits\')')
    expect(cartPanelSource).toContain('totalCredits')
    expect(cartPanelSource).toContain('--drawer-backdrop')
  })

  it('keeps a stable fixed height across loading/empty/full result states', () => {
    const cartPanelSource = source()

    // Fixed card height so "searching" and short last-page results do not
    // shrink the panel (mirrors the original h-full cart panel)
    expect(cartPanelSource).toContain('height: min(85vh,960px)')
    expect(cartPanelSource).toContain('height: min(88vh, 640px)')
    // Results area flexes to fill the remaining space and scrolls
    expect(cartPanelSource).toContain('flex: 1')
    expect(cartPanelSource).toContain('overflow-y: auto')
    // Loading/empty/error states center vertically inside the fixed height
    expect(cartPanelSource).toContain('justify-content: center')
  })

  it('only closes when the pointer press also starts outside the card', () => {
    const cartPanelSource = source()

    // A pointerdown inside the card must not close the panel even if the
    // pointer is released on the backdrop (click fires on the common ancestor)
    expect(cartPanelSource).toContain('@pointerdown.self="panelPointerDownInside = false"')
    expect(cartPanelSource).toContain('@click.self="handlePanelClick"')
    expect(cartPanelSource).toContain('@pointerdown="handlePanelPointerDown"')
    expect(cartPanelSource).toContain('panelPointerDownInside')

    // Same guard applies to the cart drawer overlay
    expect(cartPanelSource).toContain('@pointerdown.self="drawerPointerDownInside = false"')
    expect(cartPanelSource).toContain('@pointerdown="handleDrawerPointerDown"')
    expect(cartPanelSource).toContain('drawerPointerDownInside')
  })

  it('color-codes credits with the shared credit level variables', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain('creditColorVar')
    expect(cartPanelSource).toContain('--credit-level-')
    expect(cartPanelSource).toContain('creditColorVar(item.credit, item.counts_toward_term_load)')
    expect(cartPanelSource).toContain('--credit-excluded')
  })

  it('offers the course info popover on search results and drawer items', () => {
    const cartPanelSource = source()

    // Search result rows show the hover info popover (same component as the
    // side panel course cards), wired with the course identity
    expect(cartPanelSource).toContain('<SchedulerCourseInfoPopover')
    expect(cartPanelSource).toContain(':course-code="item.course_code"')
    expect(cartPanelSource).toContain(':course-title="item.course_title"')
    expect(cartPanelSource).toContain(':credit="item.credit"')
    expect(cartPanelSource).toContain(':semester-id="semesterId"')

    // Cart drawer items also show it
    expect(cartPanelSource).toContain(':course-code="course.course_code"')
    expect(cartPanelSource).toContain(':course-title="course.course_title"')
    expect(cartPanelSource).toContain(':credit="course.credit"')

    // Both anchor the popover to the icon's left edge so it opens rightwards
    // instead of covering the list to the left
    expect(cartPanelSource).toContain('align="left"')
    expect(cartPanelSource.match(/align="left"/g)?.length).toBe(2)
  })

  it('shows the result count in the pagination info', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain("t('scheduler.resultsCount'")
    expect(cartPanelSource).toContain('Math.ceil(totalResults / pageSize)')
  })

  it('renders pagination controls as borderless lucide icons matching the bottom panel', () => {
    const cartPanelSource = source()

    // Same icon family as the timetable bottom-panel nav controls
    expect(cartPanelSource).toContain('lucide:chevrons-left')
    expect(cartPanelSource).toContain('lucide:chevron-left')
    expect(cartPanelSource).toContain('lucide:chevron-right')
    expect(cartPanelSource).toContain('lucide:chevrons-right')
    expect(cartPanelSource).toContain('cart-panel__pagination-icon')

    // Borderless, transparent buttons (no card-style borders/background)
    const paginationStyleStart = cartPanelSource.indexOf('&__pagination {')
    const paginationStyleEnd = cartPanelSource.indexOf('&__footer {')
    const paginationStyle = cartPanelSource.slice(paginationStyleStart, paginationStyleEnd)
    expect(paginationStyle).toContain('border: none')
    expect(paginationStyle).toContain('background: transparent')
    expect(paginationStyle).not.toContain('border: 1px solid')
  })

  it('places the cart button in the footer row next to the centered pagination', () => {
    const cartPanelSource = source()

    // Pagination and the cart drawer button share the footer row
    const footerIndex = cartPanelSource.indexOf('cart-panel__footer')
    const paginationIndex = cartPanelSource.indexOf('cart-panel__pagination')
    const drawerBtnIndex = cartPanelSource.indexOf('cart-panel__drawer-btn')
    expect(footerIndex).toBeGreaterThan(-1)
    expect(paginationIndex).toBeGreaterThan(footerIndex)
    expect(drawerBtnIndex).toBeGreaterThan(paginationIndex)

    // Cart button is compact (not full width)
    const drawerBtnStyleStart = cartPanelSource.indexOf('&__drawer-btn {')
    const drawerBtnStyleEnd = cartPanelSource.indexOf('&__drawer-btn-icon')
    const drawerBtnStyle = cartPanelSource.slice(drawerBtnStyleStart, drawerBtnStyleEnd)
    expect(drawerBtnStyle).toContain('flex-shrink: 0')
    expect(drawerBtnStyle).toContain('border-radius: 999px')
    expect(drawerBtnStyle).not.toContain('width: 100%')
  })

  it('renders the search input with an inline icon and loading spinner', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain('cart-panel__search-icon')
    expect(cartPanelSource).toContain('lucide:search')
    expect(cartPanelSource).toContain('cart-panel__search-spinner')
    expect(cartPanelSource).toContain('cart-spin')
  })

  it('unifies credit formatting with the side panel (dot separator)', () => {
    const cartPanelSource = source()

    expect(cartPanelSource).toContain('· {{ t(\'scheduler.credits\', { count: item.credit }) }}')
    expect(cartPanelSource).toContain('· {{ t(\'scheduler.credits\', { count: course.credit }) }}')
  })
})
