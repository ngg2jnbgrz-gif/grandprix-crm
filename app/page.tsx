import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/tenant";

/**
 * Root entry: logged-in users go to the post-login org gate (/app),
 * everyone else to the neutral sign-in page. Tenant branding never
 * touches this route — it's resolved after auth.
 */
export default async function RootPage() {
  const sessionUser = await getSessionUser();
  redirect(sessionUser ? "/app" : "/login");
}
