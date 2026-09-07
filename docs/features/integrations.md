# Assistant, recruitment, mascot and external runtimes

## Forum assistant

[AgentChat.client.vue](../../components/assistant/AgentChat.client.vue), [useAgentChat](../../composables/useAgentChat.ts) and [provider settings helpers](../../utils/agentChat.ts) implement the chat interface. Runtime visibility is configured in [Nuxt config](../../nuxt.config.ts) and [app.vue](../../app.vue).

Status is public. Authenticated conversations persist on the backend; guest chat uses a user-supplied provider and ephemeral context, with no backend conversation history. Provider settings, including a user-entered API key, are stored in that browser and sent to the backend per request. Server-provider keys never belong in public config. Keep the guest/authenticated request paths, history reset and provider error codes distinct. Backend context consists of permission-filtered public snippets; chat is not an arbitrary tool-execution console.

## Recruitment challenge

[Challenge page](../../pages/recruitment/index.vue), [private admin page](../../pages/recruitment/admin.vue), and [prompt helpers](../../utils/recruitment.ts) expose the newcomer guide, repeated runs, best-score ranking and admin receipt inspection. The server is the authority for eligibility, in-flight state, ranking and private fields.

The 100-unit prompt limit counts Han characters as 1 and other visible characters as 0.3; frontend normalization/counting must match backend exact tenths arithmetic. The challenge's actions are constrained by prompt strategy. Keep error/help text consistent with backend behavior rather than describing an unlimited model agent.

## Youyou mascot

[Overlay](../../components/mascot/Overlay.client.vue) owns visibility, interaction and quick actions. The default `/mascot/youyou/v1/youyou.model.json` asset uses [Youyou renderer](../../utils/mascotYouyou.ts) and [rig math](../../utils/mascot/rigMath.ts); explicitly configured Live2D models follow [mascotL2d](../../utils/mascotL2d.ts). See [Youyou asset guide](../youyou-mascot.md) for asset format/ownership. Do not call the default rig a compiled Live2D model. Preserve reduced-motion, hit areas, small-screen behavior and resource cleanup.

## MakerSpace

Ordinary creator repositories use [MakerSpace](makerspace.md), reached from the main sidebar. It owns discovery and private/review flows; it does not replace the independent TeamUp runtime.

## TeamUp

[TeamUpHostPage](../../components/teamup/TeamUpHostPage.vue) embeds the independent runtime below `/teamup/app/` within the UniKorn shell. It checks `/teamup/app/health`, then coordinates `teamup:ready`, height and navigate messages with host locale/theme/path messages. Message handling validates both origin and the iframe window; preserve those boundaries and loading/error recovery.

[Legacy matching middleware](../../middleware/legacy-matching-redirect.global.ts) redirects `/matching` and `/en/matching` to TeamUp with query/hash preservation. Existing matching pages/components remain in source but are not the current entry flow. Development proxies target the external TeamUp frontend on 3200 and API on 8200; those services are not created by running Nuxt here.

## MeetCampus and CoursePlan

[MeetCampus navigation helper](../../utils/meetcampusNavigation.ts) and [sidebar](../../components/home/KeguangSidebar.vue) retain a verified-account allowlisted hard-navigation link. Exact allowlist logic is in code; do not duplicate personal addresses in docs. World pages, models, jobs and assets belong to the private external repository. Production-side authorization is separate from UI link visibility.

The independent CoursePlan service remains outside this application's runtime, despite shared planner migration history. Do not change its deployment or data when implementing UniKorn UI work.

## Verification

Use [assistant](../../tests/assistant), [recruitment](../../tests/recruitment), [mascot](../../tests/mascot), [TeamUp](../../tests/teamup), [matching redirect](../../tests/home/legacy-matching-redirect.test.ts), and [MeetCampus navigation](../../tests/navigation/meetcampus-private-beta.test.ts) tests. External provider/runtime health requires its configured environment; mocks and source checks only verify the integration contract. Update backend and asset references with notable changes.
