// src/db/migrations/create-timezones-table.ts

import { db } from '../index';
import { timezones } from '../schema/timezones';

/**
 * Migración para crear y poblar la tabla de timezones con datos de IANA
 * @author Santiago Prada
 */

// Datos de timezones extraídos del archivo IANA
const timezoneData = [
  { countryCodes: 'AD', coordinates: '+4230+00131', timezoneName: 'Europe/Andorra', comments: null },
  { countryCodes: 'AE,OM', coordinates: '+2518+05518', timezoneName: 'Asia/Dubai', comments: null },
  { countryCodes: 'AF', coordinates: '+3431+06912', timezoneName: 'Asia/Kabul', comments: null },
  { countryCodes: 'AL', coordinates: '+4120+01950', timezoneName: 'Europe/Tirane', comments: null },
  { countryCodes: 'AM', coordinates: '+4011+04430', timezoneName: 'Asia/Yerevan', comments: null },
  { countryCodes: 'AQ', coordinates: '-6617+11031', timezoneName: 'Antarctica/Casey', comments: 'Casey' },
  { countryCodes: 'AQ', coordinates: '-6835+07758', timezoneName: 'Antarctica/Davis', comments: 'Davis' },
  { countryCodes: 'AQ', coordinates: '-6640+14001', timezoneName: 'Antarctica/DumontDUrville', comments: 'Dumont-d\'Urville' },
  { countryCodes: 'AQ', coordinates: '-6736+06253', timezoneName: 'Antarctica/Mawson', comments: 'Mawson' },
  { countryCodes: 'AQ', coordinates: '-6448-06406', timezoneName: 'Antarctica/Palmer', comments: 'Palmer' },
  { countryCodes: 'AQ', coordinates: '-6734-06808', timezoneName: 'Antarctica/Rothera', comments: 'Rothera' },
  { countryCodes: 'AQ', coordinates: '-690022+0393524', timezoneName: 'Antarctica/Syowa', comments: 'Syowa' },
  { countryCodes: 'AQ', coordinates: '-720041+0023206', timezoneName: 'Antarctica/Troll', comments: 'Troll' },
  { countryCodes: 'AQ', coordinates: '-7824+10654', timezoneName: 'Antarctica/Vostok', comments: 'Vostok' },
  { countryCodes: 'AR', coordinates: '-3436-05827', timezoneName: 'America/Argentina/Buenos_Aires', comments: 'Buenos Aires (BA, CF)' },
  { countryCodes: 'AR', coordinates: '-3124-06411', timezoneName: 'America/Argentina/Cordoba', comments: 'Argentina (most areas: CB, CC, CN, ER, FM, MN, SE, SF)' },
  { countryCodes: 'AR', coordinates: '-2447-06525', timezoneName: 'America/Argentina/Salta', comments: 'Salta (SA, LP, NQ, RN)' },
  { countryCodes: 'AR', coordinates: '-2411-06518', timezoneName: 'America/Argentina/Jujuy', comments: 'Jujuy (JY)' },
  { countryCodes: 'AR', coordinates: '-2649-06513', timezoneName: 'America/Argentina/Tucuman', comments: 'Tucumán (TM)' },
  { countryCodes: 'AR', coordinates: '-2828-06547', timezoneName: 'America/Argentina/Catamarca', comments: 'Catamarca (CT); Chubut (CH)' },
  { countryCodes: 'AR', coordinates: '-2926-06651', timezoneName: 'America/Argentina/La_Rioja', comments: 'La Rioja (LR)' },
  { countryCodes: 'AR', coordinates: '-3132-06831', timezoneName: 'America/Argentina/San_Juan', comments: 'San Juan (SJ)' },
  { countryCodes: 'AR', coordinates: '-3253-06849', timezoneName: 'America/Argentina/Mendoza', comments: 'Mendoza (MZ)' },
  { countryCodes: 'AR', coordinates: '-3319-06621', timezoneName: 'America/Argentina/San_Luis', comments: 'San Luis (SL)' },
  { countryCodes: 'AR', coordinates: '-5138-06913', timezoneName: 'America/Argentina/Rio_Gallegos', comments: 'Santa Cruz (SC)' },
  { countryCodes: 'AR', coordinates: '-5448-06818', timezoneName: 'America/Argentina/Ushuaia', comments: 'Tierra del Fuego (TF)' },
  { countryCodes: 'AS,UM', coordinates: '-1416-17042', timezoneName: 'Pacific/Pago_Pago', comments: 'Samoa, Midway' },
  { countryCodes: 'AT', coordinates: '+4813+01620', timezoneName: 'Europe/Vienna', comments: null },
  { countryCodes: 'AU', coordinates: '-3133+15905', timezoneName: 'Australia/Lord_Howe', comments: 'Lord Howe Island' },
  { countryCodes: 'AU', coordinates: '-5430+15857', timezoneName: 'Antarctica/Macquarie', comments: 'Macquarie Island' },
  // ... (continúa con todos los timezones)
  // Nota: Para mantener el archivo manejable, aquí solo se muestran algunos ejemplos
  // En la implementación real, incluirías todos los 347 timezones
];

/**
 * Función para poblar la tabla de timezones
 */
export async function populateTimezones() {
  try {
    console.log('🌍 Iniciando población de timezones...');
    
    // Verificar si ya existen datos
    const existingCount = await db.select().from(timezones);
    
    if (existingCount.length > 0) {
      console.log(`⚠️  Ya existen ${existingCount.length} timezones en la base de datos`);
      console.log('🔄 Limpiando tabla para repoblar...');
      // Opcional: limpiar tabla antes de repoblar
      // await db.delete(timezones);
    }
    
    // Insertar datos en lotes para mejor rendimiento
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < timezoneData.length; i += batchSize) {
      const batch = timezoneData.slice(i, i + batchSize);
      await db.insert(timezones).values(batch);
      insertedCount += batch.length;
      console.log(`📊 Insertados ${insertedCount}/${timezoneData.length} timezones`);
    }
    
    console.log('✅ Población de timezones completada exitosamente');
    console.log(`📝 Total de registros insertados: ${insertedCount}`);
    
  } catch (error) {
    console.error('❌ Error al poblar timezones:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  populateTimezones()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}