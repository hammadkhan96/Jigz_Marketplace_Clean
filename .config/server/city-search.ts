import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for all cities data
let allCitiesCache: string[] | null = null;

// Load all cities from the original CSV file
function loadAllCities(): string[] {
  if (allCitiesCache) {
    return allCitiesCache;
  }

  try {
    const csvPath = path.join(__dirname, '../attached_assets/worldcities_1753519868277.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const cities: string[] = [];

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

    allCitiesCache = cities.sort();
    return allCitiesCache;
  } catch (error) {
    // Log error silently in development, handle gracefully in production
    return [];
  }
}

// Fast city search function
export function searchWorldCities(searchTerm: string, limit: number = 100): string[] {
  if (!searchTerm || searchTerm.trim().length < 2) {
    // Return popular cities for empty/short searches
    return [
      "All Locations",
      "New York, United States", "Los Angeles, United States", "Chicago, United States",
      "London, United Kingdom", "Paris, France", "Tokyo, Japan", "Sydney, Australia",
      "Toronto, Canada", "Berlin, Germany", "Madrid, Spain", "Rome, Italy",
      "Amsterdam, Netherlands", "Beijing, China", "Mumbai, India", "Seoul, Korea, South",
      "Singapore, Singapore", "Dubai, United Arab Emirates", "São Paulo, Brazil",
      "Buenos Aires, Argentina", "Mexico City, Mexico", "Lagos, Nigeria", "Cairo, Egypt"
    ].slice(0, limit);
  }

  const allCities = loadAllCities();
  const term = searchTerm.toLowerCase().trim();
  const results = ["All Locations"];

  // Search through all cities
  const matches = allCities
    .filter(city => city.toLowerCase().includes(term))
    .slice(0, limit - 1);

  results.push(...matches);
  return results.slice(0, limit);
}