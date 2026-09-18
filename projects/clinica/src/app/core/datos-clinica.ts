/**
 * Datos de demostración del consultorio.
 * Todos los nombres, cédulas, teléfonos y direcciones son ficticios.
 */

export interface Especialidad {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  /** Precio de referencia de la consulta en MXN (dato de demostración). */
  precioDesde: number;
  duracionMinutos: number;
}

export interface Medico {
  id: string;
  nombre: string;
  especialidadId: string;
  cedula: string;
  resumen: string;
  /** Días de la semana que atiende: 0 = domingo ... 6 = sábado */
  dias: number[];
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  iniciales: string;
  color: string;
}

export const CLINICA = {
  nombre: 'Clínica Salud Integral',
  eslogan: 'Atención médica cercana, con cita en minutos.',
  descripcion:
    'Somos un consultorio multiespecialidad con más de diez años acompañando a familias de la zona. ' +
    'Ofrecemos consulta general, pediatría, odontología, ginecología y nutrición, con agenda en línea ' +
    'para que elijas el horario que mejor se acomode a tu día.',
  direccion: 'Av. Ejemplo 123, Col. Demostración, C.P. 00000, Ciudad de México',
  telefono: '55 0000 0000',
  whatsapp: '55 0000 0001',
  correo: 'citas@clinica-demo.test',
  horarioTexto: 'Lunes a viernes de 08:00 a 20:00. Sábados de 09:00 a 14:00.',
  urgenciasTexto: 'No atendemos urgencias. En caso de emergencia llama al 911.',
  aviso: 'Sitio de demostración académica. Los datos mostrados son ficticios.',
};

export const ESPECIALIDADES: Especialidad[] = [
  {
    id: 'general',
    nombre: 'Medicina general',
    icono: 'stethoscope',
    descripcion: 'Valoración integral, diagnóstico y seguimiento de padecimientos comunes y crónicos.',
    precioDesde: 450,
    duracionMinutos: 30,
  },
  {
    id: 'pediatria',
    nombre: 'Pediatría',
    icono: 'child_care',
    descripcion: 'Control del niño sano, vacunación, y atención de enfermedades de la infancia.',
    precioDesde: 550,
    duracionMinutos: 30,
  },
  {
    id: 'odontologia',
    nombre: 'Odontología',
    icono: 'dentistry',
    descripcion: 'Limpieza dental, resinas, extracciones y valoración de ortodoncia.',
    precioDesde: 500,
    duracionMinutos: 45,
  },
  {
    id: 'ginecologia',
    nombre: 'Ginecología',
    icono: 'female',
    descripcion: 'Revisión anual, control prenatal, planificación familiar y salud hormonal.',
    precioDesde: 650,
    duracionMinutos: 30,
  },
  {
    id: 'nutricion',
    nombre: 'Nutrición',
    icono: 'nutrition',
    descripcion: 'Planes de alimentación personalizados y seguimiento de peso y composición corporal.',
    precioDesde: 400,
    duracionMinutos: 45,
  },
];

export const MEDICOS: Medico[] = [
  {
    id: 'm1',
    nombre: 'Dra. Alejandra Prueba Morales',
    especialidadId: 'general',
    cedula: 'Cédula 00000001 (ficticia)',
    resumen: 'Médica cirujana por la UNAM. Enfoque en medicina familiar y prevención.',
    dias: [1, 2, 3, 4, 5],
    horaInicio: '08:00',
    horaFin: '14:00',
    iniciales: 'AP',
    color: '#0b7285',
  },
  {
    id: 'm2',
    nombre: 'Dr. Roberto Demo Castillo',
    especialidadId: 'general',
    cedula: 'Cédula 00000002 (ficticia)',
    resumen: 'Medicina interna. Seguimiento de diabetes e hipertensión.',
    dias: [1, 2, 3, 4, 5, 6],
    horaInicio: '14:00',
    horaFin: '20:00',
    iniciales: 'RD',
    color: '#2b8a3e',
  },
  {
    id: 'm3',
    nombre: 'Dra. Fernanda Ejemplo Ríos',
    especialidadId: 'pediatria',
    cedula: 'Cédula 00000003 (ficticia)',
    resumen: 'Pediatra con subespecialidad en neonatología.',
    dias: [1, 3, 5],
    horaInicio: '09:00',
    horaFin: '15:00',
    iniciales: 'FE',
    color: '#e67700',
  },
  {
    id: 'm4',
    nombre: 'Dr. Miguel Muestra Ortega',
    especialidadId: 'odontologia',
    cedula: 'Cédula 00000004 (ficticia)',
    resumen: 'Cirujano dentista. Odontología restaurativa y estética.',
    dias: [2, 4, 6],
    horaInicio: '10:00',
    horaFin: '18:00',
    iniciales: 'MM',
    color: '#5f3dc4',
  },
  {
    id: 'm5',
    nombre: 'Dra. Lucía Modelo Herrera',
    especialidadId: 'ginecologia',
    cedula: 'Cédula 00000005 (ficticia)',
    resumen: 'Ginecología y obstetricia. Control prenatal y salud reproductiva.',
    dias: [1, 2, 4],
    horaInicio: '09:00',
    horaFin: '17:00',
    iniciales: 'LM',
    color: '#c2255c',
  },
  {
    id: 'm6',
    nombre: 'Lic. Daniel Patrón Vega',
    especialidadId: 'nutricion',
    cedula: 'Cédula 00000006 (ficticia)',
    resumen: 'Nutriólogo clínico. Nutrición deportiva y control de peso.',
    dias: [1, 2, 3, 4, 5],
    horaInicio: '08:00',
    horaFin: '13:00',
    iniciales: 'DP',
    color: '#1971c2',
  },
];

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function especialidadDe(id: string): Especialidad | undefined {
  return ESPECIALIDADES.find((e) => e.id === id);
}

export function medicoDe(id: string): Medico | undefined {
  return MEDICOS.find((m) => m.id === id);
}

export function diasTexto(dias: number[]): string {
  return dias.map((d) => DIAS_SEMANA[d]).join(', ');
}
