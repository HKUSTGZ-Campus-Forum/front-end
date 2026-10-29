# Public community routes

The former forum, post detail/editor, gugu, feedback and club/activity routes redirect permanently to the localized announcement list. Community rules redirect to the localized help guide. Both server request handling and client navigation enforce this policy; old query strings are discarded.

The footer links to announcements and no longer exposes community, feedback/activity aliases, or community rules. Historical data and the administrator announcement publishing flow remain available. This change retires public pages, not backend data or APIs.

Verification: `npm test -- tests/home/retired-community.test.ts`, production build, HTTP redirect checks for Chinese/English deep links and footer checks.
