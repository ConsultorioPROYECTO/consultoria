# Planificación de Seguridad y Arquitectura para R2 Buckets por Organización

## 1. Arquitectura Multi-Tenant con R2

### 1.1. Estrategia de Nomenclatura de Buckets

Para garantizar un aislamiento claro y evitar tanto colisiones de nombres como la predictibilidad, los buckets se nombrarán utilizando una combinación de un prefijo, el `organizationId` y un componente pseudoaleatorio. Esto ofusca el nombre del bucket, impidiendo que actores maliciosos puedan adivinarlo.

- **Formato Sugerido:** `org-[organizationId]-[uuid]`
- **Ejemplo:** `org-12345-a4e8f8b2-9b6b-4a5c-8e1a-3d9f4c1b0e2d`

**Implementación:**
- Al crear una nueva organización, genera un `UUIDv4`.
- Almacena el nombre completo del bucket (`org-[organizationId]-[uuid]`) en la base de datos de tu aplicación, asociado a la organización correspondiente. Este nombre será utilizado por la aplicación para interactuar con la API de Cloudflare R2.

### 1.2. Aislamiento de Datos por Organización

Cada organización tendrá su propio bucket de R2, lo que garantiza un aislamiento completo de los datos a nivel de infraestructura. El acceso a cada bucket estará estrictamente controlado por el `organizationId` y el nombre único del bucket.

## 2. Gestión de Acceso y Permisos

### 2.1. Autenticación y Autorización

El acceso a los buckets de R2 se gestionará a través de la API de Cloudflare, utilizando tokens de API con permisos específicos. La aplicación actuará como un intermediario, validando las solicitudes de los usuarios y generando tokens de acceso con alcance limitado según sea necesario.

### 2.2. Tokens de Acceso con Alcance (Scoped Access Tokens)

Para operaciones específicas (por ejemplo, carga o descarga de un archivo), la aplicación generará tokens de API de Cloudflare con alcance limitado que solo otorgan los permisos necesarios para esa operación en un objeto específico.

- **Permisos:** `r2:object:read`, `r2:object:write`, `r2:object:delete`
- **Recurso:** `arn:aws:s3:::org-[organizationId]-[uuid]/[filePath]`

### 2.3. Políticas de Acceso a Nivel de Bucket

Se configurarán políticas de acceso a nivel de bucket para denegar el acceso público por defecto. Solo se permitirá el acceso a través de solicitudes autenticadas y autorizadas por la aplicación.

## 3. Seguridad de los Datos

### 3.1. Cifrado en Reposo y en Tránsito

- **En Tránsito:** Todo el tráfico hacia y desde R2 se realizará a través de HTTPS (TLS), garantizando que los datos estén cifrados durante la transferencia.
- **En Reposo:** Cloudflare R2 cifra automáticamente todos los los datos en reposo sin costo adicional.

### 3.2. Firmas de URL para Acceso Temporal

Para permitir que los usuarios finales accedan a los archivos de forma segura (por ejemplo, para ver un PDF), la aplicación generará URLs prefirmadas con un tiempo de vida corto (por ejemplo, 5 minutos). Esto evita la exposición de los archivos a accesos no autorizados.

### 3.3. Prevención de Fugas de Datos (DLP)

Se pueden implementar reglas de Cloudflare DLP para escanear archivos en busca de información sensible antes de que se carguen en R2, aunque esto puede tener implicaciones de costo y rendimiento.

## 4. Subida y Acceso Seguro a Archivos

### 4.1. Flujo de Carga Segura de Archivos (Upload)

1.  **Solicitud del Cliente:** El usuario, a través del cliente (navegador o aplicación móvil), indica que desea subir un archivo.
2.  **Autenticación y Autorización en tu Backend:** Tu aplicación verifica la identidad del usuario y se asegura de que tiene permisos para subir archivos para su organización.
3.  **Generación de URL Pre-firmada (Pre-signed URL):**
    *   Tu backend construye el nombre del objeto (key) que tendrá el archivo en R2 (e.g., `pdfs/documento-legal-2024.pdf`).
    *   Tu backend solicita a la API de Cloudflare (o utiliza un SDK de AWS S3 compatible) la creación de una URL pre-firmada para una operación `PutObject`.
    *   Esta URL incluye credenciales de acceso temporales y tiene un tiempo de expiración corto (e.g., 5-15 minutos).
4.  **Respuesta al Cliente:** Tu backend devuelve la URL pre-firmada al cliente.
5.  **Carga Directa a R2:** El cliente utiliza esta URL para subir el archivo directamente a Cloudflare R2 mediante una petición `HTTP PUT`. La carga no pasa por tus servidores, lo que ahorra ancho de banda y recursos.
6.  **Confirmación (Opcional):** Una vez que la carga se completa, el cliente puede notificar a tu backend para que este registre la existencia del nuevo archivo en la base de datos.

### 4.2. Flujo de Acceso Seguro a Archivos (Download/View)

1.  **Solicitud del Cliente:** El usuario solicita acceso a un archivo específico.
2.  **Autenticación y Autorización en tu Backend:** Tu aplicación verifica la identidad del usuario y comprueba si tiene permisos para acceder al archivo solicitado (basado en la organización, roles, etc.).
3.  **Generación de URL Pre-firmada:**
    *   Tu backend determina el nombre del bucket y el `key` del objeto que el usuario quiere ver.
    *   Solicita a la API de Cloudflare una URL pre-firmada para una operación `GetObject`.
    *   Esta URL también tiene un tiempo de expiración muy corto (e.g., 1-5 minutos) para minimizar el riesgo de compartición no autorizada.
4.  **Respuesta al Cliente:** Tu backend devuelve la URL pre-firmada al cliente.
5.  **Acceso Directo desde R2:** El cliente (e.g., el navegador) utiliza esta URL para descargar o mostrar el archivo directamente desde Cloudflare R2.

## 5. Gestión de Uso y Límites de Tasa (Rate Limits)

En lugar de una gestión proactiva de los límites de tasa basada en el cliente, adoptaremos un enfoque de monitoreo y reacción basado en las métricas que ofrece la API de Cloudflare. El nombre único de cada bucket se almacenará en la columna `r2BucketName` de la tabla `organization`.

### 5.1. Monitoreo del Uso por Bucket

Para medir el uso del servicio R2 por parte de cada organización, se realizarán consultas periódicas a la API de Cloudflare para obtener métricas a nivel de bucket. Esto nos permite tener una visión clara del consumo de recursos (almacenamiento, número de operaciones, etc.) para cada cliente.

**Endpoint de la API a Utilizar:**

Cloudflare proporciona un endpoint para obtener métricas de un bucket específico. Aunque la documentación de la API no detalla un endpoint de "métricas" por bucket de forma explícita en los resultados de búsqueda, la funcionalidad de `Account-Level Metrics` y los `Logs` son los mecanismos recomendados para esta tarea.

- **Cloudflare Log Explorer/Logpush:** Es la herramienta más poderosa para este caso. Puedes filtrar los logs de R2 por el nombre del bucket (`bucketName`) para obtener un detalle granular de cada solicitud, incluyendo:
    - Operaciones (Read, Write, Delete)
    - Tamaño de los objetos
    - Origen de la solicitud
    - Timestamps

- **API de Métricas a Nivel de Cuenta:** La API de Cloudflare permite obtener métricas agregadas a nivel de cuenta. Aunque no desglosan por bucket directamente en un solo endpoint, se pueden usar en combinación con los logs para obtener una visión general.

### 5.2. Estrategia de Implementación

1.  **Almacenar el Nombre del Bucket:** Al crear una organización, el nombre único del bucket (`org-[organizationId]-[uuid]`) se guarda en la tabla `organization`.

2.  **Servicio de Monitoreo en el Backend:**
    *   Crear un servicio o un job programado (e.g., un cron job) que se ejecute periódicamente (e.g., cada hora o cada 24 horas).
    *   Este servicio obtendrá la lista de todas las organizaciones y sus `r2BucketName` de la base de datos.
    *   Para cada bucket, consultará los logs de Cloudflare (vía Logpush o la API de Log Explorer) para agregar las métricas de uso relevantes del último período.

3.  **Persistencia de Métricas (Opcional pero Recomendado):**
    *   Almacenar las métricas de uso agregadas en una tabla separada en tu base de datos (e.g., `r2_usage_metrics`) asociada a cada organización.
    *   Esto permite construir históricos de consumo, generar facturas, y mostrar dashboards a los clientes sin tener que consultar la API de Cloudflare en tiempo real para cada vista.

4.  **Gestión de Límites de Tasa:**
    *   Con este enfoque, la gestión de límites de tasa se vuelve reactiva. Si se detecta un uso excesivo o abusivo por parte de una organización, se pueden tomar acciones:
        *   **Notificaciones:** Enviar alertas al administrador del sistema o al cliente.
        *   **Restricción de Acceso:** Deshabilitar temporalmente la generación de URLs pre-firmadas para esa organización si el abuso persiste.
        *   **Escalado de Plan:** Invitar al cliente a actualizar su plan si su uso supera consistentemente los límites establecidos.

## 6. Gestión del Ciclo de Vida de los Datos

### 6.1. Políticas de Retención y Eliminación

Se pueden configurar políticas de ciclo de vida en los buckets de R2 para eliminar automáticamente objetos después de un período de tiempo específico, lo que ayuda a gestionar los costos de almacenamiento y cumplir con las políticas de retención de datos.

### 6.2. Versionado de Objetos

El versionado de objetos se puede habilitar en los buckets de R2 para proteger contra la eliminación o sobreescritura accidental de archivos.

## 7. Auditoría y Monitoreo

### 7.1. Registro de Actividad

Cloudflare proporciona registros de auditoría detallados para todas las operaciones de la API de R2. Estos registros se pueden integrar con un sistema de monitoreo para detectar actividades sospechosas.

### 7.2. Alertas y Notificaciones

Se pueden configurar alertas para notificar a los administradores sobre eventos de seguridad críticos, como intentos de acceso no autorizados o cambios en las políticas de los buckets.

## 8. Integración con la Aplicación

### 8.1. Flujo de Creación de Buckets

Cuando se crea una nueva organización, la aplicación realizará una llamada a la API de Cloudflare para crear un nuevo bucket de R2 con el nombre `org-[organizationId]-[uuid]`.

### 8.2. Flujo de Carga y Descarga de Archivos

1.  El usuario solicita cargar o descargar un archivo a través de la aplicación.
2.  La aplicación autentica y autoriza al usuario.
3.  La aplicación genera una URL prefirmada para la operación solicitada.
4.  El cliente del usuario utiliza la URL prefirmada para interactuar directamente con R2.

## 9. Consideraciones Adicionales

### 9.1. Límites de Tasa (Rate Limiting)

Se pueden aplicar límites de tasa a nivel de API para proteger contra el abuso y garantizar un rendimiento justo para todos los usuarios.

### 9.2. Protección contra Ataques de Denegación de Servicio (DDoS)

Cloudflare proporciona protección contra ataques DDoS de forma nativa.

### 9.3. Costos y Optimización

- **Clases de Almacenamiento:** Utilice la clase de almacenamiento adecuada para sus datos (por ejemplo, `Standard` para datos de acceso frecuente).
- **Políticas de Ciclo de Vida:** Utilice políticas de ciclo de vida para eliminar datos innecesarios y reducir los costos de almacenamiento.