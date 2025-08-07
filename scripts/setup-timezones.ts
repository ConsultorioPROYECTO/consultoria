#!/usr/bin/env tsx
// scripts/setup-timezones.ts

import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index';
import { timezones } from '../src/db/schema/timezones';

/**
 * Script completo para configurar timezones desde el archivo IANA
 * @author Santiago Prada
 */

interface TimezoneData {
  countryCodes: string;
  coordinates: string;
  timezoneName: string;
  comments?: string | null;
}

function parseTimezoneFile(filePath: string): TimezoneData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const timezoneList: TimezoneData[] = [];

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
      const comments = parts.length > 3 && parts[3].trim() ? parts[3].trim() : null;

      // Validar que no sean headers
      if (countryCodes !== 'codes' && coordinates !== 'coordinates' && timezoneName !== 'TZ') {
        timezoneList.push({
          countryCodes,
          coordinates,
          timezoneName,
          comments
        });
      }
    }
  }

  return timezoneList;
}

async function setupTimezones() {
  try {
    console.log('🌍 Iniciando configuración de timezones...');
    
    // Leer archivo IANA
    const projectRoot = path.resolve(__dirname, '..');
    const timezoneFilePath = path.join(projectRoot, 'IANA-timezones.md');
    
    if (!fs.existsSync(timezoneFilePath)) {
      throw new Error(`Archivo no encontrado: ${timezoneFilePath}`);
    }

    const timezoneData = parseTimezoneFile(timezoneFilePath);
    console.log(`📊 Procesados ${timezoneData.length} timezones desde IANA`);

    // Verificar si ya existen datos
    const existingTimezones = await db.select().from(timezones);
    
    if (existingTimezones.length > 0) {
      console.log(`⚠️  Ya existen ${existingTimezones.length} timezones en la base de datos`);
      const { createInterface } = await import('readline');
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('¿Deseas limpiar y repoblar la tabla? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('🗑️  Limpiando tabla de timezones...');
        await db.delete(timezones);
      } else {
        console.log('⏭️  Saltando inserción de timezones');
        return;
      }
    }
    
    // Insertar datos en lotes para mejor rendimiento
    const batchSize = 50;
    let insertedCount = 0;
    
    console.log('📥 Insertando timezones en la base de datos...');
    
    for (let i = 0; i < timezoneData.length; i += batchSize) {
      const batch = timezoneData.slice(i, i + batchSize);
      await db.insert(timezones).values(batch);
      insertedCount += batch.length;
      console.log(`📊 Progreso: ${insertedCount}/${timezoneData.length} timezones insertados`);
    }
    
    // Verificar inserción
    const finalCount = await db.select().from(timezones);
    
    console.log('✅ Configuración de timezones completada exitosamente');
    console.log(`📝 Total de registros en la base de datos: ${finalCount.length}`);
    
    // Mostrar algunos ejemplos
    console.log('\n🔍 Ejemplos de timezones insertados:');
    const samples = await db.select().from(timezones).limit(5);
    samples.forEach((tz, index) => {
      console.log(`${index + 1}. ${tz.timezoneName} (${tz.countryCodes}) - ${tz.coordinates}`);
    });
    
  } catch (error) {
    console.error('❌ Error al configurar timezones:', error);
    throw error;
  }
}

// Ejecutar script
if (require.main === module) {
  setupTimezones()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el script:', error);
      process.exit(1);
    });
}

export { setupTimezones };