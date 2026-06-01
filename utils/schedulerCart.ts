import type { CartCourse, CourseDetail } from './scheduler'

export function cartCourseFromDetail(detail: CourseDetail): CartCourse {
  const layers: CartCourse['layers'] = {}

  for (const section of detail.sections) {
    if (!layers[section.layer]) layers[section.layer] = []
    let bundle = layers[section.layer].find(item => item.id === section.bundle)
    if (!bundle) {
      bundle = {
        id: section.bundle,
        layer: section.layer,
        enabled: true,
        sections: [],
      }
      layers[section.layer].push(bundle)
    }
    bundle.sections.push(section)
  }

  for (const bundles of Object.values(layers)) {
    bundles.sort((a, b) => a.id - b.id)
  }

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
  cart: CartCourse[],
  courseCode: string,
  bundleId: number,
  layer: number,
  enabled: boolean,
) {
  return cart.map(course => course.course_code !== courseCode ? course : {
    ...course,
    layers: {
      ...course.layers,
      [layer]: course.layers[layer].map(bundle =>
        bundle.id === bundleId ? { ...bundle, enabled } : bundle,
      ),
    },
  })
}

export function setGuestLayerEnabled(
  cart: CartCourse[],
  courseCode: string,
  layer: number,
  enabled: boolean,
) {
  return cart.map(course => course.course_code !== courseCode ? course : {
    ...course,
    layers: {
      ...course.layers,
      [layer]: course.layers[layer].map(bundle => ({ ...bundle, enabled })),
    },
  })
}
