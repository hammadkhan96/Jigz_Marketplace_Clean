import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JIGZ CSV file
const csvPath = path.join(__dirname, '..', 'attached_assets', 'JIGZ_area_databse_1753883521393.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV data
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');
const cities = [];

console.log(`Processing ${lines.length - 1} locations from JIGZ database...`);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // More robust CSV parsing to handle commas in city names
  const commaIndex = line.lastIndexOf(',');
  if (commaIndex === -1) continue;
  
  let cityName = line.substring(0, commaIndex).trim();
  let countryName = line.substring(commaIndex + 1).trim();
  
  // Clean up any special characters that might cause issues
  cityName = cityName.replace(/[""]/g, '"').replace(/'/g, "'");
  countryName = countryName.replace(/[""]/g, '"').replace(/'/g, "'");
  
  // Skip entries with problematic characters that could break TypeScript
  if (cityName.includes('"') || countryName.includes('"') || 
      cityName.includes('\\') || countryName.includes('\\')) {
    continue;
  }
  
  if (cityName && countryName) {
    cities.push({
      city: cityName,
      country: countryName,
      formatted: `${cityName}, ${countryName}`
    });
  }
}

console.log(`Successfully parsed ${cities.length} cities from JIGZ database`);

// Group cities by country
const citiesByCountry = {};
cities.forEach(city => {
  if (!citiesByCountry[city.country]) {
    citiesByCountry[city.country] = [];
  }
  citiesByCountry[city.country].push(city);
});

console.log(`Found cities from ${Object.keys(citiesByCountry).length} countries`);

// Define priority countries and limits for popular cities list
const priorityCountries = {
  'United States': 100,
  'Canada': 50,
  'United Kingdom': 40,
  'Germany': 30,
  'France': 30,
  'Spain': 25,
  'Italy': 25,
  'Netherlands': 20,
  'Australia': 30,
  'New Zealand': 15,
  'Japan': 30,
  'China': 50,
  'India': 40,
  'Brazil': 25,
  'Mexico': 20,
  'Argentina': 15,
  'South Korea': 15,
  'Korea': 15,
  'Thailand': 15,
  'Indonesia': 15,
  'Malaysia': 10,
  'Singapore': 5,
  'Philippines': 15,
  'Vietnam': 12,
  'South Africa': 15,
  'Nigeria': 10,
  'Egypt': 8,
  'Turkey': 12,
  'Russia': 20,
  'Poland': 15,
  'Sweden': 10,
  'Norway': 8,
  'Denmark': 8,
  'Finland': 8,
  'Belgium': 12,
  'Switzerland': 10,
  'Austria': 8,
  'Portugal': 10,
  'Greece': 8,
  'Ireland': 8,
  'Israel': 8,
  'UAE': 5,
  'United Arab Emirates': 5,
  'Saudi Arabia': 8,
  'Chile': 10,
  'Colombia': 12,
  'Peru': 8,
  'Venezuela': 6,
  'Ecuador': 6,
  'Uruguay': 3,
  'Paraguay': 3,
  'Bolivia': 5,
  'Iran': 10,
  'Iraq': 8,
  'Afghanistan': 15,
  'Pakistan': 15,
  'Bangladesh': 10,
  'Myanmar': 8,
  'Cambodia': 5,
  'Laos': 5,
  'Sri Lanka': 8,
  'Nepal': 8,
  'Morocco': 8,
  'Algeria': 10,
  'Tunisia': 6,
  'Libya': 5,
  'Ghana': 8,
  'Kenya': 8,
  'Ethiopia': 8,
  'Tanzania': 8,
  'Uganda': 6,
  'Zimbabwe': 6,
  'Zambia': 5,
  'Angola': 5,
  'Mozambique': 5,
  'Madagascar': 5
};

// Create the final popular cities list
let popularCities = ['All Locations'];

// Add cities from priority countries
Object.entries(priorityCountries).forEach(([country, limit]) => {
  if (citiesByCountry[country]) {
    const countryCities = citiesByCountry[country]
      .slice(0, limit)
      .map(city => city.formatted);
    popularCities.push(...countryCities);
  }
});

// Add some major cities from other countries not in priority list
const otherCountries = Object.keys(citiesByCountry)
  .filter(country => !priorityCountries[country])
  .sort();

otherCountries.forEach(country => {
  const countryCities = citiesByCountry[country].slice(0, 3);
  popularCities.push(...countryCities.map(city => city.formatted));
});

// Remove duplicates and sort (keep "All Locations" at top)
const allLocations = popularCities.shift();
popularCities = [...new Set(popularCities)];
popularCities.sort();
popularCities.unshift(allLocations);

console.log(`Created popular cities list with ${popularCities.length} cities`);

// Create comprehensive search list (first 5000 cities for performance)
const allCitiesForSearch = cities.slice(0, 5000).map(city => city.formatted);

// Generate the new cities.ts file
const citiesFileContent = `// JIGZ World Cities Database
// Updated from JIGZ area database with ${cities.length} locations worldwide
// Comprehensive coverage of cities, towns, and administrative areas

export const topCities = [
${popularCities.map(city => `  "${city.replace(/"/g, '\\"')}"`).join(',\n')}
];

export const citiesWithoutAll = topCities.filter(city => city !== "All Locations");

// Comprehensive cities list for advanced search (${allCitiesForSearch.length} cities)
export const allWorldCities = [
${allCitiesForSearch.map(city => `  "${city.replace(/"/g, '\\"')}"`).join(',\n')}
];

// Enhanced search function with comprehensive global coverage
export const searchCities = (searchTerm: string, limit: number = 50): string[] => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return topCities.slice(0, limit);
  }
  
  const term = searchTerm.toLowerCase().trim();
  const results: string[] = [];
  
  // First priority: Exact matches from popular cities
  const exactMatches = topCities.filter(city => 
    city.toLowerCase().includes(term)
  );
  results.push(...exactMatches);
  
  // Second priority: Matches from comprehensive world cities
  if (results.length < limit) {
    const additionalMatches = allWorldCities.filter(city => 
      city.toLowerCase().includes(term) && 
      !results.some(result => result.toLowerCase() === city.toLowerCase())
    );
    results.push(...additionalMatches.slice(0, limit - results.length));
  }
  
  return results.slice(0, limit);
};

// Country statistics
export const countryStats = {
  totalCountries: ${Object.keys(citiesByCountry).length},
  totalCities: ${cities.length},
  popularCities: ${popularCities.length - 1}, // Excluding "All Locations"
  searchableCities: ${allCitiesForSearch.length}
};

// Legacy compatibility
export const worldCities = topCities;
export const filterCities = searchCities;
`;

// Write the updated cities file
const outputPath = path.join(__dirname, '..', 'shared', 'cities.ts');
fs.writeFileSync(outputPath, citiesFileContent);

console.log('✅ Successfully updated shared/cities.ts with JIGZ database');
console.log(`📊 Statistics:`);
console.log(`   - Total locations processed: ${cities.length}`);
console.log(`   - Countries covered: ${Object.keys(citiesByCountry).length}`);
console.log(`   - Popular cities: ${popularCities.length}`);
console.log(`   - Searchable cities: ${allCitiesForSearch.length}`);

// Show top countries by city count
const topCountriesByCount = Object.entries(citiesByCountry)
  .map(([country, cities]) => ({ country, count: cities.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);

console.log(`🌍 Top 10 countries by location count:`);
topCountriesByCount.forEach(({ country, count }, index) => {
  console.log(`   ${index + 1}. ${country}: ${count} locations`);
});