// src/db/index.ts

/**
 * @fileoverview Singleton de conexión a base de datos MySQL con Drizzle ORM
 * @version 2.0.0
 * @author Santiago Prada
 * @date 2025-07-20
 *
 * @description
 * Implementa un patrón singleton robusto para la conexión a MySQL usando Drizzle ORM.
 * Gestiona eficientemente pools de conexión y evita problemas de ESLint con variables globales.
 * Optimizado para desarrollo (HMR) y producción con manejo adecuado de recursos.
 *
 * @features
 * - Patrón Singleton para una única instancia de conexión
 * - Pool de conexiones optimizado para concurrencia
 * - Soporte para Hot Module Replacement (HMR) en desarrollo
 * - Configuración diferenciada para desarrollo y producción
 * - Logging detallado para debugging
 * - Manejo robusto de errores de conexión
 *
 * @requires drizzle-orm/mysql2 - Adaptador de Drizzle para mysql2
 * @requires mysql2/promise - Driver MySQL con soporte de promesas
 * @requires ./schema - Esquemas de base de datos
 *
 * @see {@link https://orm.drizzle.team/docs/get-started-mysql} - Documentación Drizzle MySQL
 * @see {@link https://github.com/sidorares/node-mysql2#using-connection-pools} - mysql2 pools
 */

import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// --- Tipos y Interfaces ---

/**
 * Configuración del pool de conexiones MySQL
 */
interface PoolConfig {
  uri: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  reconnect?: boolean;
}

/**
 * Configuración de Drizzle ORM
 */
interface DrizzleConfig {
  schema: typeof schema;
  mode: 'default';
  logger: boolean;
  casing: 'snake_case';
}

// --- Singleton de Conexión a Base de Datos ---

/**
 * Clase Singleton para gestionar la conexión a la base de datos MySQL
 * 
 * Implementa el patrón Singleton para garantizar una única instancia de conexión
 * a la base de datos en toda la aplicación. Optimiza el manejo de recursos y
 * evita problemas de ESLint con variables globales.
 */
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool!: mysql.Pool;
  private drizzleInstance!: MySql2Database<typeof schema>;
  private readonly connectionString: string;
  private readonly isProduction: boolean;

  /**
   * Constructor privado para implementar el patrón Singleton
   * @throws {Error} Si DATABASE_URL no está configurada
   */
  private constructor() {
    this.connectionString = process.env.DATABASE_URL || '';
    this.isProduction = process.env.NODE_ENV === 'production';

    if (!this.connectionString) {
      const errorMessage = 'DATABASE_URL environment variable is not set. Application cannot start.';
      console.error('🔴 [DB] Error Crítico:', errorMessage);
      throw new Error(errorMessage);
    }

    this.initializeConnection();
  }

  /**
   * Obtiene la instancia única de DatabaseConnection (Singleton)
   * @returns {DatabaseConnection} La instancia única
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Inicializa el pool de conexiones y la instancia de Drizzle ORM
   * @private
   */
  private initializeConnection(): void {
    try {
      // Configuración del pool optimizada para cada entorno
      const poolConfig: PoolConfig = {
        uri: this.connectionString,
        connectionLimit: this.isProduction ? 20 : 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
      };

      this.pool = mysql.createPool(poolConfig);
      
      const drizzleConfig: DrizzleConfig = {
        schema,
        mode: 'default',
        logger: process.env.DRIZZLE_LOGGER === 'true',
        casing: 'snake_case',
      };

      this.drizzleInstance = drizzle(this.pool, drizzleConfig);

      const environment = this.isProduction ? 'producción' : 'desarrollo';
      console.log(`✅ [DB] Conexión MySQL inicializada para ${environment}`);
      console.log(`📊 [DB] Pool configurado con límite de ${poolConfig.connectionLimit} conexiones`);
      
    } catch (error) {
      console.error('🔴 [DB] Error al inicializar la conexión:', error);
      throw error;
    }
  }

  /**
   * Obtiene la instancia de Drizzle ORM para realizar consultas
   * @returns {MySql2Database<typeof schema>} Instancia de Drizzle ORM
   */
  public getDatabase(): MySql2Database<typeof schema> {
    return this.drizzleInstance;
  }

  /**
   * Obtiene el pool de conexiones MySQL (uso avanzado)
   * @returns {mysql.Pool} Pool de conexiones
   */
  public getPool(): mysql.Pool {
    return this.pool;
  }

  /**
   * Cierra todas las conexiones del pool (útil para testing y shutdown)
   * @returns {Promise<void>}
   */
  public async closeConnections(): Promise<void> {
    try {
      await this.pool.end();
      console.log('🔒 [DB] Conexiones cerradas correctamente');
    } catch (error) {
      console.error('🔴 [DB] Error al cerrar conexiones:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado de la conexión a la base de datos
   * @returns {Promise<boolean>} true si la conexión es exitosa
   */
  public async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('✅ [DB] Test de conexión exitoso');
      return true;
    } catch (error) {
      console.error('🔴 [DB] Test de conexión fallido:', error);
      return false;
    }
  }
}

// --- Exportaciones ---

/**
 * Instancia única de la base de datos (Singleton)
 * Usar esta instancia para todas las operaciones de base de datos
 */
export const db = DatabaseConnection.getInstance().getDatabase();

/**
 * Instancia del singleton para operaciones avanzadas
 * Útil para testing, monitoreo y gestión de conexiones
 */
export const dbConnection = DatabaseConnection.getInstance();

/**
 * Exportación por defecto de la instancia de Drizzle ORM
 * Mantiene compatibilidad con imports existentes
 */
export default db;