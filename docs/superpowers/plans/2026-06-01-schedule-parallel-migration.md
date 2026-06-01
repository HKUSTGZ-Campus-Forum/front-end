# Schedule Assistant Parallel Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the UniKorn-native schedule assistant at `/schedule` while keeping `https://scheduler.unikorn.axfff.com` unchanged and independently usable.

**Architecture:** Keep the legacy CoursePlan deployment read-only and isolated. Complete the existing Nuxt + Flask partial migration, copy only public schedule data through a transactional snapshot importer, use browser-local cart state for guests, and persist carts through UniKorn JWT endpoints for logged-in users. Verify the development chain before any production sidebar switch.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, Vitest, Vue I18n, Flask, SQLAlchemy, Flask-JWT-Extended, pytest, PostgreSQL, npm, pnpm lockfile maintenance.

---

## Execution Rules

- Treat `/Users/mount/Desktop/Programming/unikorn/front-end` and
  `/Users/mount/Desktop/Programming/unikorn/back-end` as separate Git
  repositories.
- Use `superpowers:using-git-worktrees` before implementation. Base the
  front-end worktree on the current local `front-end/main`, which already
  contains the partial migration commits and the approved design document.
- Do not modify `/Users/mount/Desktop/Programming/unikorn/CoursePlan.search`.
- Do not change `scheduler.unikorn.axfff.com`, the old PM2 process, or the old
  database schema.
- Do not switch the production sidebar during this plan. The local and
  development-chain sidebar may point to `/schedule`; the production branch
  remains untouched.
- Never commit a source database connection string. The development snapshot
  import uses the execution-time environment variable
  `COURSEPLAN_READONLY_DATABASE_URL`.

## File Structure

### Front-End Repository

- Modify: `package.json`
  - Add Vitest scripts and dependency.
- Modify: `package-lock.json`
  - Keep npm dependency resolution reproducible.
- Modify: `pnpm-lock.yaml`
  - Keep the tracked pnpm lockfile aligned.
- Modify: `utils/scheduler.ts`
  - Own scheduler DTOs, section grouping, solver result types, and the
    corrected multi-layer plan solver.
- Create: `utils/schedulerCart.ts`
  - Own pure guest-cart normalization and immutable cart mutation helpers.
- Create: `tests/scheduler/solver.test.ts`
  - Cover solver behavior independently from Vue.
- Create: `tests/scheduler/cart.test.ts`
  - Cover guest cart behavior independently from Vue.
- Modify: `composables/useScheduler.ts`
  - Route public calls through `fetchPublic`; keep JWT persistence calls
    through `fetchWithAuth`.
- Create: `composables/useSchedulerCart.ts`
  - Select browser-local or JWT-backed cart behavior based on UniKorn auth.
- Move: `pages/scheduler/` to `pages/schedule/`
  - Rename the user-facing main-site route.
- Modify: `components/home/KeguangSidebar.vue`
  - Point the local/development main-site entry to `/schedule`.
- Modify: `components/scheduler/SchedulerDashboard.vue`
  - Consume normalized cart state and structured solver outcomes.
- Modify: `components/scheduler/SchedulerTimetable.vue`
  - Apply one-based lecture-day conversion consistently.
- Modify: `components/scheduler/SchedulerSidePanel.vue`
  - Expose display toggles and translated controls.
- Modify: `components/scheduler/SchedulerCourseCard.vue`
  - Translate controls and expose course-detail action.
- Modify: `components/scheduler/SchedulerCartPanel.vue`
  - Translate search/cart UI and rely on cart adapter behavior.
- Modify: `components/scheduler/SchedulerBottomPanel.vue`
  - Handle zero plans and replace hardcoded colors.
- Create: `components/scheduler/SchedulerCourseDetail.vue`
  - Display translated course detail fields.
- Modify: `components/scheduler/SchedulerMap.vue`
  - Use public API helper, translated states, map course labels, and theme
    variables.
- Modify: `i18n/locales/en.json`
  - Add complete English scheduler copy.
- Modify: `i18n/locales/zh.json`
  - Add complete Chinese scheduler copy.

### Back-End Repository

- Modify: `app/routes/scheduler.py`
  - Harden request validation, section validation, deterministic ordering, and
    JSON errors.
- Modify: `tests/test_scheduler_routes.py`
  - Cover malformed requests, course/semester validation, deterministic
    serialization, and user cart isolation.
- Rewrite: `app/scripts/migrate_scheduler_data.py`
  - Import a validated public-data snapshot in one destination transaction.
- Create: `tests/test_scheduler_data_import.py`
  - Cover successful import, repeat execution, source validation, rollback,
    and exclusion of user data.

## Task 1: Establish Baselines And Protect The Old Site

**Files:**
- Read only: `/Users/mount/Desktop/Programming/unikorn/front-end`
- Read only: `/Users/mount/Desktop/Programming/unikorn/back-end`
- Read only: `/Users/mount/Desktop/Programming/unikorn/CoursePlan.search`

- [ ] **Step 1: Create isolated front-end and back-end worktrees**

Use `superpowers:using-git-worktrees`. Create one worktree per repository from
the current local heads. Name branches clearly, for example:

```bash
git worktree add ../front-end-schedule-migration -b codex/schedule-migration
git worktree add ../back-end-schedule-migration -b codex/schedule-migration
```

Run each command from its corresponding repository. Do not create a worktree
for `CoursePlan.search`.

- [ ] **Step 2: Confirm the old standalone scheduler is healthy before edits**

Run:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/home
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/dashboard/2530
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/map
```

Expected:

```text
200
200
200
```

- [ ] **Step 3: Record the development API baseline**

Run:

```bash
curl -fsS https://dev.unikorn.axfff.com/api/scheduler/semesters
curl -fsS 'https://dev.unikorn.axfff.com/api/scheduler/courses/search?query=AIAA&pageSize=2'
curl -fsS https://dev.unikorn.axfff.com/api/scheduler/map/components
curl -fsS https://dev.unikorn.axfff.com/api/scheduler/map/lines
```

Expected before snapshot import:

- API requests return valid JSON.
- Semester and map arrays may still be empty.
- Course search does not return HTTP 500.

## Task 2: Add Front-End Test Harness And Correct The Solver

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `pnpm-lock.yaml`
- Modify: `utils/scheduler.ts`
- Create: `tests/scheduler/solver.test.ts`

- [ ] **Step 1: Add Vitest with both tracked lockfiles updated**

Run:

```bash
npm install --save-dev vitest
npm pkg set scripts.test='vitest run'
npm pkg set scripts.test:scheduler='vitest run tests/scheduler'
pnpm install --lockfile-only
```

Expected:

- `package.json` contains `vitest`.
- `package-lock.json` and `pnpm-lock.yaml` are modified.

- [ ] **Step 2: Write failing multi-layer and day-index tests**

Create `tests/scheduler/solver.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getMaxDayNum, solvePlans, type CartCourse, type SchedulerLecture } from '../../utils/scheduler'

function lecture(day: number, start_time: number, end_time: number): SchedulerLecture {
  return { day, start_time, end_time, room: 'R', instructor: 'I' }
}

function course(
  code: string,
  layers: Record<number, { id: number; lectures: SchedulerLecture[]; enabled?: boolean }[]>,
): CartCourse {
  return {
    course_code: code,
    course_title: code,
    credit: 3,
    subject: code.slice(0, 4),
    pg_course: false,
    klms_course: false,
    enabled: true,
    layers: Object.fromEntries(
      Object.entries(layers).map(([layer, bundles]) => [
        Number(layer),
        bundles.map(bundle => ({
          id: bundle.id,
          layer: Number(layer),
          enabled: bundle.enabled ?? true,
          sections: [{
            semester_id: '2530',
            section_id: `${code}-${layer}-${bundle.id}`,
            name: `L${bundle.id}`,
            bundle: bundle.id,
            layer: Number(layer),
            quota: 10,
            section_type: 'L',
            is_main: true,
            lectures: bundle.lectures,
          }],
        })),
      ]),
    ),
  }
}

const noBans = () => Array.from({ length: 7 }, () => Array(8).fill(false))

describe('solvePlans', () => {
  it('chooses one bundle from every enabled layer', () => {
    const result = solvePlans([
      course('AIAA1001', {
        0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }],
        1: [{ id: 2, lectures: [lecture(2, 1030, 1200)] }],
      }),
    ], noBans())

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('expected plans')
    expect(result.plans).toEqual([[
      { courseIndex: 0, layer: 0, bundleId: 1 },
      { courseIndex: 0, layer: 1, bundleId: 2 },
    ]])
  })

  it('uses day minus one when applying a Monday ban', () => {
    const banned = noBans()
    banned[0][0] = true
    const result = solvePlans([
      course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }] }),
    ], banned)

    expect(result).toMatchObject({
      status: 'unavailable-layer',
      courseCode: 'AIAA1001',
      layer: 0,
    })
  })

  it('rejects overlap between layers of the same course', () => {
    const result = solvePlans([
      course('AIAA1001', {
        0: [{ id: 1, lectures: [lecture(1, 900, 1030)] }],
        1: [{ id: 2, lectures: [lecture(1, 1000, 1130)] }],
      }),
    ], noBans())

    expect(result.status).toBe('no-solution')
  })

  it('rejects overlap between different courses', () => {
    const result = solvePlans([
      course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(2, 900, 1030)] }] }),
      course('DSAA1001', { 0: [{ id: 1, lectures: [lecture(2, 1000, 1130)] }] }),
    ], noBans())

    expect(result.status).toBe('no-solution')
  })

  it('expands the timetable to seven columns only for weekend lectures', () => {
    const weekday = course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(5, 900, 1030)] }] })
    const weekend = course('AIAA1001', { 0: [{ id: 1, lectures: [lecture(7, 900, 1030)] }] })
    const plan = [{ courseIndex: 0, layer: 0, bundleId: 1 }]
    expect(getMaxDayNum([weekday], plan)).toBe(5)
    expect(getMaxDayNum([weekend], plan)).toBe(7)
  })

  it('reports empty and disabled carts separately', () => {
    expect(solvePlans([], noBans()).status).toBe('empty-cart')
    const disabled = course('AIAA1001', { 0: [{ id: 1, lectures: [] }] })
    disabled.enabled = false
    expect(solvePlans([disabled], noBans()).status).toBe('all-disabled')
  })
})
```

- [ ] **Step 3: Run the solver tests and confirm they fail**

Run:

```bash
npm run test:scheduler -- tests/scheduler/solver.test.ts
```

Expected:

- FAIL because the existing `solvePlans()` returns a plan array rather than a
  structured result.
- The existing algorithm also fails the multi-layer expectation.

- [ ] **Step 4: Replace the solver with structured multi-layer recursion**

In `utils/scheduler.ts`, keep the existing DTOs and constants, add:

```ts
export interface PlanSelection {
  courseIndex: number
  bundleId: number
  layer: number
}

export type SolverResult =
  | { status: 'ok'; plans: PlanSelection[][] }
  | { status: 'empty-cart'; plans: [] }
  | { status: 'all-disabled'; plans: [] }
  | { status: 'unavailable-layer'; plans: []; courseCode: string; layer: number }
  | { status: 'no-solution'; plans: [] }

function overlapsBanned(lectures: SchedulerLecture[], bannedPeriods: boolean[][]): boolean {
  return lectures.some((lecture) => {
    for (let period = 0; period < TIME_SLOTS.length; period++) {
      const slot = TIME_SLOTS[period]
      if (
        lecture.start_time < slot.end &&
        lecture.end_time > slot.start &&
        bannedPeriods[lecture.day - 1]?.[period]
      ) {
        return true
      }
    }
    return false
  })
}

export function solvePlans(courseList: CartCourse[], bannedPeriods: boolean[][]): SolverResult {
  if (courseList.length === 0) return { status: 'empty-cart', plans: [] }

  const enabledCourses = courseList
    .map((course, courseIndex) => ({ course, courseIndex }))
    .filter(({ course }) => course.enabled)
  if (enabledCourses.length === 0) return { status: 'all-disabled', plans: [] }

  const choices: {
    courseIndex: number
    courseCode: string
    layer: number
    bundles: { selection: PlanSelection; lectures: SchedulerLecture[] }[]
  }[] = []

  for (const { course, courseIndex } of enabledCourses) {
    for (const [layerText, layerBundles] of Object.entries(course.layers)) {
      const layer = Number(layerText)
      const bundles = layerBundles
        .filter(bundle => bundle.enabled)
        .map(bundle => ({
          selection: { courseIndex, layer, bundleId: bundle.id },
          lectures: bundle.sections.flatMap(section => section.lectures),
        }))
        .filter(bundle => !overlapsBanned(bundle.lectures, bannedPeriods))
      if (bundles.length === 0) {
        return { status: 'unavailable-layer', plans: [], courseCode: course.course_code, layer }
      }
      choices.push({ courseIndex, courseCode: course.course_code, layer, bundles })
    }
  }

  const plans: PlanSelection[][] = []
  const bucket = new Map<number, { start: number; end: number }[]>()
  const selected: PlanSelection[] = []

  function canPlace(lectures: SchedulerLecture[]) {
    return lectures.every(lecture =>
      !(bucket.get(lecture.day) || []).some(slot =>
        lecture.start_time < slot.end && lecture.end_time > slot.start,
      ),
    )
  }

  function search(index: number) {
    if (index === choices.length) {
      plans.push(selected.map(selection => ({ ...selection })))
      return
    }
    for (const bundle of choices[index].bundles) {
      if (!canPlace(bundle.lectures)) continue
      for (const lecture of bundle.lectures) {
        if (!bucket.has(lecture.day)) bucket.set(lecture.day, [])
        bucket.get(lecture.day)!.push({ start: lecture.start_time, end: lecture.end_time })
      }
      selected.push(bundle.selection)
      search(index + 1)
      selected.pop()
      for (const lecture of bundle.lectures) bucket.get(lecture.day)!.pop()
    }
  }

  search(0)
  return plans.length ? { status: 'ok', plans } : { status: 'no-solution', plans: [] }
}

export function getMaxDayNum(courseList: CartCourse[], plan: PlanSelection[]): number {
  let maxDay = 5
  for (const selection of plan) {
    const bundle = courseList[selection.courseIndex]?.layers[selection.layer]
      ?.find(item => item.id === selection.bundleId)
    for (const section of bundle?.sections || []) {
      for (const lecture of section.lectures) maxDay = Math.max(maxDay, lecture.day)
    }
  }
  return maxDay
}
```

- [ ] **Step 5: Run scheduler tests**

Run:

```bash
npm run test:scheduler -- tests/scheduler/solver.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the solver fix**

Run:

```bash
git add package.json package-lock.json pnpm-lock.yaml utils/scheduler.ts tests/scheduler/solver.test.ts
git commit -m "fix: solve schedule plans across course layers"
```

## Task 3: Add Pure Guest Cart Helpers

**Files:**
- Create: `utils/schedulerCart.ts`
- Create: `tests/scheduler/cart.test.ts`

- [ ] **Step 1: Write failing guest-cart tests**

Create `tests/scheduler/cart.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  addGuestCourse,
  removeGuestCourse,
  setGuestBundleEnabled,
  setGuestCourseEnabled,
  setGuestLayerEnabled,
} from '../../utils/schedulerCart'
import type { CourseDetail } from '../../utils/scheduler'

const detail: CourseDetail = {
  course_code: 'AIAA1001',
  course_title: 'AI Basics',
  course_title_abbr: 'AI',
  credit: 3,
  subject: 'AIAA',
  catalog_number: '1001',
  course_desc: 'Intro',
  pre_requirement: null,
  co_requirement: null,
  exclusion: null,
  pg_course: false,
  klms_course: false,
  sections: [
    {
      semester_id: '2530', section_id: 'L01', name: 'L01', bundle: 1, layer: 0,
      quota: 10, section_type: 'L', is_main: true, lectures: [],
    },
    {
      semester_id: '2530', section_id: 'T01', name: 'T01', bundle: 1, layer: 1,
      quota: 10, section_type: 'T', is_main: false, lectures: [],
    },
  ],
}

describe('guest cart helpers', () => {
  it('normalizes public course detail into the same layer shape as server carts', () => {
    const cart = addGuestCourse([], detail)
    expect(cart).toHaveLength(1)
    expect(cart[0].enabled).toBe(false)
    expect(Object.keys(cart[0].layers)).toEqual(['0', '1'])
  })

  it('immutably updates course, bundle, layer, and remove state', () => {
    const original = addGuestCourse([], detail)
    const enabled = setGuestCourseEnabled(original, 'AIAA1001', true)
    const bundleOff = setGuestBundleEnabled(enabled, 'AIAA1001', 1, 0, false)
    const layerOff = setGuestLayerEnabled(bundleOff, 'AIAA1001', 1, false)
    expect(original[0].enabled).toBe(false)
    expect(bundleOff[0].layers[0][0].enabled).toBe(false)
    expect(layerOff[0].layers[1][0].enabled).toBe(false)
    expect(removeGuestCourse(layerOff, 'AIAA1001')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

Run:

```bash
npm run test:scheduler -- tests/scheduler/cart.test.ts
```

Expected: FAIL because `utils/schedulerCart.ts` does not exist.

- [ ] **Step 3: Implement normalized immutable guest-cart helpers**

Create `utils/schedulerCart.ts`:

```ts
import type { CartCourse, CourseDetail } from './scheduler'

export function cartCourseFromDetail(detail: CourseDetail): CartCourse {
  const layers: CartCourse['layers'] = {}
  for (const section of detail.sections) {
    if (!layers[section.layer]) layers[section.layer] = []
    let bundle = layers[section.layer].find(item => item.id === section.bundle)
    if (!bundle) {
      bundle = { id: section.bundle, layer: section.layer, enabled: true, sections: [] }
      layers[section.layer].push(bundle)
    }
    bundle.sections.push(section)
  }
  for (const bundles of Object.values(layers)) bundles.sort((a, b) => a.id - b.id)
  return {
    course_code: detail.course_code,
    course_title: detail.course_title,
    credit: detail.credit,
    subject: detail.subject,
    pg_course: detail.pg_course,
    klms_course: detail.klms_course,
    enabled: false,
    layers,
  }
}

export function addGuestCourse(cart: CartCourse[], detail: CourseDetail): CartCourse[] {
  if (cart.some(course => course.course_code === detail.course_code)) return cart
  return [...cart, cartCourseFromDetail(detail)].sort((a, b) =>
    a.course_code.localeCompare(b.course_code),
  )
}

export function removeGuestCourse(cart: CartCourse[], courseCode: string): CartCourse[] {
  return cart.filter(course => course.course_code !== courseCode)
}

export function setGuestCourseEnabled(cart: CartCourse[], courseCode: string, enabled: boolean) {
  return cart.map(course => course.course_code === courseCode ? { ...course, enabled } : course)
}

export function setGuestBundleEnabled(
  cart: CartCourse[], courseCode: string, bundleId: number, layer: number, enabled: boolean,
) {
  return cart.map(course => course.course_code !== courseCode ? course : {
    ...course,
    layers: {
      ...course.layers,
      [layer]: course.layers[layer].map(bundle => bundle.id === bundleId ? { ...bundle, enabled } : bundle),
    },
  })
}

export function setGuestLayerEnabled(cart: CartCourse[], courseCode: string, layer: number, enabled: boolean) {
  return cart.map(course => course.course_code !== courseCode ? course : {
    ...course,
    layers: {
      ...course.layers,
      [layer]: course.layers[layer].map(bundle => ({ ...bundle, enabled })),
    },
  })
}
```

- [ ] **Step 4: Run all scheduler unit tests**

Run:

```bash
npm run test:scheduler
```

Expected: PASS.

- [ ] **Step 5: Commit guest cart helpers**

Run:

```bash
git add utils/schedulerCart.ts tests/scheduler/cart.test.ts
git commit -m "feat: add browser-local scheduler cart helpers"
```

## Task 4: Harden Scheduler API Persistence

**Files:**
- Modify: `../back-end-schedule-migration/tests/test_scheduler_routes.py`
- Modify: `../back-end-schedule-migration/app/routes/scheduler.py`

- [ ] **Step 1: Add failing scheduler route tests**

Append tests that exercise exact failure modes:

```py
def test_add_to_cart_rejects_missing_json(client, auth_headers, seed_courses):
    resp = client.post('/scheduler/cart/2530/add', headers=auth_headers)
    assert resp.status_code == 400
    assert resp.get_json() == {'error': 'Invalid JSON body'}


def test_add_to_cart_rejects_course_without_sections(client, auth_headers, app):
    with app.app_context():
        db.session.add(Course(code='EMPTY1001', name='No Sections', credits=3))
        db.session.commit()
    resp = client.post('/scheduler/cart/2530/add',
                       json={'course_code': 'EMPTY1001'},
                       headers=auth_headers)
    assert resp.status_code == 422
    assert resp.get_json() == {'error': 'Course has no sections for semester'}


def test_cart_serialization_orders_layers_bundles_and_sections(client, auth_headers, app):
    with app.app_context():
        course = Course(code='SORT1001', name='Sort Me', credits=3)
        db.session.add(course)
        db.session.flush()
        db.session.add_all([
            SchedulerSection(semester_id='2530', section_id='SORT-T02', course_id=course.id,
                             name='T02', bundle=2, layer=1, quota=10, section_type='T', is_main=False),
            SchedulerSection(semester_id='2530', section_id='SORT-L01', course_id=course.id,
                             name='L01', bundle=1, layer=0, quota=10, section_type='L', is_main=True),
        ])
        db.session.commit()
    client.post('/scheduler/cart/2530/add', json={'course_code': 'SORT1001'}, headers=auth_headers)
    data = client.get('/scheduler/cart/2530', headers=auth_headers).get_json()[0]
    assert list(data['layers']) == ['0', '1']
    assert data['layers']['0'][0]['sections'][0]['section_id'] == 'SORT-L01'


def test_cart_is_isolated_between_users(client, auth_headers, seed_courses, app):
    client.post('/scheduler/cart/2530/add', json={'course_code': 'TEST1001'}, headers=auth_headers)
    with app.app_context():
        role = UserRole.query.filter_by(name='user').first()
        other = User(username='other_scheduler_user', email='other_scheduler@hkust-gz.edu.cn',
                     email_verified=True, role_id=role.id)
        other.set_password('password123')
        db.session.add(other)
        db.session.commit()
        token = create_access_token(identity=str(other.id))
    other_headers = {'Authorization': f'Bearer {token}'}
    assert client.get('/scheduler/cart/2530', headers=other_headers).get_json() == []
```

- [ ] **Step 2: Run focused backend tests and confirm failures**

Run from the back-end worktree:

```bash
source .codex-venv/bin/activate 2>/dev/null || source venv/bin/activate
pytest tests/test_scheduler_routes.py -q
```

Expected: FAIL on missing JSON and missing-section behavior.

- [ ] **Step 3: Add API validation helpers and deterministic ordering**

In `app/routes/scheduler.py`, add:

```py
def _json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({'error': 'Invalid JSON body'}), 400)
    return data, None


def _sections_for_course(course_id, semester):
    return (
        SchedulerSection.query
        .filter_by(course_id=course_id, semester_id=semester)
        .order_by(SchedulerSection.layer, SchedulerSection.bundle, SchedulerSection.section_id)
        .all()
    )
```

Use `_json_body()` in add and toggle routes. Return the helper error when the
body is missing or not a JSON object. In `add_to_cart()`, load sections before
creating a cart and return:

```py
if not sections:
    return jsonify({'error': 'Course has no sections for semester'}), 422
```

In `_serialize_cart_item()`:

- use `_sections_for_course(course.id, cart_item.semester_id)`;
- order lectures by day, start time, end time, and id;
- order bundle rows by layer and bundle id;
- insert layers in ascending integer order.

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
pytest tests/test_scheduler_routes.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit API hardening**

Run:

```bash
git add app/routes/scheduler.py tests/test_scheduler_routes.py
git commit -m "fix: validate scheduler cart persistence"
```

## Task 5: Make Snapshot Import Transactional And Verifiable

**Files:**
- Rewrite: `../back-end-schedule-migration/app/scripts/migrate_scheduler_data.py`
- Create: `../back-end-schedule-migration/tests/test_scheduler_data_import.py`

- [ ] **Step 1: Write failing importer tests**

Create `tests/test_scheduler_data_import.py`. Use a SQLite source engine and
create only public old-site tables:

```py
import pytest
import app.scripts.migrate_scheduler_data as importer
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from app import create_app
from app.config import Config
from app.extensions import db
from app.scripts.migrate_scheduler_data import import_snapshot, SnapshotValidationError
from app.models.course import Course
from app.models.scheduler_section import SchedulerSection
from app.models.scheduler_lecture import SchedulerLecture


@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(_type, _compiler, **_kw):
    return 'JSON'


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    CACHE_TYPE = 'SimpleCache'
    ENABLE_BACKGROUND_TASKS = False
    JWT_SECRET_KEY = 'test-secret'


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setenv('DASHSCOPE_API_KEY', 'test-key')
    monkeypatch.setenv('OPENAI_API_KEY', 'test-key')
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def source_connection():
    engine = create_engine('sqlite:///:memory:')
    conn = engine.connect()
    for statement in [
        'CREATE TABLE course (course_code TEXT, course_title TEXT, course_title_abbr TEXT, '
        'course_desc TEXT, pre_requirement TEXT, co_requirement TEXT, exclusion TEXT, credit INTEGER, '
        'subject TEXT, catalog_number TEXT, pg_course BOOLEAN, klms_course BOOLEAN, vector TEXT)',
        'CREATE TABLE section (semester_id TEXT, section_id TEXT, course_code TEXT, name TEXT, '
        'bundle INTEGER, layer INTEGER, quota INTEGER, section_type TEXT, is_main BOOLEAN)',
        'CREATE TABLE lecture (semester_id TEXT, section_id TEXT, day INTEGER, start_time INTEGER, '
        'end_time INTEGER, room TEXT, instructor TEXT)',
        'CREATE TABLE map_component (id TEXT, node_type BOOLEAN, x_coordinate INTEGER, '
        'y_coordinate INTEGER, category INTEGER)',
        'CREATE TABLE map_line (start_id TEXT, end_id TEXT, line_type BOOLEAN, '
        'x_coordinate INTEGER, category INTEGER)',
    ]:
        conn.execute(text(statement))
    conn.execute(text("INSERT INTO course VALUES "
                      "('AIAA1001','AI Basics','AI','Intro',NULL,NULL,NULL,3,'AIAA','1001',0,0,'A')"))
    conn.execute(text("INSERT INTO section VALUES ('2530','L01','AIAA1001','L01',1,0,10,'L',1)"))
    conn.execute(text("INSERT INTO lecture VALUES ('2530','L01',1,900,1030,'R','I')"))
    conn.execute(text("INSERT INTO map_component VALUES ('AIAA1001',1,1,1,0)"))
    conn.commit()
    return conn


def test_import_snapshot_is_repeatable(app):
    conn = source_connection()
    with app.app_context():
        first = import_snapshot(conn)
        second = import_snapshot(conn)
        assert first['sections'] == 1
        assert second['sections'] == 1
        assert Course.query.filter_by(code='AIAA1001').count() == 1
        assert SchedulerSection.query.count() == 1
        assert SchedulerLecture.query.count() == 1


def test_import_snapshot_rejects_orphan_lecture_without_mutating_destination(app):
    conn = source_connection()
    conn.execute(text("INSERT INTO lecture VALUES ('2530','MISSING',1,900,1030,'R','I')"))
    conn.commit()
    with app.app_context():
        db.session.add(Course(code='KEEP1001', name='Keep', credits=3))
        db.session.commit()
        with pytest.raises(SnapshotValidationError):
            import_snapshot(conn)
        assert Course.query.filter_by(code='KEEP1001').one()
        assert SchedulerSection.query.count() == 0


def test_import_snapshot_rolls_back_when_destination_validation_fails(app, monkeypatch):
    conn = source_connection()
    with app.app_context():
        def fail_validation(_snapshot, _summary):
            raise SnapshotValidationError('forced destination failure')
        monkeypatch.setattr(importer, 'validate_destination', fail_validation)
        with pytest.raises(SnapshotValidationError):
            import_snapshot(conn)
        assert Course.query.filter_by(code='AIAA1001').count() == 0
        assert SchedulerSection.query.count() == 0
```

- [ ] **Step 2: Run importer tests and confirm they fail**

Run:

```bash
pytest tests/test_scheduler_data_import.py -q
```

Expected: FAIL because `import_snapshot` and `SnapshotValidationError` do not
exist.

- [ ] **Step 3: Refactor importer around one validated transaction**

Rewrite `app/scripts/migrate_scheduler_data.py` around:

```py
import argparse
import json
from dataclasses import dataclass
from sqlalchemy import create_engine, text
from app import create_app
from app.extensions import db
from app.models.course import Course
from app.models.scheduler_section import SchedulerSection
from app.models.scheduler_lecture import SchedulerLecture
from app.models.scheduler_map import SchedulerMapComponent, SchedulerMapLine


class SnapshotValidationError(RuntimeError):
    pass


@dataclass
class Snapshot:
    courses: list
    sections: list
    lectures: list
    components: list
    lines: list


def load_snapshot(source_conn):
    return Snapshot(
        courses=source_conn.execute(text(
            'SELECT course_code, course_title, course_title_abbr, course_desc, '
            'pre_requirement, co_requirement, exclusion, credit, subject, '
            'catalog_number, pg_course, klms_course, vector FROM course'
        )).fetchall(),
        sections=source_conn.execute(text(
            'SELECT semester_id, section_id, course_code, name, bundle, layer, '
            'quota, section_type, is_main FROM section'
        )).fetchall(),
        lectures=source_conn.execute(text(
            'SELECT semester_id, section_id, day, start_time, end_time, room, instructor FROM lecture'
        )).fetchall(),
        components=source_conn.execute(text(
            'SELECT id, node_type, x_coordinate, y_coordinate, category FROM map_component'
        )).fetchall(),
        lines=source_conn.execute(text(
            'SELECT start_id, end_id, line_type, x_coordinate, category FROM map_line'
        )).fetchall(),
    )


def validate_snapshot(snapshot):
    course_codes = {row[0] for row in snapshot.courses}
    section_keys = {(row[0], row[1]) for row in snapshot.sections}
    component_ids = {row[0] for row in snapshot.components}
    if not snapshot.sections:
        raise SnapshotValidationError('snapshot contains no sections')
    for row in snapshot.sections:
        if row[2] not in course_codes:
            raise SnapshotValidationError(f'section {row[1]} references missing course {row[2]}')
    for row in snapshot.lectures:
        if (row[0], row[1]) not in section_keys:
            raise SnapshotValidationError(f'lecture references missing section {row[0]}/{row[1]}')
    for row in snapshot.lines:
        if row[0] not in component_ids or row[1] not in component_ids:
            raise SnapshotValidationError(f'map line references missing component {row[0]}->{row[1]}')


def validate_destination(snapshot, summary):
    expected = {
        'sections': len(snapshot.sections),
        'lectures': len(snapshot.lectures),
        'map_components': len(snapshot.components),
        'map_lines': len(snapshot.lines),
    }
    actual = {key: summary[key] for key in expected}
    if actual != expected:
        raise SnapshotValidationError(f'destination counts do not match snapshot: {actual} != {expected}')


def import_snapshot(source_conn):
    snapshot = load_snapshot(source_conn)
    validate_snapshot(snapshot)
    try:
        SchedulerMapLine.query.delete()
        SchedulerMapComponent.query.delete()
        SchedulerLecture.query.delete()
        SchedulerSection.query.delete()

        for row in snapshot.courses:
            course = Course.query.filter_by(code=row[0]).first() or Course(code=row[0], name=row[1], credits=row[7])
            course.name, course.course_title_abbr, course.description = row[1], row[2], row[3] or ''
            course.pre_requirement, course.co_requirement, course.exclusion = row[4], row[5], row[6]
            course.credits, course.subject, course.catalog_number = row[7], row[8], row[9]
            course.pg_course, course.klms_course, course.vector = row[10], row[11], row[12]
            db.session.add(course)
        db.session.flush()

        courses = {course.code: course for course in Course.query.all()}
        for row in snapshot.sections:
            db.session.add(SchedulerSection(
                semester_id=row[0], section_id=row[1], course_id=courses[row[2]].id,
                name=row[3], bundle=row[4], layer=row[5], quota=row[6],
                section_type=row[7], is_main=row[8],
            ))
        db.session.flush()

        for row in snapshot.lectures:
            db.session.add(SchedulerLecture(
                semester_id=row[0], section_id=row[1], day=row[2], start_time=row[3],
                end_time=row[4], room=row[5], instructor=row[6],
            ))
        for row in snapshot.components:
            db.session.add(SchedulerMapComponent(
                id=row[0], node_type=row[1], x_coordinate=row[2], y_coordinate=row[3], category=row[4],
            ))
        db.session.flush()
        for row in snapshot.lines:
            db.session.add(SchedulerMapLine(
                start_id=row[0], end_id=row[1], line_type=row[2], x_coordinate=row[3], category=row[4],
            ))
        db.session.flush()

        summary = {
            'courses': len(snapshot.courses),
            'sections': SchedulerSection.query.count(),
            'lectures': SchedulerLecture.query.count(),
            'map_components': SchedulerMapComponent.query.count(),
            'map_lines': SchedulerMapLine.query.count(),
        }
        validate_destination(snapshot, summary)
        db.session.commit()
        return summary
    except Exception:
        db.session.rollback()
        raise
```

Keep `main()` small:

```py
def main():
    parser = argparse.ArgumentParser(description='Import public scheduler data from CoursePlan.search')
    parser.add_argument('--source', required=True, help='Read-only source PostgreSQL connection string')
    args = parser.parse_args()
    app = create_app()
    with create_engine(args.source).connect() as source_conn, app.app_context():
        if source_conn.dialect.name == 'postgresql':
            source_conn.execute(text('SET TRANSACTION READ ONLY'))
        print(json.dumps(import_snapshot(source_conn), ensure_ascii=True, sort_keys=True))
```

- [ ] **Step 4: Run importer and scheduler tests**

Run:

```bash
pytest tests/test_scheduler_data_import.py tests/test_scheduler_routes.py tests/test_scheduler_schema_support.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit transactional importer**

Run:

```bash
git add app/scripts/migrate_scheduler_data.py tests/test_scheduler_data_import.py
git commit -m "fix: import scheduler snapshots transactionally"
```

## Task 6: Introduce Guest/Auth Cart Adapter And Rename Main-Site Routes

**Files:**
- Modify: `composables/useScheduler.ts`
- Create: `composables/useSchedulerCart.ts`
- Move: `pages/scheduler/index.vue` to `pages/schedule/index.vue`
- Move: `pages/scheduler/dashboard/index.vue` to `pages/schedule/dashboard/index.vue`
- Move: `pages/scheduler/dashboard/[semester].vue` to `pages/schedule/dashboard/[semester].vue`
- Move: `pages/scheduler/map/index.vue` to `pages/schedule/map/index.vue`
- Modify: `components/home/KeguangSidebar.vue`

- [ ] **Step 1: Route public scheduler calls through `fetchPublic`**

In `composables/useScheduler.ts`, initialize:

```ts
const { fetchPublic, fetchWithAuth } = useApi()
```

Use `fetchPublic()` for semesters, search, detail, and map reads. Keep
`fetchWithAuth()` for `/api/scheduler/cart/*`.

- [ ] **Step 2: Add auth-selecting cart composable**

Create `composables/useSchedulerCart.ts`:

```ts
import { ref, type Ref } from 'vue'
import type { CartCourse } from '~/utils/scheduler'
import {
  addGuestCourse, removeGuestCourse, setGuestBundleEnabled,
  setGuestCourseEnabled, setGuestLayerEnabled,
} from '~/utils/schedulerCart'

export function useSchedulerCart(semesterId: string, loggedIn: Ref<boolean>, initial: CartCourse[]) {
  const api = useScheduler()
  const courses = ref<CartCourse[]>([...initial])

  async function refresh() {
    if (loggedIn.value) courses.value = await api.getCart(semesterId)
  }
  async function add(code: string) {
    if (loggedIn.value) await api.addToCart(semesterId, code)
    else courses.value = addGuestCourse(courses.value, await api.getCourseDetail(code, semesterId))
    await refresh()
  }
  async function remove(code: string) {
    if (loggedIn.value) await api.removeFromCart(semesterId, code)
    else courses.value = removeGuestCourse(courses.value, code)
    await refresh()
  }
  async function toggleCourse(code: string, enabled: boolean) {
    if (loggedIn.value) await api.toggleCourse(semesterId, code, enabled)
    else courses.value = setGuestCourseEnabled(courses.value, code, enabled)
    await refresh()
  }
  async function toggleBundle(code: string, bundleId: number, layer: number, enabled: boolean) {
    if (loggedIn.value) await api.toggleBundle(semesterId, code, bundleId, layer, enabled)
    else courses.value = setGuestBundleEnabled(courses.value, code, bundleId, layer, enabled)
    await refresh()
  }
  async function toggleLayer(code: string, layer: number, enabled: boolean) {
    if (loggedIn.value) await api.toggleLayer(semesterId, code, layer, enabled)
    else courses.value = setGuestLayerEnabled(courses.value, code, layer, enabled)
    await refresh()
  }

  return { courses, refresh, add, remove, toggleCourse, toggleBundle, toggleLayer }
}
```

- [ ] **Step 3: Rename route directory and update links**

Run:

```bash
mkdir -p pages/schedule
git mv pages/scheduler/index.vue pages/schedule/index.vue
git mv pages/scheduler/dashboard pages/schedule/dashboard
git mv pages/scheduler/map pages/schedule/map
```

Replace page navigation strings:

```ts
getLocalePath('/schedule/dashboard')
getLocalePath(`/schedule/dashboard/${sem.id}`)
```

In `components/home/KeguangSidebar.vue`, use:

```vue
<NuxtLink
  :to="getLocalePath('/schedule')"
  :class="{ active: isActive('/schedule') }"
>
```

- [ ] **Step 4: Update semester page to load only logged-in server carts**

In `pages/schedule/dashboard/[semester].vue`, keep guest initial state empty and
load JWT carts only for logged-in users:

```ts
onMounted(async () => {
  try {
    if (isLoggedIn.value) courseList.value = await getCart(semesterId)
  } finally {
    loading.value = false
  }
})
```

The dashboard adapter owns subsequent guest mutations.

- [ ] **Step 5: Check no user-facing `/scheduler` page routes remain**

Run:

```bash
rg -n '/scheduler' pages components composables
```

Expected: only API paths under `/api/scheduler/*` remain. There are no
user-facing page-route matches.

- [ ] **Step 6: Run unit tests and build**

Run:

```bash
npm run test:scheduler
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit route and adapter changes**

Run:

```bash
git add composables/useScheduler.ts composables/useSchedulerCart.ts pages/schedule components/home/KeguangSidebar.vue
git commit -m "feat: mount schedule assistant at internal route"
```

## Task 7: Complete Dashboard Behavior, Course Detail, And I18n

**Files:**
- Modify: `components/scheduler/SchedulerDashboard.vue`
- Modify: `components/scheduler/SchedulerTimetable.vue`
- Modify: `components/scheduler/SchedulerSidePanel.vue`
- Modify: `components/scheduler/SchedulerCourseCard.vue`
- Modify: `components/scheduler/SchedulerCartPanel.vue`
- Modify: `components/scheduler/SchedulerBottomPanel.vue`
- Create: `components/scheduler/SchedulerCourseDetail.vue`
- Modify: `pages/schedule/dashboard/index.vue`
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/zh.json`

- [ ] **Step 1: Expand scheduler locale keys in both languages**

Under the existing `scheduler` object in both locale files, add matching keys:

```json
{
  "semesters": "Available semesters",
  "sections": "{count} sections",
  "loading": "Loading...",
  "loadingMap": "Loading map...",
  "noSemesters": "No semesters available",
  "searchPlaceholder": "Search by course code or title",
  "credits": "{count} credits",
  "main": "Main",
  "klms": "KLMS",
  "all": "All",
  "none": "None",
  "layer": "Layer {layer}",
  "details": "Course details",
  "description": "Description",
  "prerequisites": "Prerequisites",
  "corequisites": "Co-requisites",
  "exclusions": "Exclusions",
  "notAvailable": "Not available",
  "emptyCartHint": "Open the cart to add courses",
  "allDisabled": "Enable at least one course",
  "unavailableLayer": "{course} has no available bundle in layer {layer}",
  "noSolution": "No conflict-free timetable found",
  "guestHint": "You are not logged in. Changes will not be saved.",
  "close": "Close",
  "searchFailed": "Course search failed",
  "cartFailed": "Unable to load your course cart",
  "mapFailed": "Unable to load the course map",
  "displayCourseName": "Course name",
  "displaySection": "Section",
  "displayLocation": "Location",
  "displayInstructor": "Instructor",
  "displayDuration": "Duration"
}
```

Add equivalent Chinese values:

```json
{
  "semesters": "可用学期",
  "sections": "{count} 个班级",
  "loading": "加载中...",
  "loadingMap": "正在加载课程地图...",
  "noSemesters": "暂无可用学期",
  "searchPlaceholder": "按课程代码或名称搜索",
  "credits": "{count} 学分",
  "main": "主课程",
  "klms": "KLMS",
  "all": "全部启用",
  "none": "全部停用",
  "layer": "层级 {layer}",
  "details": "课程详情",
  "description": "课程简介",
  "prerequisites": "先修要求",
  "corequisites": "共修要求",
  "exclusions": "互斥课程",
  "notAvailable": "暂无",
  "emptyCartHint": "打开购物车添加课程",
  "allDisabled": "请至少启用一门课程",
  "unavailableLayer": "{course} 的层级 {layer} 没有可用班级组合",
  "noSolution": "未找到无冲突课表",
  "guestHint": "你尚未登录，本次修改不会保存。",
  "close": "关闭",
  "searchFailed": "课程搜索失败",
  "cartFailed": "无法加载课程购物车",
  "mapFailed": "无法加载课程地图",
  "displayCourseName": "课程名称",
  "displaySection": "班级",
  "displayLocation": "地点",
  "displayInstructor": "教师",
  "displayDuration": "时间"
}
```

- [ ] **Step 2: Drive dashboard state through the cart adapter and structured solver**

In `SchedulerDashboard.vue`:

- replace the local copied course list with
  `useSchedulerCart(props.semesterId, toRef(props, 'isLoggedIn'), props.initialCourseList)`;
- derive `solverResult = computed(() => solvePlans(courses.value, bannedPeriods.value))`;
- derive plans only when `solverResult.status === 'ok'`;
- derive `maxDayNum` through
  `getMaxDayNum(courses.value, currentPlan.value)`;
- translate result messages using `t('scheduler.*')`;
- open a course-detail modal after fetching `getCourseDetail(code, semesterId)`;
- expose `displayOptions` to the side panel.

Use this message mapping:

```ts
const planMessage = computed(() => {
  switch (solverResult.value.status) {
    case 'empty-cart': return t('scheduler.emptyCart')
    case 'all-disabled': return t('scheduler.allDisabled')
    case 'unavailable-layer':
      return t('scheduler.unavailableLayer', {
        course: solverResult.value.courseCode,
        layer: solverResult.value.layer,
      })
    case 'no-solution': return t('scheduler.noSolution')
    case 'ok': return null
  }
})
```

- [ ] **Step 3: Correct timetable lecture-day rendering**

In `SchedulerTimetable.vue`, calculate lecture block placement with:

```ts
const left = timeColWidth + decorationWidth + (block.day - 1) * dayColWidth.value
```

Keep banned-period cells zero based. Remove red hardcoded RGBA values in favor
of CSS custom properties declared locally from existing theme variables:

```scss
--scheduler-danger-soft: color-mix(in srgb, var(--error-color, #ef4444) 12%, transparent);
```

- [ ] **Step 4: Add course detail modal**

Create `SchedulerCourseDetail.vue` with props:

```ts
defineProps<{ visible: boolean; course: CourseDetail | null }>()
defineEmits<{ (e: 'close'): void }>()
```

Render code, title, credits, description, prerequisites, co-requisites, and
exclusions. Use only `t('scheduler.*')` for labels and
`t('scheduler.notAvailable')` for missing values.

- [ ] **Step 5: Translate controls and add display settings**

Update cart, course card, side panel, bottom panel, and semester page:

- replace every user-facing hardcoded English string with `t('scheduler.*')`;
- expose course detail action from each course card;
- show display-option checkboxes in the side panel;
- prevent bottom-panel navigation when `totalPlans === 0`;
- replace newly introduced hardcoded colors with theme variables or local
  `color-mix()` expressions.

- [ ] **Step 6: Run i18n scans, unit tests, and build**

Run:

```bash
npm run i18n:check
npm run test:scheduler
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit dashboard completion**

Run:

```bash
git add components/scheduler pages/schedule/dashboard i18n/locales/en.json i18n/locales/zh.json
git commit -m "feat: complete bilingual schedule dashboard"
```

## Task 8: Complete Bilingual Course Map

**Files:**
- Modify: `composables/useScheduler.ts`
- Modify: `components/scheduler/SchedulerMap.vue`
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/zh.json`

- [ ] **Step 1: Add public map methods**

In `composables/useScheduler.ts`, add:

```ts
async function getMapComponents() {
  const resp = await fetchPublic('/api/scheduler/map/components')
  if (!resp.ok) throw new Error('Map components failed')
  return resp.json()
}

async function getMapLines() {
  const resp = await fetchPublic('/api/scheduler/map/lines')
  if (!resp.ok) throw new Error('Map lines failed')
  return resp.json()
}

async function getMapCourses() {
  const resp = await fetchPublic('/api/scheduler/map/courses')
  if (!resp.ok) throw new Error('Map courses failed')
  return resp.json()
}
```

Return all three functions from the composable.

- [ ] **Step 2: Fetch labels and show translated map states**

In `SchedulerMap.vue`:

- call the three public methods in `Promise.all`;
- build `courseTitleByCode` from map-course results;
- render title abbreviation below each course code;
- translate loading, search placeholder, empty result, and failure states;
- keep prerequisite highlighting behavior;
- replace new hardcoded UI colors with CSS variables or
  `color-mix()` expressions.

Add matching locale keys:

```json
{
  "mapSearchPlaceholder": "Search the course map",
  "mapEmpty": "No matching courses"
}
```

Chinese:

```json
{
  "mapSearchPlaceholder": "搜索课程地图",
  "mapEmpty": "没有匹配的课程"
}
```

- [ ] **Step 3: Run checks**

Run:

```bash
npm run i18n:check
npm run test:scheduler
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit map completion**

Run:

```bash
git add composables/useScheduler.ts components/scheduler/SchedulerMap.vue i18n/locales/en.json i18n/locales/zh.json
git commit -m "feat: complete bilingual schedule map"
```

## Task 9: Verify Back-End, Deploy Development API, And Import Public Snapshot

**Files:**
- Read only after commit: back-end worktree
- Environment secret: `COURSEPLAN_READONLY_DATABASE_URL`

- [ ] **Step 1: Run backend verification**

Run from the back-end worktree:

```bash
source .codex-venv/bin/activate 2>/dev/null || source venv/bin/activate
pytest tests/test_scheduler_models.py tests/test_scheduler_routes.py tests/test_scheduler_schema_support.py tests/test_scheduler_data_import.py -q
git status --short
```

Expected:

- PASS.
- Clean back-end worktree.

- [ ] **Step 2: Push the back-end branch to `main` only after reviewing commits**

Review:

```bash
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

Merge the verified commits into back-end `main` and push:

```bash
git push origin main
```

Expected: GitHub Actions deploys `https://dev.unikorn.axfff.com`.

- [ ] **Step 3: Wait for API deployment and recheck schema health**

Run:

```bash
until curl -fsS https://dev.unikorn.axfff.com/api/scheduler/semesters >/tmp/unikorn-scheduler-semesters.json; do sleep 5; done
cat /tmp/unikorn-scheduler-semesters.json
```

Expected: valid JSON, even if still empty before snapshot import.

- [ ] **Step 4: Stop if the old database read-only URL is unavailable**

Required environment variable:

```bash
test -n "$COURSEPLAN_READONLY_DATABASE_URL"
```

Expected: exit code `0`.

If it is unavailable, report that implementation is complete but live snapshot
import and full browser data verification remain blocked pending the secure
read-only URL. Do not guess credentials and do not write a URL into any file.

- [ ] **Step 5: Import the public snapshot**

Run in the deployed back-end runtime or another approved environment connected
to the development destination database:

```bash
python -m app.scripts.migrate_scheduler_data --source "$COURSEPLAN_READONLY_DATABASE_URL"
```

Expected: one JSON summary containing non-zero `sections` and the imported
counts for lectures and map data.

- [ ] **Step 6: Validate live public scheduler data**

Run:

```bash
curl -fsS https://dev.unikorn.axfff.com/api/scheduler/semesters
curl -fsS 'https://dev.unikorn.axfff.com/api/scheduler/courses/search?query=AIAA&semester=2530&pageSize=2'
curl -fsS https://dev.unikorn.axfff.com/api/scheduler/map/components
curl -fsS https://dev.unikorn.axfff.com/api/scheduler/map/lines
```

Expected:

- semester list is non-empty;
- selected-semester search returns courses;
- map arrays are non-empty.

- [ ] **Step 7: Confirm old site survival after back-end deployment**

Run:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/home
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/dashboard/2530
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/map
```

Expected:

```text
200
200
200
```

## Task 10: Run Full Front-End Verification And Browser Acceptance

**Files:**
- Read only after commit: front-end worktree

- [ ] **Step 1: Run static front-end verification**

Run:

```bash
npm run i18n:check
npm run test:scheduler
npm run build
git status --short
```

Expected:

- PASS.
- Clean front-end worktree.

- [ ] **Step 2: Start local Nuxt only on port 3000**

Run:

```bash
npm run dev
```

Expected: Nuxt serves `http://localhost:3000`.

- [ ] **Step 3: Verify guest workflow with the Browser plugin**

Open `http://localhost:3000/schedule` and verify:

1. Redirect reaches `/schedule/dashboard`.
2. Semester list is populated.
3. Entering a semester reaches `/schedule/dashboard/2530`.
4. Guest banner is visible.
5. Search finds a known course.
6. Add does not produce a JWT error.
7. Course can be enabled.
8. A multi-layer course renders one bundle per layer in the timetable.
9. Banning Monday first period removes a Monday 09:00 lecture option.
10. Main/KLMS tabs, bundle toggles, display settings, and plan navigation work.

- [ ] **Step 4: Verify logged-in persistence**

Using an available UniKorn test account in the local browser:

1. Log in through the normal main-site flow.
2. Add a course.
3. Enable it and change a bundle selection.
4. Refresh the page.
5. Confirm cart and bundle state persist.

Do not create or expose credentials in repository files.

- [ ] **Step 5: Verify map and bilingual routes**

Open and inspect:

```text
http://localhost:3000/schedule/map
http://localhost:3000/en/schedule/dashboard
http://localhost:3000/en/schedule/map
```

Expected:

- map data renders;
- search narrows the graph;
- Chinese default routes and English prefixed routes contain no stray
  hardcoded scheduler copy;
- desktop and narrow viewport layouts remain usable.

- [ ] **Step 6: Stop the local development server**

Terminate `npm run dev` and verify port `3000` is released:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Expected: no output.

- [ ] **Step 7: Recheck old standalone site**

Run:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/home
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/dashboard/2530
curl -fsS -o /dev/null -w '%{http_code}\n' https://scheduler.unikorn.axfff.com/map
```

Expected: three `200` responses.

## Task 11: Report Development-Chain Completion Without Production Cutover

**Files:**
- Read only: front-end and back-end worktrees

- [ ] **Step 1: Summarize verified commits and checks**

Report:

- front-end commits;
- back-end commits pushed to `main`;
- backend test results;
- front-end test, build, and i18n results;
- live API import summary;
- local browser acceptance result;
- old-site survival checks;
- confirmation that the local dev server was stopped.

- [ ] **Step 2: State the deliberate production stop**

Report explicitly:

```text
The development chain is verified. The production main-site sidebar has not
been switched. scheduler.unikorn.axfff.com remains online as the stable
standalone route. Switching the production sidebar to /schedule requires a
separate approval.
```
