import { Api } from '~/types/api'

declare module '#app' {
  interface NuxtApp {
    $api: Api
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $api: Api
  }
}

export {}
