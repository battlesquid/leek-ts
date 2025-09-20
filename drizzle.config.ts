import { defineConfig } from "drizzle-kit";
import { getenv } from "./src/config";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		host: getenv("DB_HOST"),
		user: getenv("DB_USER"),
		password: getenv("DB_PASSWORD"),
		database: getenv("DB_NAME"),
	},
});
