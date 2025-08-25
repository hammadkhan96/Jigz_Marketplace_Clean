import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvPath = path.join(__dirname, '../attached_assets/worldcities_1753519868277.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV and convert to city array
const lines = csvContent.split('\n');
const cities = [];

// Skip header and process each line
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Handle CSV parsing with potential commas in quotes
  const match = line.match(/^"?([^"]*?)"?,\s*"?([^"]*?)"?$/);
  if (match) {
    const city = match[1].trim();
    const country = match[2].trim();
    
    if (city && country) {
      cities.push(`${city}, ${country}`);
    }
  }
}

// Sort cities alphabetically
cities.sort();

// Add "All Cities" option at the beginning
cities.unshift("All Cities");

// Generate the TypeScript file content
const tsContent = `// Comprehensive world cities list for Jigz marketplace
// Auto-generated from world cities database with ${cities.length - 1} cities
export const worldCities = ${JSON.stringify(cities, null, 2)};

export const citiesWithoutAll = worldCities.filter(city => city !== "All Cities");

// Helper function to filter cities based on search term
export const filterCities = (searchTerm: string): string[] => {
  if (!searchTerm) return worldCities;
  
  const term = searchTerm.toLowerCase();
  return worldCities.filter(city => 
    city.toLowerCase().includes(term)
  );
};
`;

// Write the new cities file
const outputPath = path.join(__dirname, '../shared/cities.ts');
fs.writeFileSync(outputPath, tsContent);

console.log(`✅ Successfully processed ${cities.length - 1} cities from the world cities database`);
console.log(`📁 Updated: shared/cities.ts`);
console.log(`📊 Total cities available: ${cities.length - 1}`);
console.log(`🌍 Coverage: Global cities from all continents`);