import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the original processed cities
const citiesPath = path.join(__dirname, '../shared/cities.ts');
const citiesContent = fs.readFileSync(citiesPath, 'utf8');

// Extract all cities from the large file
const match = citiesContent.match(/export const popularCities = \[([\s\S]*?)\];/);
if (!match) {
  console.error('Could not find cities array');
  process.exit(1);
}

const citiesString = match[1];
const allCities = citiesString
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.startsWith('"') && line.includes(','))
  .map(line => line.replace(/^"|",$|",$/g, ''))
  .filter(city => city !== 'All Cities');

// Define top cities for immediate loading (major cities worldwide)
const topCities = [
  // Major US Cities
  "New York, United States", "Los Angeles, United States", "Chicago, United States", 
  "Houston, United States", "Phoenix, United States", "Philadelphia, United States",
  "San Antonio, United States", "San Diego, United States", "Dallas, United States",
  "San Jose, United States", "Austin, United States", "Jacksonville, United States",
  "Fort Worth, United States", "Columbus, United States", "Charlotte, United States",
  "San Francisco, United States", "Indianapolis, United States", "Seattle, United States",
  "Denver, United States", "Washington, United States", "Boston, United States",
  "El Paso, United States", "Nashville, United States", "Detroit, United States",
  "Oklahoma City, United States", "Portland, United States", "Las Vegas, United States",
  "Memphis, United States", "Louisville, United States", "Baltimore, United States",
  "Milwaukee, United States", "Albuquerque, United States", "Tucson, United States",
  "Fresno, United States", "Mesa, United States", "Sacramento, United States",
  "Atlanta, United States", "Kansas City, United States", "Colorado Springs, United States",
  "Miami, United States", "Raleigh, United States", "Omaha, United States",
  "Long Beach, United States", "Virginia Beach, United States", "Oakland, United States",
  "Minneapolis, United States", "Tulsa, United States", "Tampa, United States",
  "Arlington, United States", "Honolulu, United States",
  
  // Major Canadian Cities
  "Toronto, Canada", "Montreal, Canada", "Vancouver, Canada", "Calgary, Canada",
  "Edmonton, Canada", "Ottawa, Canada", "Winnipeg, Canada", "Quebec City, Canada",
  "Hamilton, Canada", "Kitchener, Canada", "London, Canada", "Victoria, Canada",
  "Halifax, Canada", "Oshawa, Canada", "Windsor, Canada", "Saskatoon, Canada",
  
  // Major European Cities
  "London, United Kingdom", "Birmingham, United Kingdom", "Manchester, United Kingdom",
  "Glasgow, United Kingdom", "Liverpool, United Kingdom", "Leeds, United Kingdom",
  "Sheffield, United Kingdom", "Edinburgh, United Kingdom", "Bristol, United Kingdom",
  "Cardiff, United Kingdom", "Belfast, United Kingdom", "Newcastle, United Kingdom",
  "Paris, France", "Marseille, France", "Lyon, France", "Toulouse, France",
  "Nice, France", "Nantes, France", "Montpellier, France", "Strasbourg, France",
  "Bordeaux, France", "Lille, France", "Rennes, France", "Reims, France",
  "Berlin, Germany", "Hamburg, Germany", "Munich, Germany", "Cologne, Germany",
  "Frankfurt, Germany", "Stuttgart, Germany", "Düsseldorf, Germany", "Dortmund, Germany",
  "Essen, Germany", "Leipzig, Germany", "Bremen, Germany", "Dresden, Germany",
  "Madrid, Spain", "Barcelona, Spain", "Valencia, Spain", "Seville, Spain",
  "Zaragoza, Spain", "Málaga, Spain", "Murcia, Spain", "Palma, Spain",
  "Las Palmas, Spain", "Bilbao, Spain", "Alicante, Spain", "Córdoba, Spain",
  "Rome, Italy", "Milan, Italy", "Naples, Italy", "Turin, Italy",
  "Palermo, Italy", "Genoa, Italy", "Bologna, Italy", "Florence, Italy",
  "Bari, Italy", "Catania, Italy", "Venice, Italy", "Verona, Italy",
  "Amsterdam, Netherlands", "Rotterdam, Netherlands", "The Hague, Netherlands",
  "Utrecht, Netherlands", "Eindhoven, Netherlands", "Tilburg, Netherlands",
  "Groningen, Netherlands", "Almere, Netherlands", "Breda, Netherlands",
  
  // Major Asian Cities
  "Tokyo, Japan", "Yokohama, Japan", "Osaka, Japan", "Nagoya, Japan",
  "Sapporo, Japan", "Fukuoka, Japan", "Kobe, Japan", "Kawasaki, Japan",
  "Kyoto, Japan", "Saitama, Japan", "Hiroshima, Japan", "Sendai, Japan",
  "Beijing, China", "Shanghai, China", "Guangzhou, China", "Shenzhen, China",
  "Tianjin, China", "Wuhan, China", "Dongguan, China", "Chengdu, China",
  "Nanjing, China", "Chongqing, China", "Xi'an, China", "Shenyang, China",
  "Hangzhou, China", "Jinan, China", "Harbin, China", "Kunming, China",
  "Seoul, Korea, South", "Busan, Korea, South", "Incheon, Korea, South",
  "Daegu, Korea, South", "Daejeon, Korea, South", "Gwangju, Korea, South",
  "Mumbai, India", "Delhi, India", "Bangalore, India", "Hyderabad, India",
  "Ahmedabad, India", "Chennai, India", "Kolkata, India", "Pune, India",
  "Jaipur, India", "Surat, India", "Lucknow, India", "Kanpur, India",
  "Singapore, Singapore", "Hong Kong, Hong Kong", "Taipei, Taiwan",
  "Bangkok, Thailand", "Jakarta, Indonesia", "Manila, Philippines",
  "Ho Chi Minh City, Vietnam", "Kuala Lumpur, Malaysia", "Hanoi, Vietnam",
  
  // Major Middle Eastern Cities
  "Dubai, United Arab Emirates", "Abu Dhabi, United Arab Emirates",
  "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Tehran, Iran",
  "Istanbul, Turkey", "Ankara, Turkey", "Tel Aviv, Israel",
  "Kuwait City, Kuwait", "Doha, Qatar", "Baghdad, Iraq",
  "Damascus, Syria", "Amman, Jordan", "Beirut, Lebanon",
  
  // Major Australian Cities
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia",
  "Perth, Australia", "Adelaide, Australia", "Gold Coast, Australia",
  "Newcastle, Australia", "Canberra, Australia", "Sunshine Coast, Australia",
  "Wollongong, Australia", "Geelong, Australia", "Hobart, Australia",
  "Townsville, Australia", "Cairns, Australia", "Darwin, Australia",
  "Auckland, New Zealand", "Wellington, New Zealand", "Christchurch, New Zealand",
  "Hamilton, New Zealand", "Tauranga, New Zealand", "Dunedin, New Zealand",
  
  // Major South American Cities
  "São Paulo, Brazil", "Rio de Janeiro, Brazil", "Salvador, Brazil",
  "Brasília, Brazil", "Fortaleza, Brazil", "Belo Horizonte, Brazil",
  "Manaus, Brazil", "Curitiba, Brazil", "Recife, Brazil", "Porto Alegre, Brazil",
  "Buenos Aires, Argentina", "Córdoba, Argentina", "Rosario, Argentina",
  "Mendoza, Argentina", "La Plata, Argentina", "San Miguel de Tucumán, Argentina",
  "Lima, Peru", "Santiago, Chile", "Bogotá, Colombia", "Medellín, Colombia",
  "Cali, Colombia", "Barranquilla, Colombia", "Caracas, Venezuela",
  "Montevideo, Uruguay", "Asunción, Paraguay", "La Paz, Bolivia",
  "Santa Cruz de la Sierra, Bolivia", "Quito, Ecuador", "Guayaquil, Ecuador",
  
  // Major African Cities
  "Lagos, Nigeria", "Cairo, Egypt", "Kinshasa, Congo (Kinshasa)",
  "Luanda, Angola", "Nairobi, Kenya", "Casablanca, Morocco",
  "Alexandria, Egypt", "Abidjan, Côte d'Ivoire", "Kano, Nigeria",
  "Ibadan, Nigeria", "Dakar, Senegal", "Addis Ababa, Ethiopia",
  "Cape Town, South Africa", "Durban, South Africa", "Johannesburg, South Africa",
  "Pretoria, South Africa", "Port Elizabeth, South Africa", "Bloemfontein, South Africa"
];

// Filter and validate top cities exist in our data
const validTopCities = topCities.filter(city => 
  allCities.some(c => c.toLowerCase() === city.toLowerCase())
);

// Create optimized TypeScript content
const optimizedContent = `// Optimized world cities for Jigz marketplace
// Fast loading with top ${validTopCities.length} cities + search functionality

export const topCities = [
  "All Cities",
${validTopCities.map(city => `  "${city}"`).join(',\n')}
];

export const citiesWithoutAll = topCities.filter(city => city !== "All Cities");

// All ${allCities.length} cities for search functionality (lazy loaded)
const allWorldCities = [
${allCities.map(city => `  "${city}"`).join(',\n')}
];

// Efficient search function that filters through all cities
export const searchCities = (searchTerm: string, limit: number = 50): string[] => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return topCities.slice(0, limit);
  }
  
  const term = searchTerm.toLowerCase().trim();
  const results = ["All Cities"];
  
  // First add matching top cities
  const topMatches = topCities
    .filter(city => city !== "All Cities" && city.toLowerCase().includes(term))
    .slice(0, 20);
  
  results.push(...topMatches);
  
  // Then add other matching cities if we need more results
  if (results.length < limit) {
    const otherMatches = allWorldCities
      .filter(city => 
        city.toLowerCase().includes(term) && 
        !topMatches.some(top => top.toLowerCase() === city.toLowerCase())
      )
      .slice(0, limit - results.length);
    
    results.push(...otherMatches);
  }
  
  return results.slice(0, limit);
};

// Legacy export for compatibility
export const worldCities = topCities;
export const filterCities = searchCities;
`;

// Write the optimized file
fs.writeFileSync(citiesPath, optimizedContent);

console.log(`✅ Optimized cities system created!`);
console.log(`📊 Top cities for fast loading: ${validTopCities.length}`);
console.log(`🔍 Total searchable cities: ${allCities.length}`);
console.log(`⚡ Performance: Instant loading + efficient search`);