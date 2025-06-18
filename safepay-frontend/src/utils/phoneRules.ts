// Utilidades para validación de teléfono por país
export const phoneRules: Record<string, { min: number; max: number; example: string }> = {
  pe: { min: 9, max: 9, example: '987654321' }, // Perú
  ar: { min: 10, max: 10, example: '1123456789' }, // Argentina
  mx: { min: 10, max: 10, example: '5512345678' }, // México
  co: { min: 10, max: 10, example: '3012345678' }, // Colombia
  cl: { min: 9, max: 9, example: '912345678' }, // Chile
  us: { min: 10, max: 10, example: '2015550123' }, // USA
  es: { min: 9, max: 9, example: '612345678' }, // España
  br: { min: 10, max: 11, example: '11987654321' }, // Brasil
  ec: { min: 9, max: 9, example: '991234567' }, // Ecuador
  // ...agrega más países según necesidad
};
