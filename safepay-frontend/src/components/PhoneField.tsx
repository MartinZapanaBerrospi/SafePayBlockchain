import React, { useEffect } from 'react';
import { TextField, MenuItem, InputAdornment, Box } from '@mui/material';
import { getCountries, getCountryCallingCode, AsYouType } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
import "../styles/flag-icons.min.css";
import { getMaxLength } from '../utils/phoneLengths';
// Nota: Importación local para compatibilidad con Vite. El archivo fue copiado manualmente desde el repositorio oficial.

interface PhoneFieldProps {
  value: string;
  onChange: (val: string) => void;
  country: string;
  setCountry: (c: string) => void;
}

// Vite: importar banderas usando import.meta.glob
const flagFiles = import.meta.glob('../styles/flags/4x3/*.svg', { eager: true });
const availableCountryCodes = Object.keys(flagFiles)
  .map((path) => path.match(/([A-Z]{2})\.svg$/i)?.[1]?.toUpperCase())
  .filter((code): code is string => Boolean(code));

const countryList = getCountries()
  .filter((code) => availableCountryCodes.includes(code.toUpperCase()))
  .map((code) => ({
    code,
    label: code.toUpperCase(),
    dialCode: `+${getCountryCallingCode(code as CountryCode)}`,
  }));

export default function PhoneField({ value, onChange, country, setCountry }: PhoneFieldProps) {
  // Reformatea el valor cuando cambia el país
  useEffect(() => {
    if (value) {
      // Extrae solo dígitos del valor actual
      const raw = value.replace(/\D/g, '');
      const max = getMaxLength(country);
      const limited = raw.slice(0, max);
      // Formatea el número nacional según el país
      const formatted = new AsYouType(country as CountryCode).input(limited);
      if (formatted !== value) {
        onChange(formatted);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountry(e.target.value);
    onChange('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo dígitos, sin prefijo ni formato
    const raw = e.target.value.replace(/\D/g, '');
    const max = getMaxLength(country);
    const limited = raw.slice(0, max);
    // Formatear solo el número nacional
    const formatted = new AsYouType(country as CountryCode).input(limited);
    onChange(formatted);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <TextField
        select
        value={country}
        onChange={handleCountryChange}
        variant="outlined"
        size="small"
        sx={{ minWidth: 100, background: 'var(--color-card)' }}
        inputProps={{ 'aria-label': 'País' }}
      >
        {countryList.map((option) => (
          <MenuItem key={option.code} value={option.code}>
            <span className={`fi fi-${option.code.toLowerCase()}`} style={{ marginRight: 8 }}></span>
            {option.label} {option.dialCode}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        value={value}
        onChange={handlePhoneChange}
        variant="outlined"
        size="small"
        placeholder="Número"
        sx={{ flex: 1, background: 'var(--color-card)' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {/* No mostrar bandera ni prefijo, solo el campo de número */}
            </InputAdornment>
          ),
        }}
        inputProps={{
          inputMode: 'numeric',
          'aria-label': 'Número de teléfono',
        }}
      />
    </Box>
  );
}
