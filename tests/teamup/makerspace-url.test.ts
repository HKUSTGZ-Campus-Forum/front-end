import { describe, expect, it } from 'vitest'
import { makerSpaceUrl, teamUpInnerPath } from '../../utils/makerspaceUrl'
describe('canonical MakerSpace URLs', () => {
  it('shares only the fixed school prefix with an encoded suffix', () => {
    expect(makerSpaceUrl('teamup')).toBe('https://unikorn.hkust-gz.edu.cn/makerspace/teamup')
    expect(makerSpaceUrl('a/b?x=1')).toBe('https://unikorn.hkust-gz.edu.cn/makerspace/a%2Fb%3Fx%3D1')
  })
  it('keeps localized and nested TeamUp navigation inside its public space', () => {
    expect(teamUpInnerPath('/makerspace/teamup')).toBe('/')
    expect(teamUpInnerPath('/en/makerspace/teamup/groups/42')).toBe('/groups/42')
    expect(teamUpInnerPath('/makerspace/teamup/')).toBe('/')
    expect(teamUpInnerPath('/makerspace/teamup-other')).toBe('/')
    expect(teamUpInnerPath('/en/teamup/groups/42', '/teamup')).toBe('/groups/42')
  })
})
