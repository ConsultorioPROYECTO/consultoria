import { drizzle, NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import ws from 'ws';

// Neon needs a WebSocket constructor for serverless environments
neonConfig.webSocketConstructor = ws;

interface DrizzleConfig {
  schema: typeof schema;
  logger: boolean;
  casing: 'snake_case';
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool!: Pool;
  private drizzleInstance!: NeonDatabase<typeof schema>;
  private readonly connectionString: string;
  private readonly isProduction: boolean;

  private constructor() {
    this.connectionString = process.env.DATABASE_URL || '';
    this.isProduction = process.env.NODE_ENV === 'production';

    if (!this.connectionString) {
      const errorMessage = 'DATABASE_URL environment variable is not set. Application cannot start.';
      console.error('[DB] Error Crítico:', errorMessage);
      throw new Error(errorMessage);
    }

    this.initializeConnection();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private initializeConnection(): void {
    try {
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: this.isProduction ? 20 : 10,
      });

      const drizzleConfig: DrizzleConfig = {
        schema,
        logger: process.env.DRIZZLE_LOGGER === 'true',
        casing: 'snake_case',
      };

      this.drizzleInstance = drizzle(this.pool, drizzleConfig);

      const environment = this.isProduction ? 'producción' : 'desarrollo';
      console.log(`[DB] Conexión PostgreSQL inicializada para ${environment}`);
      console.log(`[DB] Pool configurado con límite de ${this.isProduction ? 20 : 10} conexiones`);
    } catch (error) {
      console.error('[DB] Error al inicializar la conexión:', error);
      throw error;
    }
  }

  public getDatabase(): NeonDatabase<typeof schema> {
    return this.drizzleInstance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async closeConnections(): Promise<void> {
    try {
      await this.pool.end();
      console.log('[DB] Conexiones cerradas correctamente');
    } catch (error) {
      console.error('[DB] Error al cerrar conexiones:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('[DB] Test de conexión exitoso');
      return true;
    } catch (error) {
      console.error('[DB] Test de conexión fallido:', error);
      return false;
    }
  }
}

export const db = DatabaseConnection.getInstance().getDatabase();
export const dbConnection = DatabaseConnection.getInstance();
export default db;
