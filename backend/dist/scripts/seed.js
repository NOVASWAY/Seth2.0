"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function seed() {
    try {
        console.log('Starting database seeding...');
        // Read the seed file
        const seedPath = path_1.default.join(process.cwd(), '..', 'database', 'seed.sql');
        const seed = fs_1.default.readFileSync(seedPath, 'utf8');
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
                    await database_1.pool.query(statement);
                }
                catch (error) {
                    console.error(`Error executing seed statement ${i + 1}:`, error);
                    // Continue with other statements even if one fails
                }
            }
        }
        console.log('Database seeding completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}
seed();
