# Security status

Development prototype. No external penetration test, dependency vulnerability audit, public federation exercise, or production security certification has been performed.

The app has no public admin API or upload endpoint. It uses a single scheduler, local configuration, strict profile schemas, a bounded federation ingress, known-key signatures, sequence checks, short message TTL, and HTTPS-only outgoing federation to checked/pinned public addresses. The app container runs unprivileged, with dropped capabilities and a read-only root filesystem in the supplied Compose configuration.

Private node keys and SQLite state live outside the web directory. The public source offer uses an explicit manifest. All operator-provided labels are rendered with textContent, not interpreted as HTML. Browser audio loads from the same origin. No remote voice API is included.

Known limits: no authentication layer for private practice material; no advanced DDoS protection; global ingress budget can itself be exhausted; one Python writer; local configuration is trusted; no automatic key rotation/recovery; self-reported peer counts can be false; metadata does not prove media rights. A stale database restore can conflict with peer replay protection.

Never commit .env, private keys, node/peer configuration, media licenses containing personal data, or SQLite files. Do not expose backups. Review dependencies, container images, reverse proxy and operator access before public deployment.

For a future repository, configure a genuine private vulnerability-reporting channel before announcing one. No contact address or disclosure service is fabricated in this draft.
