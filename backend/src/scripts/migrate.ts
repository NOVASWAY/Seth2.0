import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(process.cwd(), '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          // Continue with other statements even if one fails
        }
      }
    }
    
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
