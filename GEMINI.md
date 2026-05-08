# Project: When Can We Get Together?

## Status
- **Phase 1 (3D Prototyping):** Done. Interactive 3D grid with block stacking implemented.
- **Phase 2 (Real-time Backend):** In Progress. Custom Express server with Socket.io and Redis (mocked) set up.
- **Next Steps:**
  - Verify real-time synchronization.
  - Add Room creation logic (currently hardcoded to "lobby").
  - Add participant name/color selection.

## Tech Stack
- Frontend: Next.js, Three.js (@react-three/fiber), Vanilla CSS.
- Backend: Custom Node.js (Express), Socket.io.
- Concurrency: Redis (using `ioredis-mock`).

## Development
Run `npm run dev` to start the custom server and Next.js.
