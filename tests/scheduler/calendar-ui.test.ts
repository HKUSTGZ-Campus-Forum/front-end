import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const root = resolve(import.meta.dirname, '../..')
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')

describe('calendar export UI integration', () => {
  it('compiles the shared export component and template', () => {
    const filename = 'components/scheduler/SchedulerCalendarExport.vue'
    const { descriptor, errors } = parse(read(filename), { filename })
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: 'calendar-export-test' })
    const template = compileTemplate({
      source: descriptor.template!.content,
      filename,
      id: 'calendar-export-test',
      compilerOptions: { bindingMetadata: script.bindings },
    })
    expect(template.errors).toEqual([])
  })

  it('exports the displayed plan in both solver modes, independent of login', () => {
    const dashboard = read('components/scheduler/SchedulerDashboard.vue')
    expect(dashboard).toContain(':selections="currentPlan"')
    expect(dashboard).toContain(':courses="courseList"')
    const gate = dashboard.split('const canExportCurrentPlan = computed(')[1].split('const maxDayNum')[0]
    expect(gate).not.toContain('isLoggedIn')
    expect(gate).toContain("optimizerRunState.value === 'complete' && !optimizerStale.value")
    expect(gate).toContain("solverResult.value.status === 'ok'")
    expect(gate).toContain('!props.loading')
    expect(gate).toContain('!props.cartLoadError')
    expect(gate).toContain('!cart.requiresReload.value')
    expect(dashboard).toContain(':disabled="!canExportCurrentPlan"')
  })

  it('reuses export in saved/shared plan previews and blocks unavailable plans', () => {
    const preview = read('components/scheduler/SchedulerPlanPreview.vue')
    expect(preview).toContain('<SchedulerCalendarExport')
    expect(preview).toContain(':selections="plan.selections || []"')
    expect(preview).toContain(':disabled="plan.availability === \'unavailable\'"')
  })

  it('uses a native modal with labelled dates, focus restoration, validation, and theme tokens', () => {
    const component = read('components/scheduler/SchedulerCalendarExport.vue')
    expect(component).toContain('<dialog')
    expect(component).toContain('showModal()')
    expect(component).toContain('@close="onClose"')
    expect(component).toContain('trigger.value?.focus()')
    expect(component).toContain('aria-labelledby')
    expect(component).toContain('aria-describedby')
    expect(component).toContain('type="date"')
    expect(component).toContain(':disabled="!canDownload"')
    expect(component).toContain("preview.error !== 'missing-dates'")
    expect(component).toContain('role="alert"')
    expect(component).toContain('var(--surface-primary)')
    expect(component).toContain('@media (max-width: 520px)')
    expect(component).not.toContain('fetch(')
  })

  it('provides paired translations and explicit snapshot / source-data caveats', () => {
    const zh = JSON.parse(read('i18n/locales/zh.json')).scheduler.calendar
    const en = JSON.parse(read('i18n/locales/en.json')).scheduler.calendar
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(zh.errors).sort()).toEqual(Object.keys(en.errors).sort())
    expect(zh.importNotice).toContain('不会自动同步')
    expect(zh.sourceNotice).toContain('调课')
    expect(en.timezone).toContain('UTC+8')
  })
})
