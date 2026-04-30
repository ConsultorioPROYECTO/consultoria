// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import 'dotenv/config'; // Carga las variables de .env.*

/**
 * @fileoverview Configuración para Drizzle Kit CLI.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-11
 *
 * @description
 * Define la configuración necesaria para que Drizzle Kit interactúe con la base de datos,
 * incluyendo la ubicación de los archivos de esquema, la carpeta de salida para las
 * migraciones (si se usan), el dialecto de la base de datos (MySQL) y las credenciales
 * de conexión obtenidas de las variables de entorno.
 *
 * @requires dotenv/config - Para cargar DATABASE_URL desde .env.*
 * @requires drizzle-kit - Para el tipo `Config`.
 */

if (!process.env.DATABASE_URL) {
  console.error(' Error Crítico: Variable de entorno DATABASE_URL no definida en drizzle.config.ts.');
  // Lanzar error aquí es más seguro para evitar operaciones con configuración incompleta
  throw new Error('DATABASE_URL environment variable is not set.');
}

export default {
  schema: 'src/db/schema', // Ruta a tu archivo principal de schema (o un array si tienes varios)
  out: './drizzle/migrations', // Carpeta donde se guardarán las migraciones generadas
  dialect: 'postgresql', // Especifica que estás usando PostgreSQL
  dbCredentials: {
    // Drizzle Kit necesita la URL completa para conectarse y aplicar cambios
    url: process.env.DATABASE_URL,
  },
  // Opcional: si quieres ser más explícito con los archivos a incluir/excluir
  // includes: ['./src/lib/db/schema/**/*.ts'],
  // excludes: ['./src/lib/db/index.ts'], // Excluye el archivo de conexión
  verbose: true, // Muestra más detalles durante la ejecución
  strict: true,  // Modo estricto, puede detectar más problemas potenciales
} satisfies Config;