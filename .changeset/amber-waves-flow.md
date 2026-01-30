---
'@dittolive/ditto-chat-core': patch
'@dittolive/ditto-chat-ui': patch
---

Enhanced message retention capabilities with support for indefinite retention and flexible configuration at global, room, and query levels. Updated Room interface to use RetentionConfig type with retainIndefinitely flag and optional days field. UI components now support passing retention configuration overrides.
