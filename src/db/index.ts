// src/lib/db/index.ts

/**
 * @fileoverview Configura y exporta la instancia de Drizzle ORM para la conexión a MySQL.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-11
 *
 * @description
 * Este archivo inicializa la conexión a la base de datos MySQL utilizando el driver `mysql2`
 * y la URL de conexión definida en las variables de entorno (DATABASE_URL).
 * Implementa un pool de conexiones para manejar eficientemente las solicitudes concurrentes.
 * Incluye una estrategia para reutilizar el pool en desarrollo durante Hot Module Replacement (HMR)
 * para evitar la creación excesiva de conexiones.
 * Exporta la instancia `db` de Drizzle ORM lista para ser usada en el lado del servidor
 * (API Routes, Server Components, etc.).
 *
 * @requires drizzle-orm/mysql2 - Adaptador de Drizzle para mysql2.
 * @requires mysql2/promise - Driver de MySQL para Node.js con soporte de promesas y pooling.
 * @requires process - Para acceder a las variables de entorno.
 * @requires ./schema - Importa todos los esquemas definidos para que Drizzle los conozca.
 *
 * @see {@link https://orm.drizzle.team/docs/get-started-mysql#connect-drizzle-orm-to-the-database} - Documentación de Drizzle para conexión MySQL.
 * @see {@link https://github.com/sidorares/node-mysql2#using-connection-pools} - Documentación de mysql2 sobre pools.
 *
 * @todo Asegurarse de que la variable de entorno DATABASE_URL esté correctamente configurada
 *       tanto localmente (.env.local) como en el entorno de despliegue (Render.com).
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise'; // Usamos la versión con promesas para el pool
import * as schema from './schema'; // Importa TODOS tus esquemas definidos (users.ts, etc.)

// --- Configuración del Pool de Conexiones ---

/**
 * Augmenta el objeto global `globalThis` para almacenar el pool de conexiones
 * en desarrollo y evitar recrearlo en cada HMR.
 */
declare global {
  // eslint-disable-next-line no-var -- Es necesario usar 'var' para declarar en el ámbito global
  var drizzleMysqlPool: mysql.Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Error crítico si la URL de la BD no está configurada. Detiene la aplicación.
  console.error(' Error Crítico: Variable de entorno DATABASE_URL no definida.');
  throw new Error('DATABASE_URL environment variable is not set. Application cannot start.');
}

let pool: mysql.Pool;

/**
 * Obtiene o crea el pool de conexiones MySQL.
 * En producción, siempre crea uno nuevo.
 * En desarrollo, reutiliza uno existente en `globalThis` si está disponible (HMR).
 * @returns {mysql.Pool} La instancia del pool de conexiones de mysql2.
 */
const getPool = (): mysql.Pool => {
  if (process.env.NODE_ENV === 'production') {
    // En producción, siempre creamos un pool nuevo.
    console.log(' [DB] Creando pool de conexiones MySQL para producción...');
    return mysql.createPool({ uri: connectionString });
  } else {
    // En desarrollo, intentamos reutilizar el pool existente en globalThis.
    if (!global.drizzleMysqlPool) {
      console.log(' [DB] Creando pool de conexiones MySQL para desarrollo (HMR)...');
      global.drizzleMysqlPool = mysql.createPool({ uri: connectionString });
    } else {
      console.log(' [DB] Reutilizando pool de conexiones MySQL existente (HMR)...'); // Log opcional
    }
    return global.drizzleMysqlPool;
  }
};

// Obtenemos/creamos el pool
// eslint-disable-next-line prefer-const
pool = getPool();

// --- Inicialización de Drizzle ORM ---

/**
 * Instancia principal de Drizzle ORM.
 * @description Se configura con el pool de conexiones de `mysql2` y todos los esquemas
 *              definidos en `./schema`. El `mode: 'default'` habilita el uso de
 *              prepared statements para mayor seguridad y rendimiento.
 * @type {import('drizzle-orm/mysql2').MySql2Database<typeof schema>}
 */
export const db = drizzle(pool, {
    schema, // Pasa todos tus esquemas importados
    mode: 'default', // Recomendado: habilita prepared statements
    logger: true, // para ver las consultas SQL generadas por Drizzle (útil para depurar)
    casing: 'snake_case',
});

console.log(' [DB] Instancia de Drizzle ORM inicializada correctamente.');

// Opcional: Podrías exportar el pool si necesitas interactuar directamente con él,
// pero generalmente solo interactuarás a través de la instancia `db` de Drizzle.
// export { pool };