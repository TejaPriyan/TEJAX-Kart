# Security

The current 6.2 source is the maintained edition. The public deployment serves static solo gameplay. The Node.js server is designed for trusted LAN sessions and is not a hardened public competitive service.

If GitHub private vulnerability reporting is enabled for your copy of this repository, use Security → Report a vulnerability. If it is unavailable, contact the repository owner through a private channel already published by them; do not post exploit details, credentials, IP addresses or personal data in a public issue. No reporting email is configured in this template.

Include affected versions, a minimal reproduction and expected impact. The server validates messages, bounds movement, and owns damage and checkpoint progress; it does not provide full authoritative physics, authentication or comprehensive anti-cheat. Internet deployment needs trusted HTTPS/WSS, rate controls, monitoring and a security review. Keep dependencies current with Dependabot and CI.
