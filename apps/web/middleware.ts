import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const authDisabled =
  process.env.AUTH_DISABLED === "true" || process.env.DEV_AUTH_BYPASS === "true";

const middleware = authDisabled
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
