import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => readFileSync(
  resolve(process.cwd(), relativePath),
  'utf8',
)

describe('global search preview contract', () => {
  it('limits dropdown posts to two before rendering later result groups', () => {
    const dropdown = readSource('components/ui/SearchDropdown.vue')

    expect(dropdown).toContain(
      'const previewPosts = computed(() => searchResults.value.posts.slice(0, 2))',
    )
    expect(dropdown).toContain('v-for="post in previewPosts"')
  })

  it('keeps the dedicated search page on the full paginated post results', () => {
    const searchPage = readSource('pages/search/index.vue')

    expect(searchPage).toContain("case 'posts': await searchPosts(query.trim(), page, sortBy.value)")
    expect(searchPage).toContain('v-for="post in detailedPosts"')
  })
})
