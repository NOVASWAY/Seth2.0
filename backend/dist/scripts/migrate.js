"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function migrate() {
    try {
        console.log('Starting database migration...');
        // Read the schema file
        const schemaPath = path_1.default.join(process.cwd(), '..', 'database', 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
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
                    await database_1.pool.query(statement);
                }
                catch (error) {
                    console.error(`Error executing statement ${i + 1}:`, error);
                    // Continue with other statements even if one fails
                }
            }
        }
        console.log('Database migration completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
migrate();
