# System Flow & Request Lifecycle

## Completed API Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile / Swagger
    participant VP as Global ValidationPipe
    participant AG as AccessTokenGuard
    participant RG as RolesGuard
    participant C as Controller
    participant S as Service
    participant P as PrismaService
    participant DB as Supabase PostgreSQL

    Client->>VP: HTTP POST /payments (Bearer Access Token)
    Note over VP: Validate DTO fields (class-validator)
    VP-->>Client: 400 Bad Request (If invalid)
    
    VP->>AG: Forward request
    Note over AG: Parse & Verify JWT Access Token
    AG-->>Client: 401 Unauthorized (If invalid/expired)

    AG->>RG: Forward request
    Note over RG: Compare User Role against @Roles('ADMIN','TREASURER')
    RG-->>Client: 403 Forbidden (If role mismatch)

    RG->>C: Invoke route handler
    Note over C: Extract user context via @GetCurrentUser()
    C->>S: Call create(createPaymentDto)
    
    Note over S: Verify target Player exists
    S->>P: Perform atomic inserts/updates
    P->>DB: SQL Execution
    DB-->>P: Query Results
    P-->>S: Typed Prisma models
    S-->>C: Transaction summaries
    C-->>Client: 201 Created (JSON Response)
```

---

## Data Relations

*   **Season & Matches:** A single `Season` contains multiple scheduled or completed `Matches`.
*   **Matches & Roster Mappings:** A completed match stores implicit player roster lists (`teamAPlayers`, `teamBPlayers`) and links a specific MVP player profile ID (`mvpId`). Standings points are calculated dynamically (**Win = 3pts, Draw = 2pts, Loss = 1pt**).
*   **Players & Finance logs:** A player accumulates multiple billing records inside the payment tables. The listing checks user role permissions, dynamically filtering records so standard users only fetch their connected profile logs.