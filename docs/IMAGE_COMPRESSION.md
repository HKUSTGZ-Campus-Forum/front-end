# Image preparation and upload

The current upload contract is in [community/files](features/community.md). [imageCompression.ts](../utils/imageCompression.ts) owns compression options and presets; [uploadPreparation.ts](../utils/uploadPreparation.ts) bounds preparation; [useFileUpload.ts](../composables/useFileUpload.ts) applies size checks, signing, upload and completion.

Compression failure/timeout can fall back to the original image, subject to upload size limits. Keep reported progress monotonic across preparation, signing, uploading and verification; do not report 100% before server completion succeeds. Do not duplicate preset numeric values here: read the source when changing quality, dimensions or limits.

Validate [preparation tests](../tests/file-upload/preparation.test.ts), [progress tests](../tests/file-upload/progress.test.ts), [error tests](../tests/file-upload/error-mapping.test.ts) and affected browser uploads. Historical compression ratios and browser-support claims are available in the Git archive, not treated as current measurements.
