import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JIGZ CSV file
const csvPath = path.join(__dirname, '..', 'attached_assets', 'JIGZ_area_databse_1753883521393.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV with better error handling
const lines = csvContent.trim().split('\n');
const cities = [];

console.log(`Processing ${lines.length - 1} locations...`);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  const commaIndex = line.lastIndexOf(',');
  if (commaIndex === -1) continue;
  
  let cityName = line.substring(0, commaIndex).trim();
  let countryName = line.substring(commaIndex + 1).trim();
  
  // Skip problematic entries
  if (!cityName || !countryName || 
      cityName.includes('"') || countryName.includes('"') ||
      cityName.includes('\\') || countryName.includes('\\') ||
      cityName.includes('\n') || countryName.includes('\n')) {
    continue;
  }
  
  // Clean special characters
  cityName = cityName.replace(/'/g, "'").replace(/"/g, "");
  countryName = countryName.replace(/'/g, "'").replace(/"/g, "");
  
  cities.push({
    city: cityName,
    country: countryName,
    formatted: `${cityName}, ${countryName}`
  });
}

console.log(`Successfully parsed ${cities.length} valid cities`);

// Group by country
const citiesByCountry = {};
cities.forEach(city => {
  if (!citiesByCountry[city.country]) {
    citiesByCountry[city.country] = [];
  }
  citiesByCountry[city.country].push(city);
});

// Create priority list (smaller for stability)
const priorityCountries = {
  'United States': 80,
  'Canada': 30,
  'United Kingdom': 25,
  'Germany': 20,
  'France': 20,
  'Spain': 15,
  'Italy': 15,
  'Netherlands': 12,
  'Australia': 20,
  'New Zealand': 10,
  'Japan': 15,
  'China': 25,
  'India': 20,
  'Brazil': 15,
  'Mexico': 12
};

let popularCities = ['All Locations'];

Object.entries(priorityCountries).forEach(([country, limit]) => {
  if (citiesByCountry[country]) {
    citiesByCountry[country].slice(0, limit).forEach(city => {
      popularCities.push(city.formatted);
    });
  }
});

// Remove duplicates and sort
const allLocations = popularCities.shift();
popularCities = [...new Set(popularCities)];
popularCities.sort();
popularCities.unshift(allLocations);

console.log(`Created ${popularCities.length} popular cities`);

// Create search cities (all locations for comprehensive coverage)
const searchCities = cities.map(city => city.formatted);

// Generate clean TypeScript file
const cleanCitiesContent = `// JIGZ World Cities Database - Optimized Version
// ${cities.length} locations from ${Object.keys(citiesByCountry).length} countries

export const topCities = [
${popularCities.map(city => `  "${city.replace(/"/g, '\\"')}"`).join(',\n')}
];

export const citiesWithoutAll = topCities.filter(city => city !== "All Locations");

export const allWorldCities = [
${searchCities.map(city => `  "${city.replace(/"/g, '\\"')}"`).join(',\n')}
];

export const searchCities = (searchTerm: string, limit: number = 50): string[] => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return topCities.slice(0, limit);
  }
  
  const term = searchTerm.toLowerCase().trim();
  const results: string[] = [];
  
  const exactMatches = topCities.filter(city => 
    city.toLowerCase().includes(term)
  );
  results.push(...exactMatches);
  
  if (results.length < limit) {
    const additionalMatches = allWorldCities.filter(city => 
      city.toLowerCase().includes(term) && 
      !results.some(result => result.toLowerCase() === city.toLowerCase())
    );
    results.push(...additionalMatches.slice(0, limit - results.length));
  }
  
  return results.slice(0, limit);
};

export const countryStats = {
  totalCountries: ${Object.keys(citiesByCountry).length},
  totalCities: ${cities.length},
  popularCities: ${popularCities.length - 1},
  searchableCities: ${searchCities.length}
};

export const worldCities = topCities;
export const filterCities = searchCities;
`;

// Write the file
const outputPath = path.join(__dirname, '..', 'shared', 'cities.ts');
fs.writeFileSync(outputPath, cleanCitiesContent);

console.log('✅ Successfully created clean cities file');
console.log(`📊 Final stats: ${popularCities.length} popular, ${searchCities.length} comprehensive searchable locations`);