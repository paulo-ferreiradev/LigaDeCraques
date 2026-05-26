# Architecture: Liga-Craques Backend

The backend utilizes standard NestJS modular components integrated with PostgreSQL on Supabase via Prisma ORM.

## Architectural Layers

*   **Controllers:** Parse incoming HTTP routes, enforce Swagger OpenAPI configurations, and validate inputs via custom decorators and `ValidationPipe` DTO boundaries.
*   **Guards & Strategies (Authentication):**
    *   `AccessTokenStrategy` (Passport `'jwt'`) parses and validates JWT signatures using the `JWT_ACCESS_SECRET`.
    *   `RefreshTokenStrategy` (Passport `'jwt-refresh'`) parses refresh signatures and passes request payloads to support token rotation comparisons.
    *   `AccessTokenGuard` & `RefreshTokenGuard` prevent unauthorized calls.
*   **Guards & Decorators (Authorization):**
    *   `RolesGuard` reads class and handler metadata using `Reflector` to verify matching authorization boundaries.
    *   Custom `@Roles(...)` custom decorator allocates permission scopes (`ADMIN`, `TREASURER`, `USER`).
    *   Custom `@GetCurrentUser(field?)` decorator retrieves secure execution contexts safely.
*   **Services:** Handle logic processing (leaderboard point calculators, transactions, soft-deletes).
*   **Prisma Service:** Singleton database layer extending PrismaClient with custom adapters.

---

## Technical Design Patterns

1.  **Repository & Singleton Connection Pool:**
    *   `PrismaService` connection lifecycle is managed via NestJS `OnModuleInit` and `OnModuleDestroy`.
    *   Configured with `@prisma/adapter-pg` and the `pg` driver to manage Postgres pooling efficiently on Supabase.
2.  **ACID Transaction Pattern:**
    *   Financial entries inside `PaymentsService` utilize Prisma `$transaction` wrappers during payment completions or cancellations to guarantee atomic safety.
3.  **Logical Soft Deletes:**
    *   To safeguard financial audit logs, payments are never physically removed. The `remove` method issues logical updates assigning the `deletedAt` field.
4.  **Cursor-Based Pagination Pattern:**
    *   End-points with infinite scrolls (e.g. `/matches`, `/seasons`) prefer cursor-based offsets (`take: limit + 1`) to assure $O(1)$ performance and prevent duplicates.
5.  **Dynamic read-model Standings:**
    *   The season leaderboard standing is calculated dynamically in real-time on `GET /seasons/:id/leaderboard` to prevent data mismatches.