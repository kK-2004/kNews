## ADDED Requirements

### Requirement: Usage table creation
The system SHALL create a `usage` table with columns: `id` (TEXT PK), `api_key_id` (TEXT FK→api_key.id), `hour` (TEXT, format `YYYY-MM-DD HH` in UTC), `call_count` (INTEGER DEFAULT 1), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ). The table SHALL have a UNIQUE constraint on `(api_key_id, hour)`.

#### Scenario: Migration runs idempotently
- **WHEN** the application starts and executes migration 009
- **THEN** the `usage` table is created with the correct schema and constraints, and re-running the migration does not fail

### Requirement: Hourly usage recording on MCP requests
The system SHALL increment the `call_count` of the usage record matching the current API key and UTC hour after each successful MCP request. If no record exists for the current hour, the system SHALL create one. This operation SHALL be asynchronous and MUST NOT block the MCP response.

#### Scenario: First request in a new hour
- **WHEN** an authenticated MCP request succeeds and no usage record exists for the current (api_key_id, hour) combination
- **THEN** a new usage record is created with `call_count = 1`

#### Scenario: Subsequent request in the same hour
- **WHEN** an authenticated MCP request succeeds and a usage record already exists for the current (api_key_id, hour) combination
- **THEN** the existing record's `call_count` is incremented by 1

#### Scenario: Usage write failure does not affect MCP response
- **WHEN** the usage write operation fails (network error, database unavailable)
- **THEN** the MCP response is still returned successfully to the client

### Requirement: Usage query for analytics
The `admin:getAnalytics` IPC handler SHALL query the `usage` table for records within the requested time range, aggregate `call_count` by `hour`, and return the results as the `hourly` array. The query SHALL support optional filtering by `keyId`.

#### Scenario: Query hourly data within a date range
- **WHEN** `admin:getAnalytics` is called with `start` and `end` timestamps
- **THEN** the handler returns an `hourly` array where each item has `hour` (string) and `calls` (number), sorted by hour ascending, covering all usage records between the start and end times

#### Scenario: Filter by specific API key
- **WHEN** `admin:getAnalytics` is called with a `keyId` parameter
- **THEN** the handler returns only usage records for that specific API key

#### Scenario: No usage data available
- **WHEN** `admin:getAnalytics` is called but no usage records exist in the requested range
- **THEN** the handler returns `hourly: []`

### Requirement: UsageRepository encapsulation
The system SHALL provide a `UsageRepository` class that encapsulates all usage table data access: `incrementHourly(apiKeyId)` for upsert and `findByRange(startHour, endHour, options)` for range queries.

#### Scenario: Repository is injected via bootstrap
- **WHEN** the application bootstraps
- **THEN** `UsageRepository` is instantiated with the Supabase client and injected into `McpServer` and the admin IPC handler