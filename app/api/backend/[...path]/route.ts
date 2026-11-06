import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.HOOKRELAY_API_URL;

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "HOOKRELAY_API_URL is not configured" },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const pathname = path.join("/");

  const baseUrl = new URL(`${BACKEND_URL.replace(/\/+$/, "")}/`);
  const targetUrl = new URL(`${pathname}/`, baseUrl);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);

  for (const name of [
    "host",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "accept-encoding",
  ]) {
    headers.delete(name);
  }

  try {
    console.log("[HookRelay proxy] Requesting:", targetUrl.toString());

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.arrayBuffer()
          : undefined,
      redirect: "manual",
      cache: "no-store",
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? {
            name: error.cause.name,
            message: error.cause.message,
            code: (error.cause as NodeJS.ErrnoException).code,
          }
        : null;

    console.error("[HookRelay proxy] Backend request failed:", {
      target: targetUrl.toString(),
      detail,
      cause,
    });

    return NextResponse.json(
      {
        error: "Unable to reach the HookRelay backend",
        detail,
        cause,
      },
      { status: 502 },
    );
  }
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as PATCH,
  proxyRequest as DELETE,
};
