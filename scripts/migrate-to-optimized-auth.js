#!/usr/bin/env node

/**
 * Script de migración para actualizar endpoints a usar el middleware de autenticación optimizado
 * 
 * Este script automatiza la migración de endpoints que usan el middleware anterior
 * al nuevo middleware optimizado con cache.
 * 
 * Uso:
 *   node scripts/migrate-to-optimized-auth.js [directorio]
 * 
 * Ejemplo:
 *   node scripts/migrate-to-optimized-auth.js src/app/api
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Configuración de la migración
const MIGRATION_CONFIG = {
  // Patrones a buscar y reemplazar
  patterns: {
    // Imports antiguos
    oldImports: [
      /import\s+{\s*withAuthentication\s*}\s+from\s+['"][^'"]*auth[Mm]iddleware['"];?/g,
      /import\s+{\s*authenticateRequest\s*}\s+from\s+['"][^'"]*auth[^'"]*['"];?/g
    ],
    
    // Nuevos imports
    newImports: {
      admin: "import { withOptimizedAdminAuth, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';",
      doctor: "import { withOptimizedDoctorAuth, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';",
      assistant: "import { withOptimizedAssistantAuth, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';",
      multi: "import { withOptimizedMultiRoleAuth, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';"
    },
    
    // Patrones de handlers
    handlerPatterns: {
      // Handler con decodedToken y userInfo
      oldHandler: /const\s+(\w+)\s*=\s*async\s*\(\s*request:\s*NextRequest,\s*decodedToken:\s*DecodedIdToken,\s*userInfo:\s*\w+/g,
      newHandler: 'const $1 = async (request: NextRequest, userInfo: AuthenticatedUserInfo'
    },
    
    // Exports
    exports: {
      withAuthentication: /export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*withAuthentication\s*\(\s*(\w+)\s*\)/g
    }
  },
  
  // Roles detectados automáticamente
  roleDetection: {
    admin: ['admin', 'administrador'],
    doctor: ['medico', 'doctor'],
    assistant: ['asistente', 'assistant']
  }
};

/**
 * Clase principal para la migración
 */
class AuthMigrator {
  constructor(targetDir = 'src/app/api') {
    this.targetDir = targetDir;
    this.migratedFiles = [];
    this.errors = [];
    this.stats = {
      filesProcessed: 0,
      filesMigrated: 0,
      errorsFound: 0
    };
  }

  /**
   * Ejecuta la migración completa
   */
  async migrate() {
    console.log('🚀 Iniciando migración de autenticación optimizada...');
    console.log(`📁 Directorio objetivo: ${this.targetDir}`);
    
    try {
      const files = this.findRouteFiles(this.targetDir);
      console.log(`📄 Encontrados ${files.length} archivos de rutas`);
      
      for (const file of files) {
        await this.migrateFile(file);
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Error durante la migración:', error.message);
      process.exit(1);
    }
  }

  /**
   * Encuentra todos los archivos route.ts en el directorio
   */
  findRouteFiles(dir) {
    const files = [];
    
    const scanDir = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item === 'route.ts' || item === 'route.js') {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(dir);
    return files;
  }

  /**
   * Migra un archivo individual
   */
  async migrateFile(filePath) {
    this.stats.filesProcessed++;
    
    try {
      console.log(`\n🔄 Procesando: ${filePath}`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar si ya usa el middleware optimizado
      if (content.includes('withOptimized') || content.includes('optimizedAuthMiddleware')) {
        console.log('  ✅ Ya usa middleware optimizado, saltando...');
        return;
      }
      
      // Verificar si usa autenticación
      if (!this.usesAuthentication(content)) {
        console.log('  ⏭️  No usa autenticación, saltando...');
        return;
      }
      
      const migratedContent = this.transformContent(content, filePath);
      
      if (migratedContent !== content) {
        // Crear backup
        fs.writeFileSync(`${filePath}.backup`, content);
        
        // Escribir contenido migrado
        fs.writeFileSync(filePath, migratedContent);
        
        this.migratedFiles.push(filePath);
        this.stats.filesMigrated++;
        
        console.log('  ✅ Migrado exitosamente');
        
        // Verificar sintaxis
        this.validateSyntax(filePath);
        
      } else {
        console.log('  ⚠️  No se requieren cambios');
      }
      
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      this.stats.errorsFound++;
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  /**
   * Verifica si el archivo usa autenticación
   */
  usesAuthentication(content) {
    return content.includes('withAuthentication') || 
           content.includes('authenticateRequest') ||
           content.includes('DecodedIdToken');
  }

  /**
   * Transforma el contenido del archivo
   */
  transformContent(content, filePath) {
    let transformed = content;
    
    // 1. Detectar rol requerido
    const requiredRole = this.detectRequiredRole(content, filePath);
    console.log(`  🎭 Rol detectado: ${requiredRole}`);
    
    // 2. Reemplazar imports
    transformed = this.replaceImports(transformed, requiredRole);
    
    // 3. Actualizar handler signature
    transformed = this.updateHandlerSignature(transformed);
    
    // 4. Remover validaciones manuales de rol
    transformed = this.removeManualRoleValidation(transformed);
    
    // 5. Actualizar exports
    transformed = this.updateExports(transformed, requiredRole);
    
    // 6. Limpiar imports no utilizados
    transformed = this.cleanUnusedImports(transformed);
    
    return transformed;
  }

  /**
   * Detecta el rol requerido basado en el contenido
   */
  detectRequiredRole(content, filePath = '') {
    // Buscar validaciones de rol explícitas
    const roleChecks = content.match(/role\s*[!=]==?\s*['"]([^'"]+)['"]/g);
    
    if (roleChecks) {
      for (const check of roleChecks) {
        const match = check.match(/['"]([^'"]+)['"]/);        if (match) {
          const role = match[1].toLowerCase();
          
          if (MIGRATION_CONFIG.roleDetection.admin.includes(role)) {
            return 'admin';
          } else if (MIGRATION_CONFIG.roleDetection.doctor.includes(role)) {
            return 'doctor';
          } else if (MIGRATION_CONFIG.roleDetection.assistant.includes(role)) {
            return 'assistant';
          }
        }
      }
    }
    
    // Detectar por nombre de archivo/ruta
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.includes('admin')) return 'admin';
    if (lowerPath.includes('doctor') || lowerPath.includes('medico')) return 'doctor';
    if (lowerPath.includes('assistant') || lowerPath.includes('asistente')) return 'assistant';
    
    // Default a admin si no se puede detectar
    return 'admin';
  }

  /**
   * Reemplaza los imports antiguos
   */
  replaceImports(content, role) {
    let transformed = content;
    
    // Remover imports antiguos
    for (const pattern of MIGRATION_CONFIG.patterns.oldImports) {
      transformed = transformed.replace(pattern, '');
    }
    
    // Agregar nuevo import
    const newImport = MIGRATION_CONFIG.patterns.newImports[role] || MIGRATION_CONFIG.patterns.newImports.admin;
    
    // Encontrar lugar apropiado para insertar import
    const importLines = transformed.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].startsWith('import ')) {
        insertIndex = i + 1;
      } else if (importLines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    importLines.splice(insertIndex, 0, newImport);
    return importLines.join('\n');
  }

  /**
   * Actualiza la signature del handler
   */
  updateHandlerSignature(content) {
    return content.replace(
      MIGRATION_CONFIG.patterns.handlerPatterns.oldHandler,
      MIGRATION_CONFIG.patterns.handlerPatterns.newHandler
    );
  }

  /**
   * Remueve validaciones manuales de rol
   */
  removeManualRoleValidation(content) {
    // Patrones comunes de validación de rol
    const roleValidationPatterns = [
      /if\s*\(\s*userInfo\.role\s*!==\s*['"][^'"]+['"]\s*\)\s*{[^}]*}/gs,
      /if\s*\(\s*requestingUser\.role\s*!==\s*['"][^'"]+['"]\s*\)\s*{[^}]*}/gs
    ];
    
    let transformed = content;
    for (const pattern of roleValidationPatterns) {
      transformed = transformed.replace(pattern, '// Validación de rol removida - ahora manejada por middleware optimizado');
    }
    
    return transformed;
  }

  /**
   * Actualiza los exports
   */
  updateExports(content, role) {
    const middlewareMap = {
      admin: 'withOptimizedAdminAuth',
      doctor: 'withOptimizedDoctorAuth',
      assistant: 'withOptimizedAssistantAuth'
    };
    
    const middleware = middlewareMap[role] || 'withOptimizedAdminAuth';
    
    return content.replace(
      MIGRATION_CONFIG.patterns.exports.withAuthentication,
      `export const $1 = ${middleware}($2)`
    );
  }

  /**
   * Limpia imports no utilizados
   */
  cleanUnusedImports(content) {
    // Remover import de DecodedIdToken si no se usa
    if (!content.includes('DecodedIdToken') || content.match(/DecodedIdToken/g).length <= 1) {
      content = content.replace(/import\s+type\s*{\s*DecodedIdToken\s*}\s+from\s+['"][^'"]*['"];?\s*\n?/g, '');
    }
    
    return content;
  }

  /**
   * Valida la sintaxis del archivo migrado
   */
  validateSyntax(filePath) {
    try {
      // Intentar compilar con TypeScript
      execSync(`npx tsc --noEmit ${filePath}`, { stdio: 'pipe' });
      console.log('  ✅ Sintaxis válida');
    } catch {
      console.log('  ⚠️  Advertencia: Posibles errores de sintaxis');
      console.log(`     Ejecuta: npx tsc --noEmit ${filePath}`);
    }
  }

  /**
   * Imprime resumen de la migración
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    
    console.log(`📄 Archivos procesados: ${this.stats.filesProcessed}`);
    console.log(`✅ Archivos migrados: ${this.stats.filesMigrated}`);
    console.log(`❌ Errores encontrados: ${this.stats.errorsFound}`);
    
    if (this.migratedFiles.length > 0) {
      console.log('\n📝 Archivos migrados:');
      this.migratedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errores:');
      this.errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`);
      });
    }
    
    console.log('\n🔧 Próximos pasos:');
    console.log('  1. Revisar archivos migrados');
    console.log('  2. Ejecutar tests: npm test');
    console.log('  3. Verificar compilación: npm run build');
    console.log('  4. Remover backups si todo funciona: rm **/*.backup');
    
    console.log('\n✨ ¡Migración completada!');
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetDir = process.argv[2] || 'src/app/api';
  const migrator = new AuthMigrator(targetDir);
  migrator.migrate();
}

export default AuthMigrator;