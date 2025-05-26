-- =============================================================================
-- SCRIPT DE DATOS DE PRUEBA PARA APLICACIÓN DE CITAS MÉDICAS
-- =============================================================================
-- Fecha: 26 de Mayo 2025
-- Propósito: Poblar la base de datos con datos realistas para testing
-- Autor: Claude AI Assistant
-- Base de datos: db_aa057a_cita
-- =============================================================================

USE `db_aa057a_cita`;

-- Disable foreign key checks temporarily for easier insertion
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. LIMPIAR DATOS EXISTENTES (OPCIONAL - DESCOMENTAR SI ES NECESARIO)
-- =============================================================================
/*
DELETE FROM `assistant_doctor`;
DELETE FROM `doctor_services`;
DELETE FROM `appointments`;
DELETE FROM `assistants`;
DELETE FROM `doctors`;
DELETE FROM `patients`;
DELETE FROM `medical_services`;
DELETE FROM `users`;
DELETE FROM `organization`;

-- Reset AUTO_INCREMENT values
ALTER TABLE `organization` AUTO_INCREMENT = 1;
ALTER TABLE `users` AUTO_INCREMENT = 1;
ALTER TABLE `doctors` AUTO_INCREMENT = 1;
ALTER TABLE `assistants` AUTO_INCREMENT = 1;
ALTER TABLE `patients` AUTO_INCREMENT = 1;
ALTER TABLE `medical_services` AUTO_INCREMENT = 1;
ALTER TABLE `appointments` AUTO_INCREMENT = 1;
*/

-- =============================================================================
-- 2. INSERTAR ORGANIZACIONES
-- =============================================================================
INSERT INTO `organization` (
  `id`, `name`, `address`, `phone`, `email`, `nit`, `logo`, `invitation_code`, 
  `created_at`, `updated_at`
) VALUES 
(1, 'Clínica San Rafael', 'Calle 127 #15-45, Bogotá', '+57-1-2345678', 'info@clinicasanrafael.com', '900123456-1', 'logo_clinica_san_rafael.png', 'CSR001', NOW(), NOW()),
(2, 'Centro Médico La Esperanza', 'Carrera 45 #78-90, Medellín', '+57-4-3456789', 'contacto@centroesperanza.com', '900234567-2', 'logo_centro_esperanza.png', 'CME002', NOW(), NOW()),
(3, 'Hospital General Norte', 'Avenida 68 #123-45, Barranquilla', '+57-5-4567890', 'admin@hospitalgeneral.com', '900345678-3', 'logo_hospital_norte.png', 'HGN003', NOW(), NOW());

-- =============================================================================
-- 3. INSERTAR USUARIOS (ADMINISTRADORES, MÉDICOS, ASISTENTES)
-- =============================================================================

-- Administradores
INSERT INTO `users` (
  `id`, `firebase_uid`, `email`, `email_verified`, `phone_number`, `display_name`, 
  `photo_url`, `provider_id`, `role`, `is_active`, `organization_id`, 
  `last_login_at`, `created_at`, `updated_at`
) VALUES 
-- Admin Clínica San Rafael
(1, 'firebase_admin_1', 'admin@clinicasanrafael.com', 1, '+57-300-1234567', 'Dr. Carlos Rodríguez', 'https://example.com/photos/admin1.jpg', 'google.com', 'admin', 1, 1, NOW(), NOW(), NOW()),

-- Admin Centro Médico La Esperanza  
(2, 'firebase_admin_2', 'admin@centroesperanza.com', 1, '+57-310-2345678', 'Dra. María González', 'https://example.com/photos/admin2.jpg', 'google.com', 'admin', 1, 2, NOW(), NOW(), NOW()),

-- Médicos Clínica San Rafael
(3, 'firebase_doctor_1', 'doctor1@clinicasanrafael.com', 1, '+57-320-3456789', 'Dr. Juan Pérez', 'https://example.com/photos/doctor1.jpg', 'google.com', 'medico', 1, 1, NOW(), NOW(), NOW()),
(4, 'firebase_doctor_2', 'doctor2@clinicasanrafael.com', 1, '+57-321-4567890', 'Dra. Ana López', 'https://example.com/photos/doctor2.jpg', 'google.com', 'medico', 1, 1, NOW(), NOW(), NOW()),
(5, 'firebase_doctor_3', 'doctor3@clinicasanrafael.com', 1, '+57-322-5678901', 'Dr. Miguel Torres', 'https://example.com/photos/doctor3.jpg', 'google.com', 'medico', 1, 1, NOW(), NOW(), NOW()),

-- Médicos Centro Médico La Esperanza
(6, 'firebase_doctor_4', 'doctor1@centroesperanza.com', 1, '+57-323-6789012', 'Dr. Roberto Silva', 'https://example.com/photos/doctor4.jpg', 'google.com', 'medico', 1, 2, NOW(), NOW(), NOW()),
(7, 'firebase_doctor_5', 'doctor2@centroesperanza.com', 1, '+57-324-7890123', 'Dra. Patricia Vargas', 'https://example.com/photos/doctor5.jpg', 'google.com', 'medico', 1, 2, NOW(), NOW(), NOW()),

-- Asistentes Clínica San Rafael
(8, 'firebase_assistant_1', 'assistant1@clinicasanrafael.com', 1, '+57-330-8901234', 'Lucía Ramírez', 'https://example.com/photos/assistant1.jpg', 'google.com', 'asistente', 1, 1, NOW(), NOW(), NOW()),
(9, 'firebase_assistant_2', 'assistant2@clinicasanrafael.com', 1, '+57-331-9012345', 'Carlos Mendoza', 'https://example.com/photos/assistant2.jpg', 'google.com', 'asistente', 1, 1, NOW(), NOW(), NOW()),

-- Asistentes Centro Médico La Esperanza
(10, 'firebase_assistant_3', 'assistant1@centroesperanza.com', 1, '+57-332-0123456', 'Sofia Herrera', 'https://example.com/photos/assistant3.jpg', 'google.com', 'asistente', 1, 2, NOW(), NOW(), NOW()),

-- Usuario sin rol para testing
(11, 'firebase_user_norole', 'user@example.com', 1, '+57-340-1234567', 'Usuario Sin Rol', NULL, 'google.com', 'N/A', 1, 1, NOW(), NOW(), NOW());

-- =============================================================================
-- 4. INSERTAR MÉDICOS (PERFIL EXTENDIDO)
-- =============================================================================
INSERT INTO `doctors` (
  `id`, `user_id`, `speciality`, `calendar_id`, `private_phone`, `nit_id`, 
  `availability`, `token_google_id`, `created_at`, `updated_at`
) VALUES 
-- Clínica San Rafael
(1, 3, 'Cardiología', 'calendar_doctor_1_2025', '+57-320-3456789', '12345678-9', 'Lunes a Viernes 8:00-17:00', 'google_token_doctor_1', NOW(), NOW()),
(2, 4, 'Pediatría', 'calendar_doctor_2_2025', '+57-321-4567890', '23456789-0', 'Lunes a Sábado 7:00-15:00', 'google_token_doctor_2', NOW(), NOW()),
(3, 5, 'Dermatología', 'calendar_doctor_3_2025', '+57-322-5678901', '34567890-1', 'Martes a Sábado 9:00-18:00', 'google_token_doctor_3', NOW(), NOW()),

-- Centro Médico La Esperanza
(4, 6, 'Neurología', 'calendar_doctor_4_2025', '+57-323-6789012', '45678901-2', 'Lunes a Viernes 8:00-16:00', 'google_token_doctor_4', NOW(), NOW()),
(5, 7, 'Ginecología', 'calendar_doctor_5_2025', '+57-324-7890123', '56789012-3', 'Lunes a Viernes 7:00-14:00', 'google_token_doctor_5', NOW(), NOW());

-- =============================================================================
-- 5. INSERTAR ASISTENTES
-- =============================================================================
INSERT INTO `assistants` (
  `id`, `user_id`, `created_at`, `updated_at`
) VALUES 
(1, 8, NOW(), NOW()),  -- Lucía Ramírez
(2, 9, NOW(), NOW()),  -- Carlos Mendoza  
(3, 10, NOW(), NOW()); -- Sofia Herrera

-- =============================================================================
-- 6. ASIGNAR ASISTENTES A MÉDICOS
-- =============================================================================
INSERT INTO `assistant_doctor` (`assistant_id`, `doctor_id`) VALUES 
-- Lucía asiste a Dr. Juan Pérez (Cardiología) y Dra. Ana López (Pediatría)
(1, 1), (1, 2),
-- Carlos asiste a Dr. Miguel Torres (Dermatología)
(2, 3),
-- Sofia asiste a Dr. Roberto Silva (Neurología) y Dra. Patricia Vargas (Ginecología)
(3, 4), (3, 5);

-- =============================================================================
-- 7. INSERTAR SERVICIOS MÉDICOS
-- =============================================================================

-- Servicios Clínica San Rafael
INSERT INTO `medical_services` (
  `id`, `name`, `description`, `code`, `duration_minutes`, `base_price`, `category`, 
  `requires_preparation`, `preparation_instructions`, `organization_id`, `is_active`, 
  `created_at`, `updated_at`
) VALUES 
-- Cardiología
(1, 'Consulta Cardiología General', 'Consulta médica especializada en cardiología para evaluación cardiovascular', 'CARD-001', 45, 150000.00, 'Cardiología', 0, NULL, 1, 1, NOW(), NOW()),
(2, 'Electrocardiograma', 'Registro de la actividad eléctrica del corazón', 'CARD-002', 30, 80000.00, 'Cardiología', 0, NULL, 1, 1, NOW(), NOW()),
(3, 'Ecocardiograma', 'Ultrasonido del corazón para evaluar estructura y función', 'CARD-003', 60, 200000.00, 'Cardiología', 1, 'Ayuno de 4 horas antes del examen', 1, 1, NOW(), NOW()),
(4, 'Holter 24 horas', 'Monitoreo continuo del ritmo cardíaco durante 24 horas', 'CARD-004', 30, 250000.00, 'Cardiología', 1, 'Evitar duchas durante el monitoreo', 1, 1, NOW(), NOW()),

-- Pediatría
(5, 'Consulta Pediatría General', 'Consulta médica para niños y adolescentes', 'PED-001', 30, 120000.00, 'Pediatría', 0, NULL, 1, 1, NOW(), NOW()),
(6, 'Control de Crecimiento y Desarrollo', 'Evaluación del desarrollo físico y mental del niño', 'PED-002', 45, 100000.00, 'Pediatría', 0, NULL, 1, 1, NOW(), NOW()),
(7, 'Vacunación', 'Aplicación de vacunas según esquema nacional', 'PED-003', 15, 60000.00, 'Pediatría', 0, NULL, 1, 1, NOW(), NOW()),

-- Dermatología
(8, 'Consulta Dermatología General', 'Consulta especializada en enfermedades de la piel', 'DERM-001', 40, 140000.00, 'Dermatología', 0, NULL, 1, 1, NOW(), NOW()),
(9, 'Dermatoscopia', 'Examen detallado de lesiones de piel con dermatoscopio', 'DERM-002', 20, 90000.00, 'Dermatología', 0, NULL, 1, 1, NOW(), NOW()),
(10, 'Biopsia de piel', 'Toma de muestra de tejido para análisis histopatológico', 'DERM-003', 30, 180000.00, 'Dermatología', 1, 'Suspender anticoagulantes 5 días antes', 1, 1, NOW(), NOW());

-- Servicios Centro Médico La Esperanza
INSERT INTO `medical_services` (
  `id`, `name`, `description`, `code`, `duration_minutes`, `base_price`, `category`, 
  `requires_preparation`, `preparation_instructions`, `organization_id`, `is_active`, 
  `created_at`, `updated_at`
) VALUES 
-- Neurología
(11, 'Consulta Neurología General', 'Evaluación de trastornos del sistema nervioso', 'NEURO-001', 50, 160000.00, 'Neurología', 0, NULL, 2, 1, NOW(), NOW()),
(12, 'Electroencefalograma', 'Registro de la actividad eléctrica del cerebro', 'NEURO-002', 60, 200000.00, 'Neurología', 1, 'Lavar cabello la noche anterior, no usar geles', 2, 1, NOW(), NOW()),
(13, 'Electromiografía', 'Estudio de la función muscular y nerviosa', 'NEURO-003', 45, 220000.00, 'Neurología', 0, NULL, 2, 1, NOW(), NOW()),

-- Ginecología
(14, 'Consulta Ginecología General', 'Consulta especializada en salud femenina', 'GINE-001', 40, 130000.00, 'Ginecología', 0, NULL, 2, 1, NOW(), NOW()),
(15, 'Citología Cervical', 'Examen preventivo para detección de cáncer cervical', 'GINE-002', 25, 85000.00, 'Ginecología', 1, 'No relaciones sexuales 48h antes, no duchas vaginales', 2, 1, NOW(), NOW()),
(16, 'Ecografía Pélvica', 'Ultrasonido para evaluación de órganos pélvicos', 'GINE-003', 35, 150000.00, 'Ginecología', 1, 'Vejiga llena - tomar 1 litro de agua 1 hora antes', 2, 1, NOW(), NOW()),

-- Servicios generales
(17, 'Medicina General', 'Consulta médica general', 'MED-001', 30, 80000.00, 'Medicina General', 0, NULL, 1, 1, NOW(), NOW()),
(18, 'Medicina General', 'Consulta médica general', 'MED-002', 30, 85000.00, 'Medicina General', 0, NULL, 2, 1, NOW(), NOW());

-- =============================================================================
-- 8. ASIGNAR SERVICIOS A MÉDICOS
-- =============================================================================
INSERT INTO `doctor_services` (
  `doctor_id`, `service_id`, `custom_price`, `is_available`, `created_at`, `updated_at`
) VALUES 
-- Dr. Juan Pérez (Cardiología) - Clínica San Rafael
(1, 1, NULL, 1, NOW(), NOW()),           -- Consulta Cardiología
(1, 2, NULL, 1, NOW(), NOW()),           -- Electrocardiograma  
(1, 3, 180000.00, 1, NOW(), NOW()),      -- Ecocardiograma (precio personalizado)
(1, 4, NULL, 1, NOW(), NOW()),           -- Holter 24h
(1, 17, 90000.00, 1, NOW(), NOW()),      -- Medicina General (precio personalizado)

-- Dra. Ana López (Pediatría) - Clínica San Rafael
(2, 5, NULL, 1, NOW(), NOW()),           -- Consulta Pediatría
(2, 6, NULL, 1, NOW(), NOW()),           -- Control Crecimiento
(2, 7, NULL, 1, NOW(), NOW()),           -- Vacunación
(2, 17, NULL, 1, NOW(), NOW()),          -- Medicina General

-- Dr. Miguel Torres (Dermatología) - Clínica San Rafael
(3, 8, NULL, 1, NOW(), NOW()),           -- Consulta Dermatología
(3, 9, NULL, 1, NOW(), NOW()),           -- Dermatoscopia
(3, 10, 200000.00, 1, NOW(), NOW()),     -- Biopsia (precio personalizado)
(3, 17, NULL, 1, NOW(), NOW()),          -- Medicina General

-- Dr. Roberto Silva (Neurología) - Centro La Esperanza
(4, 11, NULL, 1, NOW(), NOW()),          -- Consulta Neurología
(4, 12, NULL, 1, NOW(), NOW()),          -- Electroencefalograma
(4, 13, 250000.00, 1, NOW(), NOW()),     -- Electromiografía (precio personalizado)
(4, 18, NULL, 1, NOW(), NOW()),          -- Medicina General

-- Dra. Patricia Vargas (Ginecología) - Centro La Esperanza
(5, 14, NULL, 1, NOW(), NOW()),          -- Consulta Ginecología
(5, 15, NULL, 1, NOW(), NOW()),          -- Citología
(5, 16, NULL, 1, NOW(), NOW()),          -- Ecografía Pélvica
(5, 18, NULL, 1, NOW(), NOW());          -- Medicina General

-- =============================================================================
-- 9. INSERTAR PACIENTES
-- =============================================================================
INSERT INTO `patients` (
  `id`, `patient_code`, `user_id`, `first_name`, `last_name`, `identification_type`, 
  `identification_number`, `birth_date`, `gender`, `phone`, `email`, `address`, 
  `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`, 
  `medical_history`, `allergies`, `current_medications`, `blood_type`, 
  `organization_id`, `is_active`, `created_at`, `updated_at`
) VALUES 
-- Pacientes Clínica San Rafael
(1, 'CSR-PAT-001', NULL, 'María', 'García Rodríguez', 'CC', '52123456', '1985-03-15', 'F', '+57-300-1111111', 'maria.garcia@email.com', 'Calle 85 #12-34, Bogotá', 'Pedro García', '+57-300-2222222', 'Esposo', 'Hipertensión arterial desde 2020', 'Penicilina', 'Losartán 50mg 1 vez al día', 'O+', 1, 1, NOW(), NOW()),

(2, 'CSR-PAT-002', NULL, 'Carlos', 'Mendoza López', 'CC', '80987654', '1975-07-22', 'M', '+57-310-3333333', 'carlos.mendoza@email.com', 'Carrera 15 #45-67, Bogotá', 'Ana Mendoza', '+57-310-4444444', 'Esposa', 'Diabetes tipo 2, dislipidemia', 'Ninguna conocida', 'Metformina 500mg 2 veces al día, Atorvastatina 20mg nocturna', 'A+', 1, 1, NOW(), NOW()),

(3, 'CSR-PAT-003', NULL, 'Ana', 'Torres Jiménez', 'CC', '41234567', '1990-12-10', 'F', '+57-320-5555555', 'ana.torres@email.com', 'Avenida 68 #78-90, Bogotá', 'Luis Torres', '+57-320-6666666', 'Hermano', 'Asma desde la infancia', 'Ácaros del polvo', 'Salbutamol inhalador SOS', 'B+', 1, 1, NOW(), NOW()),

(4, 'CSR-PAT-004', NULL, 'Luis', 'Hernández Castro', 'CC', '79876543', '1982-05-18', 'M', '+57-330-7777777', 'luis.hernandez@email.com', 'Calle 100 #20-15, Bogotá', 'María Hernández', '+57-330-8888888', 'Madre', 'Ninguna', 'Ninguna conocida', 'Ninguna', 'AB+', 1, 1, NOW(), NOW()),

(5, 'CSR-PAT-005', NULL, 'Isabella', 'Ruiz Vega', 'TI', '1098765432', '2010-09-03', 'F', '+57-340-9999999', 'familia.ruiz@email.com', 'Carrera 30 #55-28, Bogotá', 'Patricia Vega', '+57-340-0000000', 'Madre', 'Prematura 35 semanas, desarrollo normal', 'Ninguna conocida', 'Ninguna', 'O-', 1, 1, NOW(), NOW()),

(6, 'CSR-PAT-006', NULL, 'Roberto', 'Silva Morales', 'CC', '12345678', '1995-11-25', 'M', '+57-350-1234567', 'roberto.silva@email.com', 'Calle 45 #67-89, Bogotá', 'Carmen Morales', '+57-350-2345678', 'Madre', 'Dermatitis atópica', 'Polen, pelo de gato', 'Crema hidratante diaria', 'A-', 1, 1, NOW(), NOW()),

-- Pacientes Centro Médico La Esperanza
(7, 'CME-PAT-001', NULL, 'Patricia', 'Vargas González', 'CC', '43210987', '1988-02-14', 'F', '+57-311-3456789', 'patricia.vargas@email.com', 'Carrera 70 #45-12, Medellín', 'Jorge Vargas', '+57-311-4567890', 'Esposo', 'Migraña crónica', 'AINEs', 'Sumatriptán 50mg SOS', 'B-', 2, 1, NOW(), NOW()),

(8, 'CME-PAT-002', NULL, 'Andrea', 'López Martínez', 'CC', '65432109', '1992-08-07', 'F', '+57-312-5678901', 'andrea.lopez@email.com', 'Avenida 80 #23-45, Medellín', 'Carlos López', '+57-312-6789012', 'Padre', 'Endometriosis', 'Látex', 'Anticonceptivos orales', 'O+', 2, 1, NOW(), NOW()),

(9, 'CME-PAT-003', NULL, 'Miguel', 'Ramírez Soto', 'CC', '87654321', '1970-04-30', 'M', '+57-313-7890123', 'miguel.ramirez@email.com', 'Calle 52 #34-56, Medellín', 'Elena Soto', '+57-313-8901234', 'Esposa', 'Epilepsia focal', 'Ninguna conocida', 'Carbamazepina 200mg 2 veces al día', 'AB-', 2, 1, NOW(), NOW()),

(10, 'CME-PAT-004', NULL, 'Sofía', 'Herrera Díaz', 'CC', '23456789', '1993-06-12', 'F', '+57-314-9012345', 'sofia.herrera@email.com', 'Carrera 65 #78-90, Medellín', 'Ana Díaz', '+57-314-0123456', 'Madre', 'Ninguna', 'Mariscos', 'Ninguna', 'A+', 2, 1, NOW(), NOW());

-- =============================================================================
-- 10. INSERTAR CITAS MÉDICAS - EXTENSA COBERTURA PARA TESTING
-- =============================================================================
INSERT INTO `appointments` (
  `id`, `doctor_id`, `patient_id`, `service_id`, `time`, `date`, `status`, 
  `notes`, `cancel_reason`, `reminder_sent`, `patient_name`, `service`, 
  `created_at`, `updated_at`
) VALUES 
-- =============================================================================
-- CITAS PASADAS - SEMANA ANTERIOR (COMPLETADAS Y ALGUNAS CANCELADAS)
-- =============================================================================

-- Dr. Juan Pérez (Cardiología) - Clínica San Rafael
(1, 1, 1, 1, '09:00', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'Completada', 'Paciente estable, continuar tratamiento', NULL, 1, 'María García Rodríguez', 'Consulta Cardiología General', NOW(), NOW()),
(2, 1, 2, 2, '10:00', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Completada', 'ECG normal, sin alteraciones', NULL, 1, 'Carlos Mendoza López', 'Electrocardiograma', NOW(), NOW()),
(3, 1, 3, 3, '11:30', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Cancelada', NULL, 'Paciente solicitó reprogramar', 1, 'Ana Torres Jiménez', 'Ecocardiograma', NOW(), NOW()),
(4, 1, 4, 1, '14:00', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Completada', 'Primera consulta, solicitar exámenes', NULL, 1, 'Luis Hernández Castro', 'Consulta Cardiología General', NOW(), NOW()),

-- Dra. Ana López (Pediatría) - Clínica San Rafael  
(5, 2, 5, 5, '08:30', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'Completada', 'Control de rutina, crecimiento adecuado', NULL, 1, 'Isabella Ruiz Vega', 'Consulta Pediatría General', NOW(), NOW()),
(6, 2, 5, 7, '09:00', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Completada', 'Vacunas al día, próxima dosis en 6 meses', NULL, 1, 'Isabella Ruiz Vega', 'Vacunación', NOW(), NOW()),
(7, 2, 5, 6, '10:30', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Completada', 'Desarrollo psicomotor normal', NULL, 1, 'Isabella Ruiz Vega', 'Control de Crecimiento y Desarrollo', NOW(), NOW()),

-- Dr. Miguel Torres (Dermatología) - Clínica San Rafael
(8, 3, 6, 8, '15:00', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Completada', 'Mejoría de la dermatitis, continuar tratamiento', NULL, 1, 'Roberto Silva Morales', 'Consulta Dermatología General', NOW(), NOW()),
(9, 3, 1, 9, '16:00', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Completada', 'Lunares benignos, control anual', NULL, 1, 'María García Rodríguez', 'Dermatoscopia', NOW(), NOW()),

-- Dr. Roberto Silva (Neurología) - Centro La Esperanza
(10, 4, 7, 11, '09:00', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Completada', 'Ajuste de medicación antimigrañosa', NULL, 1, 'Patricia Vargas González', 'Consulta Neurología General', NOW(), NOW()),
(11, 4, 9, 12, '10:30', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Completada', 'EEG normal, reducir medicación gradualmente', NULL, 1, 'Miguel Ramírez Soto', 'Electroencefalograma', NOW(), NOW()),

-- Dra. Patricia Vargas (Ginecología) - Centro La Esperanza
(12, 5, 8, 14, '11:00', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'Completada', 'Control post-cirugía, evolución favorable', NULL, 1, 'Andrea López Martínez', 'Consulta Ginecología General', NOW(), NOW()),
(13, 5, 10, 15, '12:00', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Completada', 'Citología normal, control en 3 años', NULL, 1, 'Sofía Herrera Díaz', 'Citología Cervical', NOW(), NOW()),

-- =============================================================================
-- CITAS DE HOY - AGENDA ACTUAL
-- =============================================================================

-- Dr. Juan Pérez (Cardiología) - CITAS DE HOY
(14, 1, 2, 2, '08:30', CURDATE(), 'Llegó', 'Paciente en sala de espera', NULL, 1, 'Carlos Mendoza López', 'Electrocardiograma', NOW(), NOW()),
(15, 1, 1, 4, '10:00', CURDATE(), 'Confirmada', NULL, NULL, 1, 'María García Rodríguez', 'Holter 24 horas', NOW(), NOW()),
(16, 1, 3, 3, '11:30', CURDATE(), 'Pendiente', NULL, NULL, 0, 'Ana Torres Jiménez', 'Ecocardiograma', NOW(), NOW()),

-- Dra. Ana López (Pediatría) - CITAS DE HOY
(17, 2, 5, 7, '09:00', CURDATE(), 'Completada', 'Vacuna aplicada correctamente', NULL, 1, 'Isabella Ruiz Vega', 'Vacunación', NOW(), NOW()),
(18, 2, 4, 5, '15:30', CURDATE(), 'Confirmada', NULL, NULL, 1, 'Luis Hernández Castro', 'Consulta Pediatría General', NOW(), NOW()),

-- Dr. Miguel Torres (Dermatología) - CITAS DE HOY
(19, 3, 6, 10, '14:00', CURDATE(), 'Confirmada', NULL, NULL, 1, 'Roberto Silva Morales', 'Biopsia de piel', NOW(), NOW()),

-- Dr. Roberto Silva (Neurología) - CITAS DE HOY
(20, 4, 7, 11, '16:00', CURDATE(), 'Pendiente', NULL, NULL, 0, 'Patricia Vargas González', 'Consulta Neurología General', NOW(), NOW()),

-- Dra. Patricia Vargas (Ginecología) - CITAS DE HOY
(21, 5, 8, 16, '09:30', CURDATE(), 'Llegó', 'En preparación para ecografía', NULL, 1, 'Andrea López Martínez', 'Ecografía Pélvica', NOW(), NOW()),

-- =============================================================================
-- CITAS FUTURAS - PRÓXIMA SEMANA
-- =============================================================================

-- MAÑANA - Día +1
(22, 1, 4, 1, '08:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Confirmada', NULL, NULL, 0, 'Luis Hernández Castro', 'Consulta Cardiología General', NOW(), NOW()),
(23, 1, 2, 3, '09:30', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Confirmada', NULL, NULL, 0, 'Carlos Mendoza López', 'Ecocardiograma', NOW(), NOW()),
(24, 2, 5, 6, '10:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Confirmada', NULL, NULL, 0, 'Isabella Ruiz Vega', 'Control de Crecimiento y Desarrollo', NOW(), NOW()),
(25, 3, 1, 8, '15:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Pendiente', NULL, NULL, 0, 'María García Rodríguez', 'Consulta Dermatología General', NOW(), NOW()),
(26, 4, 9, 13, '11:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Confirmada', NULL, NULL, 0, 'Miguel Ramírez Soto', 'Electromiografía', NOW(), NOW()),

-- PASADO MAÑANA - Día +2
(27, 1, 3, 2, '08:30', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Confirmada', NULL, NULL, 0, 'Ana Torres Jiménez', 'Electrocardiograma', NOW(), NOW()),
(28, 2, 4, 17, '09:00', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Pendiente', NULL, NULL, 0, 'Luis Hernández Castro', 'Medicina General', NOW(), NOW()),
(29, 3, 6, 9, '14:30', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Confirmada', NULL, NULL, 0, 'Roberto Silva Morales', 'Dermatoscopia', NOW(), NOW()),
(30, 5, 10, 14, '10:30', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Confirmada', NULL, NULL, 0, 'Sofía Herrera Díaz', 'Consulta Ginecología General', NOW(), NOW()),

-- Día +3
(31, 1, 1, 1, '09:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Pendiente', NULL, NULL, 0, 'María García Rodríguez', 'Consulta Cardiología General', NOW(), NOW()),
(32, 2, 5, 5, '11:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Confirmada', NULL, NULL, 0, 'Isabella Ruiz Vega', 'Consulta Pediatría General', NOW(), NOW()),
(33, 4, 7, 12, '08:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Confirmada', NULL, NULL, 0, 'Patricia Vargas González', 'Electroencefalograma', NOW(), NOW()),
(34, 5, 8, 15, '12:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Pendiente', NULL, NULL, 0, 'Andrea López Martínez', 'Citología Cervical', NOW(), NOW()),

-- Día +4
(35, 1, 2, 4, '10:00', DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'Confirmada', NULL, NULL, 0, 'Carlos Mendoza López', 'Holter 24 horas', NOW(), NOW()),
(36, 3, 1, 10, '15:30', DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'Pendiente', NULL, NULL, 0, 'María García Rodríguez', 'Biopsia de piel', NOW(), NOW()),
(37, 4, 9, 11, '09:30', DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'Confirmada', NULL, NULL, 0, 'Miguel Ramírez Soto', 'Consulta Neurología General', NOW(), NOW()),

-- Día +5 (Viernes)
(38, 1, 3, 1, '08:00', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Confirmada', NULL, NULL, 0, 'Ana Torres Jiménez', 'Consulta Cardiología General', NOW(), NOW()),
(39, 2, 4, 6, '10:30', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Pendiente', NULL, NULL, 0, 'Luis Hernández Castro', 'Control de Crecimiento y Desarrollo', NOW(), NOW()),
(40, 5, 10, 16, '14:00', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Confirmada', NULL, NULL, 0, 'Sofía Herrera Díaz', 'Ecografía Pélvica', NOW(), NOW()),

-- =============================================================================
-- CITAS CANCELADAS - MIX DE FECHAS
-- =============================================================================
(41, 1, 1, 2, '11:00', DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'Cancelada', NULL, 'Paciente enfermo, reprogramar', 0, 'María García Rodríguez', 'Electrocardiograma', NOW(), NOW()),
(42, 3, 6, 8, '16:00', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Cancelada', NULL, 'Cambio de horario solicitado', 0, 'Roberto Silva Morales', 'Consulta Dermatología General', NOW(), NOW()),
(43, 4, 7, 13, '13:00', DATE_ADD(CURDATE(), INTERVAL 8 DAY), 'Cancelada', NULL, 'Paciente viajó', 1, 'Patricia Vargas González', 'Electromiografía', NOW(), NOW()),

-- =============================================================================
-- CITAS FUTURAS SEMANA SIGUIENTE (Día +7 a +14)
-- =============================================================================

-- Lunes siguiente (+7)
(44, 1, 4, 3, '08:30', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Pendiente', NULL, NULL, 0, 'Luis Hernández Castro', 'Ecocardiograma', NOW(), NOW()),
(45, 2, 5, 7, '09:00', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Confirmada', NULL, NULL, 0, 'Isabella Ruiz Vega', 'Vacunación', NOW(), NOW()),
(46, 3, 6, 9, '15:00', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Pendiente', NULL, NULL, 0, 'Roberto Silva Morales', 'Dermatoscopia', NOW(), NOW()),

-- Martes (+8)
(47, 4, 9, 12, '10:00', DATE_ADD(CURDATE(), INTERVAL 8 DAY), 'Confirmada', NULL, NULL, 0, 'Miguel Ramírez Soto', 'Electroencefalograma', NOW(), NOW()),
(48, 5, 8, 14, '11:30', DATE_ADD(CURDATE(), INTERVAL 8 DAY), 'Pendiente', NULL, NULL, 0, 'Andrea López Martínez', 'Consulta Ginecología General', NOW(), NOW()),

-- Miércoles (+9)  
(49, 1, 1, 4, '09:00', DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Confirmada', NULL, NULL, 0, 'María García Rodríguez', 'Holter 24 horas', NOW(), NOW()),
(50, 2, 4, 5, '14:00', DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Pendiente', NULL, NULL, 0, 'Luis Hernández Castro', 'Consulta Pediatría General', NOW(), NOW()),

-- Jueves (+10)
(51, 3, 1, 8, '16:00', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'Confirmada', NULL, NULL, 0, 'María García Rodríguez', 'Consulta Dermatología General', NOW(), NOW()),
(52, 4, 7, 11, '08:00', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'Pendiente', NULL, NULL, 0, 'Patricia Vargas González', 'Consulta Neurología General', NOW(), NOW()),

-- Viernes (+11)
(53, 5, 10, 15, '10:00', DATE_ADD(CURDATE(), INTERVAL 11 DAY), 'Confirmada', NULL, NULL, 0, 'Sofía Herrera Díaz', 'Citología Cervical', NOW(), NOW()),
(54, 1, 2, 1, '11:30', DATE_ADD(CURDATE(), INTERVAL 11 DAY), 'Pendiente', NULL, NULL, 0, 'Carlos Mendoza López', 'Consulta Cardiología General', NOW(), NOW()),

-- =============================================================================
-- CITAS ADICIONALES PARA LLENAR AGENDA (Día +12 a +20)
-- =============================================================================

-- Lunes siguiente (+14)
(55, 1, 3, 2, '08:00', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Pendiente', NULL, NULL, 0, 'Ana Torres Jiménez', 'Electrocardiograma', NOW(), NOW()),
(56, 2, 5, 6, '09:30', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Confirmada', NULL, NULL, 0, 'Isabella Ruiz Vega', 'Control de Crecimiento y Desarrollo', NOW(), NOW()),
(57, 3, 6, 10, '15:00', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Pendiente', NULL, NULL, 0, 'Roberto Silva Morales', 'Biopsia de piel', NOW(), NOW()),

-- Martes (+15)
(58, 4, 9, 13, '11:00', DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'Confirmada', NULL, NULL, 0, 'Miguel Ramírez Soto', 'Electromiografía', NOW(), NOW()),
(59, 5, 8, 16, '13:00', DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'Pendiente', NULL, NULL, 0, 'Andrea López Martínez', 'Ecografía Pélvica', NOW(), NOW()),

-- Miércoles (+16)
(60, 1, 4, 3, '10:00', DATE_ADD(CURDATE(), INTERVAL 16 DAY), 'Confirmada', NULL, NULL, 0, 'Luis Hernández Castro', 'Ecocardiograma', NOW(), NOW()),
(61, 2, 5, 17, '14:30', DATE_ADD(CURDATE(), INTERVAL 16 DAY), 'Pendiente', NULL, NULL, 0, 'Isabella Ruiz Vega', 'Medicina General', NOW(), NOW()),

-- Jueves (+17)
(62, 3, 1, 9, '16:30', DATE_ADD(CURDATE(), INTERVAL 17 DAY), 'Confirmada', NULL, NULL, 0, 'María García Rodríguez', 'Dermatoscopia', NOW(), NOW()),
(63, 4, 7, 12, '09:00', DATE_ADD(CURDATE(), INTERVAL 17 DAY), 'Pendiente', NULL, NULL, 0, 'Patricia Vargas González', 'Electroencefalograma', NOW(), NOW()),

-- Viernes (+18)
(64, 5, 10, 14, '11:00', DATE_ADD(CURDATE(), INTERVAL 18 DAY), 'Confirmada', NULL, NULL, 0, 'Sofía Herrera Díaz', 'Consulta Ginecología General', NOW(), NOW()),
(65, 1, 2, 4, '12:00', DATE_ADD(CURDATE(), INTERVAL 18 DAY), 'Pendiente', NULL, NULL, 0, 'Carlos Mendoza López', 'Holter 24 horas', NOW(), NOW());

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 11. VERIFICACIÓN DE DATOS INSERTADOS
-- =============================================================================
SELECT 'VERIFICACIÓN DE DATOS INSERTADOS' as 'REPORTE';

SELECT 
  'Organizaciones' as 'Tabla',
  COUNT(*) as 'Registros'
FROM organization
UNION ALL
SELECT 
  'Usuarios' as 'Tabla',
  COUNT(*) as 'Registros'
FROM users
UNION ALL
SELECT 
  'Médicos' as 'Tabla',
  COUNT(*) as 'Registros'
FROM doctors
UNION ALL
SELECT 
  'Asistentes' as 'Tabla',
  COUNT(*) as 'Registros'
FROM assistants
UNION ALL
SELECT 
  'Pacientes' as 'Tabla',
  COUNT(*) as 'Registros'
FROM patients
UNION ALL
SELECT 
  'Servicios Médicos' as 'Tabla',
  COUNT(*) as 'Registros'
FROM medical_services
UNION ALL
SELECT 
  'Relaciones Doctor-Servicio' as 'Tabla',
  COUNT(*) as 'Registros'
FROM doctor_services
UNION ALL
SELECT 
  'Citas Médicas' as 'Tabla',
  COUNT(*) as 'Registros'
FROM appointments;

-- =============================================================================
-- 12. DATOS DE USUARIOS PARA TESTING EN LA APP
-- =============================================================================
SELECT '=== CREDENCIALES PARA TESTING ===' as 'INFORMACIÓN';

SELECT 
  'ADMINISTRADORES' as 'TIPO',
  u.email as 'Email',
  u.firebase_uid as 'Firebase UID',
  o.name as 'Organización',
  u.role as 'Rol'
FROM users u 
JOIN organization o ON u.organization_id = o.id
WHERE u.role = 'admin'

UNION ALL

SELECT 
  'MÉDICOS' as 'TIPO',
  u.email as 'Email',
  u.firebase_uid as 'Firebase UID',
  o.name as 'Organización',
  CONCAT(u.role, ' - ', d.speciality) as 'Rol'
FROM users u 
JOIN organization o ON u.organization_id = o.id
JOIN doctors d ON u.id = d.user_id
WHERE u.role = 'medico'

UNION ALL

SELECT 
  'ASISTENTES' as 'TIPO',
  u.email as 'Email',
  u.firebase_uid as 'Firebase UID',
  o.name as 'Organización',
  u.role as 'Rol'
FROM users u 
JOIN organization o ON u.organization_id = o.id
WHERE u.role = 'asistente';

-- =============================================================================
-- SCRIPT COMPLETADO EXITOSAMENTE
-- =============================================================================
-- Los datos han sido insertados correctamente.
-- Ahora puedes probar la aplicación Next.js con estos datos realistas.
-- 
-- Para usar en desarrollo:
-- 1. Los usuarios con Firebase UIDs pueden ser simulados en desarrollo
-- 2. Cada organización tiene múltiples roles para testing completo
-- 3. Las citas incluyen diferentes estados y fechas para testing
-- 4. Los servicios incluyen precios personalizados y preparaciones
-- =============================================================================