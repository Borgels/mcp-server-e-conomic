# mcp-server-e-conomic

TypeScript MCP server for Visma e-conomic APIs. It is intentionally boring good:
typed, documented, read-first, policy-aware, credential-sane, and audit-friendly.

> **Disclaimer:** This is an independent, unofficial project by Borgels. Borgels is
> not affiliated with, endorsed by, or supported by Visma, Visma e-conomic, or
> e-conomic. "Visma", "e-conomic", and the e-conomic APIs are referenced only to
> describe what this server talks to. You need your own e-conomic credentials, and
> use of the e-conomic APIs is subject to Visma/e-conomic's own terms.

## Scope

The server exposes e-conomic through three layers:

- Curated MCP tools for common accounting workflows.
- Discovery tools so MCP clients can find supported resources and endpoint shapes.
- A validated endpoint caller for long-tail coverage, allowlisted against the
  known e-conomic API catalog.

Default install mode is read-only. Writes require explicit environment opt-in,
policy approval, a prepared operation hash, a reason, and an idempotency key.

## Setup

Install dependencies and build the CLI:

```sh
npm install
npm run build
```

Set e-conomic credentials in the MCP server environment. The server sends these
as e-conomic's documented headers and never accepts credentials as tool
arguments.

```sh
export ECONOMIC_APP_SECRET_TOKEN="your-app-secret-token"
export ECONOMIC_AGREEMENT_GRANT_TOKEN="your-agreement-grant-token"
```

### Getting Real Credentials

The two e-conomic tokens come from different places:

- `ECONOMIC_APP_SECRET_TOKEN` is the secret for your e-conomic developer app.
  Create a developer agreement, create an app from the e-conomic developer
  area's Apps tab, and store the App Secret Token when e-conomic shows it. It is
  not shown again; reset it if you lose it.
- `ECONOMIC_AGREEMENT_GRANT_TOKEN` is created when an accounting agreement user
  grants your app access. The user opens your app's Installation URL while
  logged into the correct e-conomic agreement and approves access.

If your e-conomic app is configured with a redirect URL, this repository includes
a local callback helper that can capture the Agreement Grant Token after the user
approves access:

```sh
export ECONOMIC_INSTALLATION_URL="https://secure.e-conomic.com/secure/api1/requestaccess.aspx?..."
npm run auth:grant
```

The helper prints a local callback URL such as:

```text
http://127.0.0.1:3333/economic/grant/callback
```

Configure that URL as the app installation redirect URL in e-conomic if your
agreement/app setup allows local redirects. For shared or production onboarding,
use the same redirect flow with a small HTTPS endpoint you control. After the
logged-in user approves access, e-conomic redirects back with `?token=...`; the
helper prints the matching `ECONOMIC_AGREEMENT_GRANT_TOKEN` export line. Treat
both tokens as secrets.

For GET-only demo mode, e-conomic documents that both tokens can be set to
`demo`:

```sh
export ECONOMIC_APP_SECRET_TOKEN="demo"
export ECONOMIC_AGREEMENT_GRANT_TOKEN="demo"
```

## Claude Or Cursor Config

Use the stdio server for local MCP clients:

```json
{
  "mcpServers": {
    "e-conomic": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-e-conomic/dist/stdio.js"],
      "env": {
        "ECONOMIC_APP_SECRET_TOKEN": "your-app-secret-token",
        "ECONOMIC_AGREEMENT_GRANT_TOKEN": "your-agreement-grant-token"
      }
    }
  }
}
```

During development:

```json
{
  "mcpServers": {
    "e-conomic": {
      "command": "npm",
      "args": ["run", "dev", "--prefix", "/absolute/path/to/mcp-server-e-conomic"],
      "env": {
        "ECONOMIC_APP_SECRET_TOKEN": "demo",
        "ECONOMIC_AGREEMENT_GRANT_TOKEN": "demo"
      }
    }
  }
}
```

## Start Here

Ask the MCP client to call:

- `economic_search_capabilities` to find tools, schemas, and endpoint operations.
- `economic_get_capability` to inspect one capability before calling it.
- `economic_get_schema` to inspect known resources for an API area.
- `economic_check_connection` to verify credentials.

## Main Tools

Discovery:

- `economic_search_capabilities`
- `economic_get_capability`
- `economic_get_schema`

Read tools:

- `economic_check_connection`
- `economic_get_company_context`
- `economic_search_entities`
- `economic_get_entity`
- `economic_get_customer_overview`
- `economic_get_supplier_overview`
- `economic_get_product_overview`
- `economic_get_sales_document`
- `economic_get_accounting_entries`
- `economic_get_project_overview`
- `economic_get_document`
- `economic_get_report`
- `economic_reconcile_open_items`
- `economic_validate_payload`

Write preparation and commit:

- `economic_prepare_customer_change`
- `economic_prepare_product_change`
- `economic_prepare_sales_document`
- `economic_prepare_journal_entry`
- `economic_prepare_payment_registration`
- `economic_commit_prepared_operation`

Long-tail coverage:

- `economic_call_endpoint`

`economic_call_endpoint` is not arbitrary HTTP. It only calls allowlisted
e-conomic API operations and is read-only unless write policy permits the call.

## Write Policy

Writes are blocked unless explicitly enabled:

```sh
export ECONOMIC_ENABLE_WRITES=true
export ECONOMIC_POLICY_PATH="/absolute/path/to/economic-policy.json"
export ECONOMIC_AUDIT_LOG="/absolute/path/to/economic-audit.jsonl"
```

Example policy:

```json
{
  "writesEnabled": true,
  "allowedCapabilities": [
    "economic_prepare_customer_change",
    "economic_prepare_product_change"
  ],
  "allowedServices": ["customers", "products"],
  "allowedMethods": ["POST", "PUT"],
  "deniedPathPatterns": [
    "/journals/.*/book",
    "/entries/draft/.*/book",
    "/booked-entries/match",
    "/webhooks",
    "/vat",
    "/payment"
  ],
  "maxAmount": 10000
}
```

Write flow:

1. Call a `economic_prepare_*` tool with a business reason.
2. Inspect the returned dry-run payload and `operationHash`.
3. Call `economic_commit_prepared_operation` with the full prepared operation,
   matching `confirmOperationHash`, and an `idempotencyKey`.

## Audit

If `ECONOMIC_AUDIT_LOG` is set, every mutating attempt writes a JSONL record with
timestamp, request id, tool, service, method/path, operation hash, policy
decision, idempotency-key hash, status, and redacted errors. Secrets are never
logged intentionally.

## Optional HTTP Server

The local stdio transport is the default. A small Streamable HTTP entrypoint is
available:

```sh
PORT=3000 ECONOMIC_APP_SECRET_TOKEN="demo" ECONOMIC_AGREEMENT_GRANT_TOKEN="demo" npm run dev:http
```

The MCP endpoint is `POST http://localhost:3000/mcp`.

## Verification

Run checks without real credentials:

```sh
npm run typecheck
npm test
npm run build
```

Run the optional live GET smoke test with demo or real credentials:

```sh
ECONOMIC_APP_SECRET_TOKEN="demo" ECONOMIC_AGREEMENT_GRANT_TOKEN="demo" npm run smoke:live
```

## API Sources

- REST docs: <https://restdocs.e-conomic.com/>
- OpenAPI docs: <https://apis.e-conomic.com/>
- Developer hub: <https://developer.visma.com/api/e-conomic>
- Authentication: <https://www.e-conomic.com/developer/authentication>
