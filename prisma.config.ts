import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Keep this in sync with src/lib/prisma.ts
    url: "file:./prisma/homeio.db",
  },
});
