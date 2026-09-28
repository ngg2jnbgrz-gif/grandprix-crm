// Post-install hook: generate the Prisma client when the schema is present.
//
// The Docker `deps` stage runs `npm ci` BEFORE the prisma/ directory is
// copied in, so `prisma generate` would fail there (the `builder` stage
// runs `npx prisma generate` explicitly after copying prisma/). This guard
// skips generation in that case. On Netlify and local installs the schema
// is always present, so generation runs as usual.
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (existsSync("prisma/schema.prisma")) {
  execFileSync("npx", ["prisma", "generate"], { stdio: "inherit" });
} else {
  console.log(
    "[postinstall] prisma/schema.prisma not found — skipping prisma generate."
  );
}
