import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backendURL = () =>
  (process.env.BACKEND_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const target = new URL(
    `/api/${path.map((part) => encodeURIComponent(part)).join("/")}`,
    backendURL(),
  );
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const key of ["accept", "content-type", "cookie"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        responseHeaders.set(key, value);
      }
    });
    const setCookies =
      typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : [];
    for (const cookie of setCookies) {
      responseHeaders.append("set-cookie", cookie);
    }

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "backend_unavailable",
          message:
            "The marketplace API is unavailable right now. Make sure the Go server is running.",
        },
      },
      { status: 503 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
