---
name: Artifact workflow port conflicts
description: Handling managed artifact restarts when a prior dev-server process still owns the assigned port.
---

A managed artifact workflow can report that its port is already in use while the previous dev server remains healthy and responsive.

**Why:** A planner workflow restart collided with a leftover Vite process on its configured port; restarting again without identifying the listener would have repeated the failure.

**How to apply:** If a managed artifact restart reports an address-in-use error, check the workflow logs and identify the exact listening process before changing any port settings. Stop only the confirmed stale artifact process, then restart the managed workflow once.
