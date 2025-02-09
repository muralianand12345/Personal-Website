import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const middleware = (req: NextRequest) => {
  const allowedOrigins = ["localhost:3000"];
  const origin = req.headers.get("x-forwarded-host") ?? "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  if (isAllowedOrigin) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];

  if (token !== process.env.AUTHORIZATION_TOKEN) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/api/addNews"],
};
