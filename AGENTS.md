# Architecture rules

- Record each VAD segment as a complete, independently decodable media file; isolate recorder event state per segment to prevent cross-session corruption.
- Send speech segments through a bounded sequential queue and freeze languages until processing finishes; this preserves order and prevents stale-session results.
- Pause recording and await speech processing before resizing slide images; this avoids concurrent mobile memory pressure.
- Share pure AI text normalization between the client and edge functions; JSON objects and JSON strings must never be rendered or exported raw.
- Keep AI Gateway SDK calls and their generated model declarations inside edge functions; browser code invokes functions without exposing credentials.
- Preserve successful transcriptions when translation fails, stop automated requests on errors, and signal polishing fallback explicitly; failures must not silently erase input.
- Keep regression tests in Bun's built-in test runner with `bun test`; this project has no pre-existing test framework.