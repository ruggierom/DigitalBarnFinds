import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const devAuthBypass = process.env.DEV_AUTH_BYPASS === "true";

const middleware = devAuthBypass
  ? () => NextResponse.next()
  : withAuth({
      pages: {
        signIn: "/signin"
      }
    });

export default middleware;

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"]
};
