// generatePhoneLengths.js
// Script para generar el mapeo de longitudes máximas de números nacionales por país usando la metadata de libphonenumber-js

const fs = require('fs');
const path = require('path');

// Ruta al archivo de metadata de libphonenumber-js
const metadataPath = path.resolve(__dirname, '../../node_modules/libphonenumber-js/metadata.min.json');
const outputPath = path.resolve(__dirname, './phoneLengths.ts');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const countries = metadata.countries;

// Generar el objeto de longitudes máximas
const phoneLengths = {};
for (const [country, data] of Object.entries(countries)) {
  // El cuarto elemento del array es el array de longitudes posibles
  const lengths = data[3];
  if (Array.isArray(lengths) && lengths.length > 0) {
    phoneLengths[country] = Math.max(...lengths);
  }
}

// Generar el archivo TypeScript
const fileContent = `// phoneLengths.ts\n// Generado automáticamente desde libphonenumber-js metadata\n\nexport const phoneLengths: Record<string, number> = ${JSON.stringify(phoneLengths, null, 2)};\n\nexport function getMaxLength(country: string): number {\n  return phoneLengths[country] || 15; // 15 es el máximo E.164\n}\n`;

fs.writeFileSync(outputPath, fileContent);
console.log('Archivo phoneLengths.ts generado correctamente.');
