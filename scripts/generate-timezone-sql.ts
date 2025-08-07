#!/usr/bin/env tsx
// scripts/generate-timezone-sql.ts

import fs from 'fs';
import path from 'path';

/**
 * Script para generar SQL de inserción de timezones basado en los datos de IANA
 * @author Santiago Prada
 */

interface TimezoneData {
  countryCodes: string;
  coordinates: string;
  timezoneName: string;
  comments?: string;
}

function parseTimezoneFile(filePath: string): TimezoneData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const timezones: TimezoneData[] = [];

  for (const line of lines) {
    // Saltar líneas de comentarios y líneas vacías
    if (line.startsWith('#') || line.trim() === '') {
      continue;
    }

    // Dividir por tabs
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const countryCodes = parts[0].trim();
      const coordinates = parts[1].trim();
      const timezoneName = parts[2].trim();
      const comments = parts.length > 3 ? parts[3].trim() : undefined;

      // Validar que no sean headers
      if (countryCodes !== 'codes' && coordinates !== 'coordinates' && timezoneName !== 'TZ') {
        timezones.push({
          countryCodes,
          coordinates,
          timezoneName,
          comments
        });
      }
    }
  }

  return timezones;
}

function generateSQL(timezones: TimezoneData[]): string {
  let sql = `-- SQL para poblar la tabla timezones con datos de IANA\n`;
  sql += `-- Generado automáticamente el ${new Date().toISOString()}\n\n`;
  
  sql += `-- Crear tabla timezones\n`;
  sql += `CREATE TABLE IF NOT EXISTS timezones (\n`;
  sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  country_codes VARCHAR(100) NOT NULL,\n`;
  sql += `  coordinates VARCHAR(50) NOT NULL,\n`;
  sql += `  timezone_name VARCHAR(100) NOT NULL UNIQUE,\n`;
  sql += `  comments TEXT,\n`;
  sql += `  INDEX timezone_name_idx (timezone_name),\n`;
  sql += `  INDEX country_codes_idx (country_codes)\n`;
  sql += `);\n\n`;

  sql += `-- Insertar datos de timezones\n`;
  sql += `INSERT INTO timezones (country_codes, coordinates, timezone_name, comments) VALUES\n`;

  const values = timezones.map((tz, index) => {
    const countryCodes = tz.countryCodes.replace(/'/g, "''"); // Escapar comillas simples
    const coordinates = tz.coordinates.replace(/'/g, "''");
    const timezoneName = tz.timezoneName.replace(/'/g, "''");
    const comments = tz.comments ? `'${tz.comments.replace(/'/g, "''")}'` : 'NULL';
    
    const isLast = index === timezones.length - 1;
    return `  ('${countryCodes}', '${coordinates}', '${timezoneName}', ${comments})${isLast ? ';' : ','}`;
  });

  sql += values.join('\n');
  sql += '\n\n';
  
  sql += `-- Verificar inserción\n`;
  sql += `SELECT COUNT(*) as total_timezones FROM timezones;\n`;
  sql += `SELECT * FROM timezones LIMIT 10;\n`;

  return sql;
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const timezoneFilePath = path.join(projectRoot, 'IANA-timezones.md');
  
  console.log('🌍 Procesando archivo de timezones IANA...');
  
  if (!fs.existsSync(timezoneFilePath)) {
    console.error(`❌ Archivo no encontrado: ${timezoneFilePath}`);
    process.exit(1);
  }

  const timezones = parseTimezoneFile(timezoneFilePath);
  console.log(`📊 Procesados ${timezones.length} timezones`);

  const sql = generateSQL(timezones);
  
  // Agregar el SQL al final del archivo markdown
  const markdownContent = fs.readFileSync(timezoneFilePath, 'utf-8');
  const updatedContent = markdownContent + '\n\n## SQL para poblar la base de datos\n\n```sql\n' + sql + '```\n';
  
  fs.writeFileSync(timezoneFilePath, updatedContent);
  
  console.log('✅ SQL generado y agregado al archivo IANA-timezones.md');
  console.log(`📝 Total de registros: ${timezones.length}`);
}

if (require.main === module) {
  main();
}