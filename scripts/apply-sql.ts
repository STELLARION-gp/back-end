import 'dotenv/config';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Set it in your environment or .env file.');
    process.exit(1);
  }

  const files = [
    resolve(__dirname, '../database/schema.sql'),
    resolve(__dirname, '../database/recommended_contents.sql'),
  ];

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database');
    for (const file of files) {
      const sql = readFileSync(file, 'utf8');
      console.log(`Applying ${file} ...`);
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log('Applied database schema successfully');
  } catch (err: any) {
    console.error('Failed to apply SQL:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
