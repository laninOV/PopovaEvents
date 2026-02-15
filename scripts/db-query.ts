import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type DbMode = "postgres" | "sqlite";

function resolveDbMode(): DbMode {
  const envMode = (process.env.DB_PROVIDER ?? "").trim().toLowerCase();
  if (envMode === "postgres") return "postgres";
  if (envMode === "sqlite") return "sqlite";

  const hasSqlitePath = Boolean(process.env.LOCAL_DB_PATH?.trim() || process.env.SQLITE_PATH?.trim());
  if (hasSqlitePath) return "sqlite";

  const hasPostgresUrl = Boolean(
    process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim() || process.env.NEON_DATABASE_URL?.trim(),
  );
  return hasPostgresUrl ? "postgres" : "sqlite";
}

function resolveSqlitePath() {
  const configuredPath = process.env.LOCAL_DB_PATH?.trim() || process.env.SQLITE_PATH?.trim();
  const fallbackPath = path.join("data", "dev.sqlite");
  const value = configuredPath || fallbackPath;
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function isSelectLikeQuery(query: string) {
  return /^\s*(SELECT|WITH|PRAGMA)\b/i.test(query);
}

function hasReturningClause(query: string) {
  return /\bRETURNING\b/i.test(query);
}

function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error("Usage: npm run db:query -- \"SELECT * FROM users LIMIT 5\"");
    process.exit(1);
  }

  if (resolveDbMode() === "postgres") {
    console.error("Current DB mode is postgres. Set DB_PROVIDER=sqlite to query local SQLite.");
    process.exit(1);
  }

  const dbPath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    console.error(`SQLite file does not exist yet: ${dbPath}`);
    console.error("Run the app once so tables are created, then retry.");
    process.exit(1);
  }

  const db = new Database(dbPath, { fileMustExist: true });
  db.pragma("foreign_keys = ON");

  try {
    if (isSelectLikeQuery(query) || hasReturningClause(query)) {
      const rows = db.prepare(query).all() as unknown[];
      console.log(JSON.stringify(rows, null, 2));
      console.error(`rows=${rows.length}`);
      return;
    }

    const info = db.prepare(query).run();
    console.log(
      JSON.stringify(
        { changes: Number(info.changes ?? 0), lastInsertRowid: String(info.lastInsertRowid ?? "") },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`SQL error: ${message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
