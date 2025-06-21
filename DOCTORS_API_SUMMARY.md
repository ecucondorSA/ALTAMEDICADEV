# 🏥 API Endpoints de Doctores - AltaMedica

## 📋 Resumen de Endpoints Implementados

### 🔵 Endpoints Principales de Doctores

#### 1. **GET /api/v1/doctors**

- Lista y busca doctores con filtros avanzados
- **Parámetros:** page, limit, specialty, companyId, city, isVerified, search
- **Funcionalidades:**
  - Paginación
  - Filtros por especialidad, empresa, verificación
  - Búsqueda por texto (nombre, bio)
  - Ordenamiento por fecha de creación

#### 2. **POST /api/v1/doctors**

- Crea un nuevo perfil de doctor
- **Requiere:** Token de autorización
- **Validaciones:**
  - Usuario debe existir y tener rol de doctor
  - No debe existir perfil previo

---

### 🔷 Endpoints de Doctor Individual

#### 3. **GET /api/v1/doctors/[id]**

- Obtiene información detallada de un doctor específico
- **Incluye:** Datos del usuario, perfil profesional, información de empresa

#### 4. **PUT /api/v1/doctors/[id]**

- Actualiza el perfil de un doctor
- **Requiere:** Token de autorización
- **Validación:** Schema de actualización

#### 5. **DELETE /api/v1/doctors/[id]**

- Elimina el perfil de un doctor (soft delete)
- **Requiere:** Token de autorización

---

### 📅 Gestión de Horarios y Disponibilidad

#### 6. **GET /api/v1/doctors/[id]/availability**

- Consulta disponibilidad del doctor
- **Parámetros:** date, startDate, endDate
- **Funcionalidades:**
  - Disponibilidad por fecha específica
  - Rango de fechas
  - Disponibilidad semanal completa

#### 7. **PUT /api/v1/doctors/[id]/availability**

- Actualiza la disponibilidad semanal del doctor
- **Requiere:** Token de autorización
- **Validación:** Formato de horarios (HH:MM-HH:MM)

#### 8. **GET /api/v1/doctors/[id]/schedule** ⭐ _Nuevo_

- Horario detallado con slots de tiempo de 30 minutos
- **Parámetros:** date, startDate, endDate, includeBooked
- **Funcionalidades:**
  - Slots disponibles/ocupados
  - Información de citas si está ocupado
  - Estadísticas por día

---

### 👥 Gestión de Pacientes

#### 9. **GET /api/v1/doctors/[id]/patients**

- Lista pacientes del doctor con estadísticas
- **Parámetros:** page, limit, status, search, hasUpcomingAppointments, sortBy, sortOrder
- **Funcionalidades:**
  - Filtros por estado y citas próximas
  - Búsqueda por nombre/email
  - Estadísticas de citas por paciente
  - Información de próxima/última cita

---

### 📊 Estadísticas y Análisis

#### 10. **GET /api/v1/doctors/[id]/stats**

- Estadísticas detalladas del doctor
- **Parámetros:** period, startDate, endDate
- **Métricas:**
  - Citas totales, completadas, canceladas
  - Ingresos generados
  - Pacientes únicos y nuevos
  - Estadísticas diarias
  - Distribución por tipo de cita

---

### 📱 Gestión de Citas

#### 11. **GET /api/v1/doctors/[id]/appointments** ⭐ _Nuevo_

- Lista citas del doctor con filtros avanzados
- **Parámetros:** page, limit, status, startDate, endDate, period, patientId
- **Funcionalidades:**
  - Filtros por estado y período
  - Información completa del paciente
  - Estadísticas rápidas
  - Períodos predefinidos (today, tomorrow, week, month)

---

### ⭐ Reseñas y Calificaciones

#### 12. **GET /api/v1/doctors/[id]/reviews** ⭐ _Nuevo_

- Obtiene reseñas del doctor
- **Parámetros:** page, limit, rating, sortBy
- **Funcionalidades:**
  - Filtro por calificación
  - Ordenamiento múltiple
  - Estadísticas de reseñas
  - Distribución de calificaciones
  - Actualización automática de rating del doctor

#### 13. **POST /api/v1/doctors/[id]/reviews** ⭐ _Nuevo_

- Crea nueva reseña para el doctor
- **Requiere:** Token de autorización
- **Validaciones:**
  - Cita debe estar completada
  - No debe existir reseña previa para la cita
  - Calificaciones por categorías

---

### 🔍 Búsqueda Avanzada

#### 14. **GET /api/v1/doctors/search/location** ⭐ _Nuevo_

- Búsqueda de doctores por ubicación geográfica
- **Parámetros:** latitude, longitude, radiusKm, specialty, isVerified, minRating, sortBy
- **Funcionalidades:**
  - Cálculo de distancia real
  - Filtro por radio de búsqueda
  - Información de clínicas
  - Ordenamiento por distancia/rating/precio
  - Estadísticas de búsqueda

---

### 🛡️ Verificación y Administración

#### 15. **GET /api/v1/doctors/[id]/verification** ⭐ _Nuevo_

- Consulta estado y historial de verificación
- **Incluye:**
  - Estado actual de verificación
  - Historial completo de cambios
  - Documentos de verificación

#### 16. **PUT /api/v1/doctors/[id]/verification** ⭐ _Nuevo_

- Actualiza estado de verificación del doctor
- **Requiere:** Token de autorización
- **Funcionalidades:**
  - Verificación/rechazo
  - Notas del verificador
  - Registro de auditoría
  - Documentos de respaldo

---

## 🚀 Características Técnicas

### ✅ Implementadas en Todos los Endpoints:

- **Validación con Zod** para todos los parámetros
- **Manejo de errores** consistente y detallado
- **Paginación** en endpoints de listado
- **Autenticación** donde es requerida
- **Respuestas estandarizadas** con createSuccessResponse/createErrorResponse
- **Logging** de errores para debugging
- **Filtros múltiples** y búsqueda avanzada

### 🔧 Funcionalidades Avanzadas:

- **Geolocalización** con cálculo de distancias
- **Estadísticas en tiempo real**
- **Gestión de horarios** con slots de tiempo
- **Sistema de reseñas** completo
- **Auditoría de verificación**
- **Búsqueda inteligente** por múltiples criterios

### 📈 Métricas y Análisis:

- Estadísticas de rendimiento por doctor
- Análisis de pacientes y citas
- Distribución de calificaciones
- Métricas de disponibilidad
- Reportes por períodos personalizables

---

## 🎯 Próximos Pasos Sugeridos:

1. **Implementar caché** para consultas frecuentes
2. **Notificaciones push** para citas y cambios
3. **Integración con sistemas de pago** para consultas
4. **API de mensajería** entre doctor-paciente
5. **Dashboard de analytics** avanzado
6. **Exportación de reportes** en PDF/Excel

---

_✨ Todos los endpoints están listos para uso en producción con manejo robusto de errores y validaciones completas._
