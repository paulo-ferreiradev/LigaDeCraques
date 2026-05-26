# Current State: Backend Accomplishments

The backend API for **Liga-Craques** is 100% complete and verified under NestJS production compilers.

## Accomplished Modules & Functionalities

1.  **Auth & Security Module (`AuthModule`):**
    *   Dual-token JWT strategies (`AccessTokenStrategy` and `RefreshTokenStrategy`) for short-lived sessions (15 min) and persistent mobile logins (7 days).
    *   Route authorization guards (`AccessTokenGuard`, `RefreshTokenGuard`) and Role-Based Access Control (`RolesGuard` + `@Roles(...)` custom decorator) for secure routing.
    *   Hashed session tokens (rotated in the database) and password security (cost-factor of 10 salted hashes via `bcrypt`).
    *   Custom `@GetCurrentUser(field?)` decorator for extracting safe user contexts.
2.  **Players Module (`PlayersModule`):**
    *   Full CRUD endpoints with write-guards (`create`, `update`, `remove`) protected for `ADMIN` roles.
    *   Dynamic player listings (`findAll`, `findOne`) counting participating awards.
3.  **Seasons Module (`SeasonsModule`):**
    *   Seasons management CRUD (Admin only) with active season filters.
    *   **Dynamic Leaderboard Computations:** Computes dynamic standings on the fly from completed match score sets (Win = 3pts, Draw = 2pts, Loss = 1pt).
4.  **Matches Module (`MatchesModule`):**
    *   Match scheduling and roster allocation using atomic Prisma M2M Mappings.
    *   Roster scores and MVP designations post-completion (Admin only).
    *   Cursor-based pagination implemented on match feeds.
5.  **Payments Module (`PaymentsModule`):**
    *   Financial ledgers using strict `Decimal` values to prevent float precision losses.
    *   Soft-delete logic (`deletedAt`) to preserve accounting transaction audit trails.
    *   Prisma `$transaction` wrappers on status transitions (`pay`, `cancel`) to guarantee ACID safety.
    *   Security boundary: normal users see only their own invoices; Admins/Treasurers see global records.

---

## Active Database Schema

*   **User:** Auth credentials (`email`, `passwordHash`), role, hashed refresh token, and 1-to-1 optional link to `Player`.
*   **Player:** Name, links to team matches (AMatches, BMatches), MVP awards, and payments.
*   **Season:** Year, type (WINTER, SUMMER), status (ACTIVE, FINISHED), and related matches.
*   **Match:** Related season, team scores (A and B), roster arrays (`teamAPlayers`, `teamBPlayers`), and MVP designations.
*   **Payment:** Connected player profile, Decimal amount, status (PENDING, PAID, CANCELLED), and audit trails (`deletedAt`).