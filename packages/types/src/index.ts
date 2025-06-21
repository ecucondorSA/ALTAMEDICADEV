import { z } from 'zod';

// ==================== USER SCHEMAS ====================

export const UserRoleSchema = z.enum(['admin', 'doctor', 'patient', 'staff']);

export const UserSchema = z.object({
  uid: z.string().min(1, 'UID es requerido'),
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  role: UserRoleSchema,
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
  profileComplete: z.boolean().default(false),
});

export const CreateUserSchema = UserSchema.omit({
  uid: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const UpdateUserSchema = CreateUserSchema.partial();

// ==================== DOCTOR SCHEMAS ====================

export const SpecialtySchema = z.enum([
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

export const DoctorProfileSchema = z.object({
  uid: z.string().min(1, 'UID es requerido'),
  licenseNumber: z.string().min(1, 'Número de licencia es requerido'),
  specialties: z.array(SpecialtySchema).min(1, 'Al menos una especialidad es requerida'),
  education: z.array(z.object({
    institution: z.string().min(1, 'Institución es requerida'),
    degree: z.string().min(1, 'Título es requerido'),
    year: z.number().int().min(1950).max(new Date().getFullYear()),
  })).optional(),
  experience: z.number().int().min(0).optional(),
  bio: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
  availability: z.object({
    monday: z.array(z.string()).optional(),
    tuesday: z.array(z.string()).optional(),
    wednesday: z.array(z.string()).optional(),
    thursday: z.array(z.string()).optional(),
    friday: z.array(z.string()).optional(),
    saturday: z.array(z.string()).optional(),
    sunday: z.array(z.string()).optional(),
  }).optional(),
  companyId: z.string().optional(),
  isVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateDoctorProfileSchema = DoctorProfileSchema.omit({
  uid: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateDoctorProfileSchema = CreateDoctorProfileSchema.partial();

// ==================== PATIENT SCHEMAS ====================

export const BloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

export const PatientProfileSchema = z.object({
  uid: z.string().min(1, 'UID es requerido'),
  dateOfBirth: z.date(),
  gender: z.enum(['male', 'female', 'other']),
  bloodType: BloodTypeSchema.optional(),
  height: z.number().min(0).optional(), // en cm
  weight: z.number().min(0).optional(), // en kg
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string().min(1, 'Nombre del medicamento es requerido'),
    dosage: z.string().min(1, 'Dosis es requerida'),
    frequency: z.string().min(1, 'Frecuencia es requerida'),
    startDate: z.date(),
    endDate: z.date().optional(),
  })).optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Nombre del contacto es requerido'),
    relationship: z.string().min(1, 'Relación es requerida'),
    phone: z.string().min(1, 'Teléfono es requerido'),
  }).optional(),
  insuranceInfo: z.object({
    provider: z.string().min(1, 'Proveedor es requerido'),
    policyNumber: z.string().min(1, 'Número de póliza es requerido'),
    groupNumber: z.string().optional(),
  }).optional(),
  companyId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePatientProfileSchema = PatientProfileSchema.omit({
  uid: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePatientProfileSchema = CreatePatientProfileSchema.partial();

// ==================== COMPANY SCHEMAS ====================

export const CompanySchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  name: z.string().min(1, 'Nombre de la empresa es requerido'),
  taxId: z.string().min(1, 'NIT/RUT es requerido'),
  address: z.object({
    street: z.string().min(1, 'Dirección es requerida'),
    city: z.string().min(1, 'Ciudad es requerida'),
    state: z.string().min(1, 'Estado/Provincia es requerido'),
    zipCode: z.string().min(1, 'Código postal es requerido'),
    country: z.string().min(1, 'País es requerido'),
  }),
  phone: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido'),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  specialties: z.array(SpecialtySchema).optional(),
  subscription: z.object({
    plan: z.enum(['basic', 'premium', 'enterprise']),
    status: z.enum(['active', 'inactive', 'suspended']),
    startDate: z.date(),
    endDate: z.date().optional(),
    maxUsers: z.number().int().min(1),
    maxPatients: z.number().int().min(1),
  }),
  settings: z.object({
    timeZone: z.string().default('America/Bogota'),
    language: z.string().default('es'),
    appointmentDuration: z.number().int().min(15).max(240).default(30), // minutos
    workingHours: z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
    }).default({ start: '08:00', end: '18:00' }),
    workingDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
      .default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  }).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCompanySchema = CompanySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

// ==================== APPOINTMENT SCHEMAS ====================

export const AppointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show'
]);

export const AppointmentTypeSchema = z.enum([
  'consultation',
  'follow-up',
  'procedure',
  'emergency',
  'telemedicine'
]);

export const AppointmentSchema = z.object({
  id: z.string().min(1, 'ID es requerido').optional(),
  doctorId: z.string().min(1, 'ID del doctor es requerido'),
  patientId: z.string().min(1, 'ID del paciente es requerido'),
  companyId: z.string().optional(),
  type: AppointmentTypeSchema,
  status: AppointmentStatusSchema.default('scheduled'),
  scheduledAt: z.date(),
  duration: z.number().int().min(15).max(240).default(30), // minutos
  title: z.string().min(1, 'Título es requerido'),
  description: z.string().optional(),
  notes: z.string().optional(),
  location: z.object({
    type: z.enum(['in-person', 'telemedicine']),
    address: z.string().optional(),
    room: z.string().optional(),
    meetingUrl: z.string().url().optional(),
  }).optional(),
  fee: z.number().min(0).optional(),
  paid: z.boolean().default(false),
  reminderSent: z.boolean().default(false),
  createdBy: z.string().min(1, 'Creado por es requerido'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAppointmentSchema = AppointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

// ==================== MEDICAL RECORD SCHEMAS ====================

export const MedicalRecordSchema = z.object({
  id: z.string().min(1, 'ID es requerido').optional(),
  patientId: z.string().min(1, 'ID del paciente es requerido'),
  doctorId: z.string().min(1, 'ID del doctor es requerido'),
  appointmentId: z.string().optional(),
  companyId: z.string().optional(),
  date: z.date(),
  type: z.enum(['consultation', 'diagnosis', 'prescription', 'lab-result', 'procedure']),
  chiefComplaint: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  diagnosis: z.array(z.object({
    code: z.string().optional(), // ICD-10 code
    description: z.string().min(1, 'Descripción del diagnóstico es requerida'),
    type: z.enum(['primary', 'secondary', 'differential']),
  })).optional(),
  treatment: z.object({
    medications: z.array(z.object({
      name: z.string().min(1, 'Nombre del medicamento es requerido'),
      dosage: z.string().min(1, 'Dosis es requerida'),
      frequency: z.string().min(1, 'Frecuencia es requerida'),
      duration: z.string().min(1, 'Duración es requerida'),
      instructions: z.string().optional(),
    })).optional(),
    procedures: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
  }).optional(),
  vitalSigns: z.object({
    bloodPressure: z.object({
      systolic: z.number().int().min(60).max(300),
      diastolic: z.number().int().min(30).max(200),
    }).optional(),
    heartRate: z.number().int().min(30).max(300).optional(),
    temperature: z.number().min(30).max(50).optional(), // Celsius
    respiratoryRate: z.number().int().min(5).max(60).optional(),
    oxygenSaturation: z.number().min(70).max(100).optional(),
    weight: z.number().min(0).optional(), // kg
    height: z.number().min(0).optional(), // cm
  }).optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'pdf', 'document']),
    url: z.string().url(),
    name: z.string().min(1, 'Nombre del archivo es requerido'),
    size: z.number().min(0),
  })).optional(),
  followUp: z.object({
    required: z.boolean().default(false),
    date: z.date().optional(),
    instructions: z.string().optional(),
  }).optional(),
  isConfidential: z.boolean().default(false),
  createdBy: z.string().min(1, 'Creado por es requerido'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMedicalRecordSchema = MedicalRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const UpdateMedicalRecordSchema = CreateMedicalRecordSchema.partial();

// ==================== API RESPONSE SCHEMAS ====================

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  timestamp: z.string(),
});

// ==================== TYPESCRIPT INTERFACES ====================

export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type Specialty = z.infer<typeof SpecialtySchema>;
export type DoctorProfile = z.infer<typeof DoctorProfileSchema>;
export type CreateDoctorProfile = z.infer<typeof CreateDoctorProfileSchema>;
export type UpdateDoctorProfile = z.infer<typeof UpdateDoctorProfileSchema>;

export type BloodType = z.infer<typeof BloodTypeSchema>;
export type PatientProfile = z.infer<typeof PatientProfileSchema>;
export type CreatePatientProfile = z.infer<typeof CreatePatientProfileSchema>;
export type UpdatePatientProfile = z.infer<typeof UpdatePatientProfileSchema>;

export type Company = z.infer<typeof CompanySchema>;
export type CreateCompany = z.infer<typeof CreateCompanySchema>;
export type UpdateCompany = z.infer<typeof UpdateCompanySchema>;

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type AppointmentType = z.infer<typeof AppointmentTypeSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;

export type MedicalRecord = z.infer<typeof MedicalRecordSchema>;
export type CreateMedicalRecord = z.infer<typeof CreateMedicalRecordSchema>;
export type UpdateMedicalRecord = z.infer<typeof UpdateMedicalRecordSchema>;

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// ==================== VALIDATION HELPERS ====================

export const validateUser = (data: unknown) => UserSchema.parse(data);
export const validateCreateUser = (data: unknown) => CreateUserSchema.parse(data);
export const validateUpdateUser = (data: unknown) => UpdateUserSchema.parse(data);

export const validateDoctorProfile = (data: unknown) => DoctorProfileSchema.parse(data);
export const validateCreateDoctorProfile = (data: unknown) => CreateDoctorProfileSchema.parse(data);
export const validateUpdateDoctorProfile = (data: unknown) => UpdateDoctorProfileSchema.parse(data);

export const validatePatientProfile = (data: unknown) => PatientProfileSchema.parse(data);
export const validateCreatePatientProfile = (data: unknown) => CreatePatientProfileSchema.parse(data);
export const validateUpdatePatientProfile = (data: unknown) => UpdatePatientProfileSchema.parse(data);

export const validateCompany = (data: unknown) => CompanySchema.parse(data);
export const validateCreateCompany = (data: unknown) => CreateCompanySchema.parse(data);
export const validateUpdateCompany = (data: unknown) => UpdateCompanySchema.parse(data);

export const validateAppointment = (data: unknown) => AppointmentSchema.parse(data);
export const validateCreateAppointment = (data: unknown) => CreateAppointmentSchema.parse(data);
export const validateUpdateAppointment = (data: unknown) => UpdateAppointmentSchema.parse(data);

export const validateMedicalRecord = (data: unknown) => MedicalRecordSchema.parse(data);
export const validateCreateMedicalRecord = (data: unknown) => CreateMedicalRecordSchema.parse(data);
export const validateUpdateMedicalRecord = (data: unknown) => UpdateMedicalRecordSchema.parse(data);
