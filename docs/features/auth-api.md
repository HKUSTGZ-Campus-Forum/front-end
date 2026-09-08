# Profile display controls

Account settings now starts with `ProfileVisibilitySettings`: three account-backed switches for visitors to see saved works, published works and recent posts. Defaults are false/true/true. Owners keep access to all three sections; hidden sections show “Only visible to you.” Save is explicit, unavailable until loading succeeds, and failures preserve the draft for retry. Authentication restoration and request sequencing prevent a previous account's responses from replacing the current view. Labels, hints and feedback are bilingual, with mobile, keyboard and theme support.

User pages read `profile_visibility` from the profile API before fetching sections. Recent posts use `/api/users/<id>/profile-posts`; creator/saved collections use the corresponding MakerSpace profile endpoints. Guests never get the owner's selected reaction state. Catalog/forum publication is independent from these profile-only display controls.

The legacy “Connected apps” panel, loading calls, revoke handlers and unused CSS have been removed from `AccountSettings`. This does not revoke OAuth tokens or alter backend provider/SSO endpoints. Existing email management remains unchanged.

Requires the backend profile-visibility migration and APIs; production must await the specific database approval. Source: `components/setting/ProfileVisibilitySettings.vue`, `types/profileVisibility.ts`, `pages/setting/account.vue`, `pages/users/[id].vue`, `components/makerspace/ProfileSpaces.vue`. Local browser checks include saved settings after refresh, own/guest views, all-hidden state, desktop/mobile and English/Chinese controls.
