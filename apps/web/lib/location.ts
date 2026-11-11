import type { Colombia } from '../components/form-fields';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(departamento|de|del|distrito|capital)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Match names only within the recognized department; never guess by proximity. */
export function matchMunicipality(
  catalog: Colombia,
  point: { city?: string; department?: string },
) {
  if (!point.city) return null;
  const city = normalize(point.city);
  if (city === 'bogota' || city === 'bogotadc') {
    const department = Object.keys(catalog).find((name) => normalize(name) === 'bogotadc');
    const municipality = department ? catalog[department][0] : undefined;
    return department && municipality ? { department, city: municipality.name } : null;
  }
  if (!point.department) return null;
  const department = Object.keys(catalog).find(
    (name) => normalize(name) === normalize(point.department!),
  );
  if (!department) return null;
  const municipality = catalog[department].find((item) => normalize(item.name) === city);
  return municipality ? { department, city: municipality.name } : null;
}
