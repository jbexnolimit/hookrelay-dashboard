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
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${pathname}/${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
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
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the HookRelay backend" },
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
