---
'@dittolive/ditto-chat-core': minor
'@dittolive/ditto-chat-ui': minor
---

Migrate to Ditto SDK v5. The `@dittolive/ditto` peer dependency now requires `^5.0.1`; consumers must pass a v5 `Ditto` instance (opened via `Ditto.open(new DittoConfig(...))`). Attachment data is now read with `attachment.data()` instead of the removed `getData()`.
