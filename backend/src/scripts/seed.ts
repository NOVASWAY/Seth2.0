import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // Read the seed file
    const seedPath = path.join(process.cwd(), '..', 'database', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    
    // Split the seed into individual statements
    const statements = seed
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing seed statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
        } catch (error) {
          console.error(`Error executing seed statement ${i + 1}:`, error);
          // Continue with other statements even if one fails
        }
      }
    }
    
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
