"use strict";
exports.__esModule = true;
exports.validateUpdateMedicalRecord = exports.validateCreateMedicalRecord = exports.validateMedicalRecord = exports.validateUpdateAppointment = exports.validateCreateAppointment = exports.validateAppointment = exports.validateUpdateCompany = exports.validateCreateCompany = exports.validateCompany = exports.validateUpdatePatientProfile = exports.validateCreatePatientProfile = exports.validatePatientProfile = exports.validateUpdateDoctorProfile = exports.validateCreateDoctorProfile = exports.validateDoctorProfile = exports.validateUpdateUser = exports.validateCreateUser = exports.validateUser = exports.ApiResponseSchema = exports.UpdateMedicalRecordSchema = exports.CreateMedicalRecordSchema = exports.MedicalRecordSchema = exports.UpdateAppointmentSchema = exports.CreateAppointmentSchema = exports.AppointmentSchema = exports.AppointmentTypeSchema = exports.AppointmentStatusSchema = exports.UpdateCompanySchema = exports.CreateCompanySchema = exports.CompanySchema = exports.UpdatePatientProfileSchema = exports.CreatePatientProfileSchema = exports.PatientProfileSchema = exports.BloodTypeSchema = exports.UpdateDoctorProfileSchema = exports.CreateDoctorProfileSchema = exports.DoctorProfileSchema = exports.SpecialtySchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.UserSchema = exports.UserRoleSchema = void 0;
var zod_1 = require("zod");
// ==================== USER SCHEMAS ====================
exports.UserRoleSchema = zod_1.z["enum"](['admin', 'doctor', 'patient', 'staff']);
exports.UserSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1, 'UID es requerido'),
    email: zod_1.z.string().email('Email inválido'),
    firstName: zod_1.z.string().min(1, 'Nombre es requerido'),
    lastName: zod_1.z.string().min(1, 'Apellido es requerido'),
    phone: zod_1.z.string().optional(),
    avatar: zod_1.z.string().url().optional(),
    role: exports.UserRoleSchema,
    isActive: zod_1.z.boolean()["default"](true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    lastLoginAt: zod_1.z.date().optional(),
    profileComplete: zod_1.z.boolean()["default"](false)
});
exports.CreateUserSchema = exports.UserSchema.omit({
    uid: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true
});
exports.UpdateUserSchema = exports.CreateUserSchema.partial();
// ==================== DOCTOR SCHEMAS ====================
exports.SpecialtySchema = zod_1.z["enum"]([
    'cardiology',
    'dermatology',
    'endocrinology',
    'gastroenterology',
    'general_practice',
    'gynecology',
    'neurology',
    'oncology',
    'ophthalmology',
    'orthopedics',
    'pediatrics',
    'psychiatry',
    'pulmonology',
    'radiology',
    'surgery',
    'urology',
]);
exports.DoctorProfileSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1, 'UID es requerido'),
    licenseNumber: zod_1.z.string().min(1, 'Número de licencia es requerido'),
    specialties: zod_1.z.array(exports.SpecialtySchema).min(1, 'Al menos una especialidad es requerida'),
    education: zod_1.z.array(zod_1.z.object({
        institution: zod_1.z.string().min(1, 'Institución es requerida'),
        degree: zod_1.z.string().min(1, 'Título es requerido'),
        year: zod_1.z.number().int().min(1950).max(new Date().getFullYear())
    })).optional(),
    experience: zod_1.z.number().int().min(0).optional(),
    bio: zod_1.z.string().optional(),
    consultationFee: zod_1.z.number().min(0).optional(),
    availability: zod_1.z.object({
        monday: zod_1.z.array(zod_1.z.string()).optional(),
        tuesday: zod_1.z.array(zod_1.z.string()).optional(),
        wednesday: zod_1.z.array(zod_1.z.string()).optional(),
        thursday: zod_1.z.array(zod_1.z.string()).optional(),
        friday: zod_1.z.array(zod_1.z.string()).optional(),
        saturday: zod_1.z.array(zod_1.z.string()).optional(),
        sunday: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    companyId: zod_1.z.string().optional(),
    isVerified: zod_1.z.boolean()["default"](false),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreateDoctorProfileSchema = exports.DoctorProfileSchema.omit({
    uid: true,
    createdAt: true,
    updatedAt: true
});
exports.UpdateDoctorProfileSchema = exports.CreateDoctorProfileSchema.partial();
// ==================== PATIENT SCHEMAS ====================
exports.BloodTypeSchema = zod_1.z["enum"](['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
exports.PatientProfileSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1, 'UID es requerido'),
    dateOfBirth: zod_1.z.date(),
    gender: zod_1.z["enum"](['male', 'female', 'other']),
    bloodType: exports.BloodTypeSchema.optional(),
    height: zod_1.z.number().min(0).optional(),
    weight: zod_1.z.number().min(0).optional(),
    allergies: zod_1.z.array(zod_1.z.string()).optional(),
    chronicConditions: zod_1.z.array(zod_1.z.string()).optional(),
    medications: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nombre del medicamento es requerido'),
        dosage: zod_1.z.string().min(1, 'Dosis es requerida'),
        frequency: zod_1.z.string().min(1, 'Frecuencia es requerida'),
        startDate: zod_1.z.date(),
        endDate: zod_1.z.date().optional()
    })).optional(),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nombre del contacto es requerido'),
        relationship: zod_1.z.string().min(1, 'Relación es requerida'),
        phone: zod_1.z.string().min(1, 'Teléfono es requerido')
    }).optional(),
    insuranceInfo: zod_1.z.object({
        provider: zod_1.z.string().min(1, 'Proveedor es requerido'),
        policyNumber: zod_1.z.string().min(1, 'Número de póliza es requerido'),
        groupNumber: zod_1.z.string().optional()
    }).optional(),
    companyId: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreatePatientProfileSchema = exports.PatientProfileSchema.omit({
    uid: true,
    createdAt: true,
    updatedAt: true
});
exports.UpdatePatientProfileSchema = exports.CreatePatientProfileSchema.partial();
// ==================== COMPANY SCHEMAS ====================
exports.CompanySchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'ID es requerido'),
    name: zod_1.z.string().min(1, 'Nombre de la empresa es requerido'),
    taxId: zod_1.z.string().min(1, 'NIT/RUT es requerido'),
    address: zod_1.z.object({
        street: zod_1.z.string().min(1, 'Dirección es requerida'),
        city: zod_1.z.string().min(1, 'Ciudad es requerida'),
        state: zod_1.z.string().min(1, 'Estado/Provincia es requerido'),
        zipCode: zod_1.z.string().min(1, 'Código postal es requerido'),
        country: zod_1.z.string().min(1, 'País es requerido')
    }),
    phone: zod_1.z.string().min(1, 'Teléfono es requerido'),
    email: zod_1.z.string().email('Email inválido'),
    website: zod_1.z.string().url().optional(),
    logo: zod_1.z.string().url().optional(),
    specialties: zod_1.z.array(exports.SpecialtySchema).optional(),
    subscription: zod_1.z.object({
        plan: zod_1.z["enum"](['basic', 'premium', 'enterprise']),
        status: zod_1.z["enum"](['active', 'inactive', 'suspended']),
        startDate: zod_1.z.date(),
        endDate: zod_1.z.date().optional(),
        maxUsers: zod_1.z.number().int().min(1),
        maxPatients: zod_1.z.number().int().min(1)
    }),
    settings: zod_1.z.object({
        timeZone: zod_1.z.string()["default"]('America/Bogota'),
        language: zod_1.z.string()["default"]('es'),
        appointmentDuration: zod_1.z.number().int().min(15).max(240)["default"](30),
        workingHours: zod_1.z.object({
            start: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
            end: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido')
        })["default"]({ start: '08:00', end: '18:00' }),
        workingDays: zod_1.z.array(zod_1.z["enum"](['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))["default"](['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    }).optional(),
    isActive: zod_1.z.boolean()["default"](true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreateCompanySchema = exports.CompanySchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.UpdateCompanySchema = exports.CreateCompanySchema.partial();
// ==================== APPOINTMENT SCHEMAS ====================
exports.AppointmentStatusSchema = zod_1.z["enum"]([
    'scheduled',
    'confirmed',
    'in-progress',
    'completed',
    'cancelled',
    'no-show'
]);
exports.AppointmentTypeSchema = zod_1.z["enum"]([
    'consultation',
    'follow-up',
    'procedure',
    'emergency',
    'telemedicine'
]);
exports.AppointmentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'ID es requerido').optional(),
    doctorId: zod_1.z.string().min(1, 'ID del doctor es requerido'),
    patientId: zod_1.z.string().min(1, 'ID del paciente es requerido'),
    companyId: zod_1.z.string().optional(),
    type: exports.AppointmentTypeSchema,
    status: exports.AppointmentStatusSchema["default"]('scheduled'),
    scheduledAt: zod_1.z.date(),
    duration: zod_1.z.number().int().min(15).max(240)["default"](30),
    title: zod_1.z.string().min(1, 'Título es requerido'),
    description: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    location: zod_1.z.object({
        type: zod_1.z["enum"](['in-person', 'telemedicine']),
        address: zod_1.z.string().optional(),
        room: zod_1.z.string().optional(),
        meetingUrl: zod_1.z.string().url().optional()
    }).optional(),
    fee: zod_1.z.number().min(0).optional(),
    paid: zod_1.z.boolean()["default"](false),
    reminderSent: zod_1.z.boolean()["default"](false),
    createdBy: zod_1.z.string().min(1, 'Creado por es requerido'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreateAppointmentSchema = exports.AppointmentSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true
});
exports.UpdateAppointmentSchema = exports.CreateAppointmentSchema.partial();
// ==================== MEDICAL RECORD SCHEMAS ====================
exports.MedicalRecordSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'ID es requerido').optional(),
    patientId: zod_1.z.string().min(1, 'ID del paciente es requerido'),
    doctorId: zod_1.z.string().min(1, 'ID del doctor es requerido'),
    appointmentId: zod_1.z.string().optional(),
    companyId: zod_1.z.string().optional(),
    date: zod_1.z.date(),
    type: zod_1.z["enum"](['consultation', 'diagnosis', 'prescription', 'lab-result', 'procedure']),
    chiefComplaint: zod_1.z.string().optional(),
    symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    diagnosis: zod_1.z.array(zod_1.z.object({
        code: zod_1.z.string().optional(),
        description: zod_1.z.string().min(1, 'Descripción del diagnóstico es requerida'),
        type: zod_1.z["enum"](['primary', 'secondary', 'differential'])
    })).optional(),
    treatment: zod_1.z.object({
        medications: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1, 'Nombre del medicamento es requerido'),
            dosage: zod_1.z.string().min(1, 'Dosis es requerida'),
            frequency: zod_1.z.string().min(1, 'Frecuencia es requerida'),
            duration: zod_1.z.string().min(1, 'Duración es requerida'),
            instructions: zod_1.z.string().optional()
        })).optional(),
        procedures: zod_1.z.array(zod_1.z.string()).optional(),
        recommendations: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    vitalSigns: zod_1.z.object({
        bloodPressure: zod_1.z.object({
            systolic: zod_1.z.number().int().min(60).max(300),
            diastolic: zod_1.z.number().int().min(30).max(200)
        }).optional(),
        heartRate: zod_1.z.number().int().min(30).max(300).optional(),
        temperature: zod_1.z.number().min(30).max(50).optional(),
        respiratoryRate: zod_1.z.number().int().min(5).max(60).optional(),
        oxygenSaturation: zod_1.z.number().min(70).max(100).optional(),
        weight: zod_1.z.number().min(0).optional(),
        height: zod_1.z.number().min(0).optional()
    }).optional(),
    attachments: zod_1.z.array(zod_1.z.object({
        type: zod_1.z["enum"](['image', 'pdf', 'document']),
        url: zod_1.z.string().url(),
        name: zod_1.z.string().min(1, 'Nombre del archivo es requerido'),
        size: zod_1.z.number().min(0)
    })).optional(),
    followUp: zod_1.z.object({
        required: zod_1.z.boolean()["default"](false),
        date: zod_1.z.date().optional(),
        instructions: zod_1.z.string().optional()
    }).optional(),
    isConfidential: zod_1.z.boolean()["default"](false),
    createdBy: zod_1.z.string().min(1, 'Creado por es requerido'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CreateMedicalRecordSchema = exports.MedicalRecordSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true
});
exports.UpdateMedicalRecordSchema = exports.CreateMedicalRecordSchema.partial();
// ==================== API RESPONSE SCHEMAS ====================
exports.ApiResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.any().optional(),
    message: zod_1.z.string().optional(),
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.any().optional()
    }).optional(),
    timestamp: zod_1.z.string()
});
// ==================== VALIDATION HELPERS ====================
exports.validateUser = function (data) { return exports.UserSchema.parse(data); };
exports.validateCreateUser = function (data) { return exports.CreateUserSchema.parse(data); };
exports.validateUpdateUser = function (data) { return exports.UpdateUserSchema.parse(data); };
exports.validateDoctorProfile = function (data) { return exports.DoctorProfileSchema.parse(data); };
exports.validateCreateDoctorProfile = function (data) { return exports.CreateDoctorProfileSchema.parse(data); };
exports.validateUpdateDoctorProfile = function (data) { return exports.UpdateDoctorProfileSchema.parse(data); };
exports.validatePatientProfile = function (data) { return exports.PatientProfileSchema.parse(data); };
exports.validateCreatePatientProfile = function (data) { return exports.CreatePatientProfileSchema.parse(data); };
exports.validateUpdatePatientProfile = function (data) { return exports.UpdatePatientProfileSchema.parse(data); };
exports.validateCompany = function (data) { return exports.CompanySchema.parse(data); };
exports.validateCreateCompany = function (data) { return exports.CreateCompanySchema.parse(data); };
exports.validateUpdateCompany = function (data) { return exports.UpdateCompanySchema.parse(data); };
exports.validateAppointment = function (data) { return exports.AppointmentSchema.parse(data); };
exports.validateCreateAppointment = function (data) { return exports.CreateAppointmentSchema.parse(data); };
exports.validateUpdateAppointment = function (data) { return exports.UpdateAppointmentSchema.parse(data); };
exports.validateMedicalRecord = function (data) { return exports.MedicalRecordSchema.parse(data); };
exports.validateCreateMedicalRecord = function (data) { return exports.CreateMedicalRecordSchema.parse(data); };
exports.validateUpdateMedicalRecord = function (data) { return exports.UpdateMedicalRecordSchema.parse(data); };
