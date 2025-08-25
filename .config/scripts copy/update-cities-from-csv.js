import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvPath = path.join(__dirname, '..', 'attached_assets', 'worldcities_1753519868277.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV data
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');
const cities = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  let city = values[0];
  let country = values[1];
  
  // Clean up quoted values
  city = city.replace(/"/g, '');
  country = country.replace(/"/g, '');
  
  if (city && country) {
    cities.push({
      city: city.trim(),
      country: country.trim(),
      formatted: `${city.trim()}, ${country.trim()}`
    });
  }
}

console.log(`Parsed ${cities.length} cities from CSV`);

// Group cities by country
const citiesByCountry = {};
cities.forEach(city => {
  if (!citiesByCountry[city.country]) {
    citiesByCountry[city.country] = [];
  }
  citiesByCountry[city.country].push(city);
});

// Define priority countries and how many cities to take from each
const priorityCountries = {
  'United States': 50,
  'Canada': 15,
  'United Kingdom': 15,
  'Germany': 12,
  'France': 12,
  'Spain': 10,
  'Italy': 10,
  'Netherlands': 8,
  'Australia': 12,
  'New Zealand': 6,
  'Japan': 12,
  'China': 20,
  'India': 15,
  'Brazil': 10,
  'Mexico': 8,
  'Argentina': 6,
  'South Korea': 6,
  'Korea, South': 6,
  'Thailand': 5,
  'Indonesia': 5,
  'Malaysia': 4,
  'Singapore': 1,
  'Philippines': 5,
  'Vietnam': 4,
  'South Africa': 6,
  'Nigeria': 4,
  'Egypt': 3,
  'Turkey': 4,
  'Russia': 8,
  'Poland': 6,
  'Sweden': 4,
  'Norway': 3,
  'Denmark': 3,
  'Finland': 3,
  'Belgium': 4,
  'Switzerland': 4,
  'Austria': 3,
  'Portugal': 4,
  'Greece': 3,
  'Ireland': 3,
  'Israel': 3,
  'UAE': 2,
  'United Arab Emirates': 2,
  'Saudi Arabia': 3,
  'Chile': 4,
  'Colombia': 4,
  'Peru': 3,
  'Venezuela': 2,
  'Ecuador': 2,
  'Uruguay': 1,
  'Paraguay': 1,
  'Bolivia': 2
};

// Create the final cities list
let finalCities = ['All Locations'];

// Add cities from priority countries
Object.entries(priorityCountries).forEach(([country, limit]) => {
  if (citiesByCountry[country]) {
    const countryCities = citiesByCountry[country]
      .slice(0, limit)
      .map(city => city.formatted);
    finalCities.push(...countryCities);
  }
});

// Add some additional major cities from other countries
const otherMajorCities = cities
  .filter(city => !priorityCountries[city.country])
  .slice(0, 50)
  .map(city => city.formatted);

finalCities.push(...otherMajorCities);

// Remove duplicates and sort
finalCities = [...new Set(finalCities)];

// Keep "All Locations" at the top, sort the rest
const allLocations = finalCities.shift();
finalCities.sort();
finalCities.unshift(allLocations);

console.log(`Created final list with ${finalCities.length} cities`);

// Generate the new cities.ts file
const citiesFileContent = `// World cities for Jigz marketplace
// Updated from worldcities CSV data with ${cities.length} cities
// Optimized selection of popular cities from major countries

export const topCities = [
${finalCities.map(city => `  "${city}"`).join(',\n')}
];

export const citiesWithoutAll = topCities.filter(city => city !== "All Locations");

// All cities from CSV for comprehensive search
export const allWorldCities = [
${cities.slice(0, 1000).map(city => `  "${city.formatted}"`).join(',\n')}
];

// Search function for cities with comprehensive coverage
export const searchCities = (searchTerm: string, limit: number = 50): string[] => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return topCities.slice(0, limit);
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  // Search through all cities for better results
  const results = [];
  
  // First, add exact matches from popular cities
  const exactMatches = topCities.filter(city => 
    city.toLowerCase().includes(term)
  );
  results.push(...exactMatches);
  
  // Then add matches from all world cities
  if (results.length < limit) {
    const additionalMatches = allWorldCities.filter(city => 
      city.toLowerCase().includes(term) && !results.includes(city)
    );
    results.push(...additionalMatches.slice(0, limit - results.length));
  }
  
  return results.slice(0, limit);
};

// Legacy compatibility
export const worldCities = topCities;
export const filterCities = searchCities;
`;

// Write the updated cities file
const outputPath = path.join(__dirname, '..', 'shared', 'cities.ts');
fs.writeFileSync(outputPath, citiesFileContent);

console.log('Successfully updated shared/cities.ts');
console.log(`Top cities: ${finalCities.length}`);
console.log(`Total cities available for search: ${Math.min(1000, cities.length)}`);