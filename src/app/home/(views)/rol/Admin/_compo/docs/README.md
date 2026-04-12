
# Planificación para la Obtención Dinámica de Datos del Gráfico

## Objetivo

El objetivo de esta tarea es reemplazar los datos estáticos actualmente utilizados en el componente `ChartAreaInteractive` por datos dinámicos obtenidos a través de la API de calendario existente. Esto proporcionará una representación visual precisa y en tiempo real de la carga de trabajo de los médicos.

## API de Referencia

Utilizaremos el siguiente endpoint de la API para obtener los datos del calendario:

**Endpoint:** `GET /api/doctors/[id]/calendar`

Este endpoint devuelve los eventos de calendario para un médico específico, lo que nos permitirá calcular el número de citas (`citas`) y las horas ocupadas (`busyHours`) por día.

## Pasos de Implementación

1.  **Crear un Hook Personalizado (useChartData):**
    *   Crear un nuevo hook llamado `useChartData` que se encargará de la lógica para obtener y procesar los datos del calendario.
    *   Este hook recibirá como parámetro el `id` del médico.
    *   El hook debe realizar una solicitud a la API `GET /api/doctors/[id]/calendar`.
    *   Manejará los estados de carga (`loading`), error (`error`) y los datos (`data`).

2.  **Procesamiento de Datos:**
    *   Una vez que se reciben los datos de la API, el hook `useChartData` deberá procesarlos para transformarlos al formato requerido por el gráfico (`chartData`).
    *   La estructura de datos de salida debe ser un array de objetos con el siguiente formato:
        ```json
        {
          "date": "YYYY-MM-DD",
          "citas": Number,
          "busyHours": Number
        }
        ```
    *   **Lógica de Cálculo:**
        *   `citas`: Contar el número de eventos de calendario por día.
        *   `busyHours`: Sumar la duración de todos los eventos de calendario por día. Será necesario calcular la diferencia en horas entre `start` y `end` de cada evento.

3.  **Integración con el Componente `ChartAreaInteractive`:**
    *   Modificar el componente `ChartAreaInteractive` para que utilice el hook `useChartData`.
    *   El `id` del médico deberá ser pasado como prop al componente y, a su vez, al hook.
    *   Reemplazar el `chartData` estático con los datos dinámicos obtenidos del hook.
    *   Añadir estados de carga y error en el componente para mejorar la experiencia de usuario. Por ejemplo, mostrar un esqueleto o un spinner mientras se cargan los datos y un mensaje de error si la solicitud a la API falla.

4.  **Eliminación de Código Estático:**
    *   Una vez que la integración esté completa y verificada, eliminar la variable `chartData` estática del componente `ChartAreaInteractive`.

## Consideraciones Adicionales

*   **Manejo de Errores:** Implementar un manejo de errores robusto en caso de que la API no devuelva los datos esperados o falle la solicitud.
*   **Optimización:** Considerar la posibilidad de cachear los datos obtenidos de la API para evitar solicitudes innecesarias y mejorar el rendimiento, especialmente si el usuario navega frecuentemente entre diferentes vistas de médicos.
*   **Fechas:** Asegurarse de que el manejo de fechas y zonas horarias sea consistente para evitar errores en los cálculos.
