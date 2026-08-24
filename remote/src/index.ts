import {
  AuthorizationError,
  OAuthProvider,
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { fetchPtaxDay, fetchPtaxPeriod, fetchPtaxLatest } from "./bcbClient.js";
import type { PtaxQuote } from "./types.js";

type AuthProps = {
  userId: string;
};

type Env = {
  MCP_OBJECT: DurableObjectNamespace;
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  AUTH_PASSCODE: string;
};

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

function quoteText(quote: PtaxQuote): string {
  return (
    `PTAX ${quote.date}: compra R$ ${quote.buyRate.toFixed(4)}, ` +
    `venda R$ ${quote.sellRate.toFixed(4)} (boletim de fechamento, ${quote.quotedAt} BRT)`
  );
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

export class PtaxMcp extends McpAgent<Env, {}, AuthProps> {
  server = new McpServer({
    name: "query-ptax-bcb",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "get_ptax_by_date",
      "Get the official closing USD/BRL PTAX exchange rate (Banco Central do Brasil) for a specific date.",
      { date: isoDateSchema.describe("Date in YYYY-MM-DD format") },
      async ({ date }) => {
        try {
          const quote = await fetchPtaxDay(date);
          if (!quote) {
            return {
              content: [
                {
                  type: "text",
                  text: `No PTAX quote available for ${date}. This is likely a weekend, a holiday, or the bulletin has not been published yet (PTAX is published around 13:00 BRT).`,
                },
              ],
            };
          }
          return {
            content: [
              { type: "text", text: quoteText(quote) },
              { type: "text", text: JSON.stringify(quote) },
            ],
          };
        } catch (err) {
          return errorResult(err);
        }
      },
    );

    this.server.tool(
      "get_ptax_by_period",
      "Get the official closing USD/BRL PTAX exchange rate series (Banco Central do Brasil) for each business day in a date range.",
      {
        startDate: isoDateSchema.describe("Start date in YYYY-MM-DD format"),
        endDate: isoDateSchema.describe("End date in YYYY-MM-DD format"),
      },
      async ({ startDate, endDate }) => {
        if (startDate > endDate) {
          return errorResult(
            new Error(`startDate (${startDate}) must not be after endDate (${endDate})`),
          );
        }
        try {
          const quotes = await fetchPtaxPeriod(startDate, endDate);
          if (quotes.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No PTAX quotes available between ${startDate} and ${endDate} (no business days with a published bulletin in this range).`,
                },
              ],
            };
          }
          return {
            content: [
              { type: "text", text: quotes.map(quoteText).join("\n") },
              { type: "text", text: JSON.stringify(quotes) },
            ],
          };
        } catch (err) {
          return errorResult(err);
        }
      },
    );

    this.server.tool(
      "get_ptax_latest",
      "Get the most recent official closing USD/BRL PTAX exchange rate (Banco Central do Brasil).",
      {
        lookbackDays: z
          .number()
          .int()
          .positive()
          .max(60)
          .optional()
          .describe("How many days back to search for the latest published quote (default 7)"),
      },
      async ({ lookbackDays }) => {
        try {
          const quote = await fetchPtaxLatest(lookbackDays ?? 7);
          if (!quote) {
            return {
              content: [
                {
                  type: "text",
                  text: `No PTAX quote found in the last ${lookbackDays ?? 7} day(s). Try increasing lookbackDays.`,
                },
              ],
            };
          }
          return {
            content: [
              { type: "text", text: quoteText(quote) },
              { type: "text", text: JSON.stringify(quote) },
            ],
          };
        } catch (err) {
          return errorResult(err);
        }
      },
    );
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loginPage(opts: { encodedRequest: string; clientName: string; error?: string }): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PTAX BCB - Login</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 400px; margin: 80px auto; padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 1.25rem; }
  p { color: #555; }
  input[type=password] { width: 100%; padding: 10px; font-size: 1rem; box-sizing: border-box; margin: 12px 0; border: 1px solid #ccc; border-radius: 6px; }
  button { width: 100%; padding: 10px; font-size: 1rem; background: #1a1a1a; color: white; border: none; border-radius: 6px; cursor: pointer; }
  .error { color: #c00; font-size: 0.9rem; }
</style>
</head>
<body>
  <h1>Autorizar acesso ao PTAX BCB</h1>
  <p><strong>${escapeHtml(opts.clientName)}</strong> está solicitando acesso ao seu servidor de cotação PTAX.</p>
  ${opts.error ? `<p class="error">${escapeHtml(opts.error)}</p>` : ""}
  <form method="POST">
    <input type="hidden" name="request" value="${escapeHtml(opts.encodedRequest)}">
    <input type="password" name="passcode" placeholder="Senha de acesso" autofocus required>
    <button type="submit">Autorizar</button>
  </form>
</body>
</html>`;
}

const defaultHandler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/authorize") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "GET") {
      let oauthRequest: AuthRequest;
      try {
        oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      } catch (error) {
        if (!(error instanceof AuthorizationError)) throw error;
        if (!error.redirectUri) {
          return new Response(error.description, { status: 400 });
        }
        const redirect = new URL(error.redirectUri);
        redirect.searchParams.set("error", error.code);
        redirect.searchParams.set("error_description", error.description);
        if (error.state) redirect.searchParams.set("state", error.state);
        return Response.redirect(redirect.toString(), 302);
      }

      const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
      const clientName = client?.clientName ?? oauthRequest.clientId;

      return new Response(
        loginPage({
          encodedRequest: btoa(JSON.stringify(oauthRequest)),
          clientName,
        }),
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    if (request.method === "POST") {
      const form = await request.formData();
      const encodedRequest = String(form.get("request") ?? "");
      const passcode = String(form.get("passcode") ?? "");
      const oauthRequest = JSON.parse(atob(encodedRequest)) as AuthRequest;

      if (!env.AUTH_PASSCODE || passcode !== env.AUTH_PASSCODE) {
        const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
        return new Response(
          loginPage({
            encodedRequest,
            clientName: client?.clientName ?? oauthRequest.clientId,
            error: "Senha incorreta.",
          }),
          { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }

      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthRequest,
        userId: "edmilson",
        metadata: {},
        scope: oauthRequest.scope,
        props: { userId: "edmilson" } satisfies AuthProps,
      });

      return Response.redirect(redirectTo, 302);
    }

    return new Response("Method not allowed", { status: 405 });
  },
};

const mcpHandler = PtaxMcp.serve("/mcp", { binding: "MCP_OBJECT" });

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: {
    fetch: (request, env, ctx) => mcpHandler.fetch(request, env, ctx),
  },
  defaultHandler,

  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",

  scopesSupported: ["mcp"],

  resourceMetadata: {
    resource: "https://query-ptax-bcb.edmilson-santana.workers.dev/mcp",
    authorization_servers: ["https://query-ptax-bcb.edmilson-santana.workers.dev"],
    scopes_supported: ["mcp"],
    resource_name: "PTAX BCB",
  },
});
