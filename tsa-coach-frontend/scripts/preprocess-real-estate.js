#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const CSV_FILE_PATH = './public/real-estate.csv';
const OUTPUT_FILE_PATH = './public/real-estate-processed.json';
const IMAGES_DIR = './public/images/real-estate';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const BATCH_SIZE = 10;
const DELAY_BETWEEN_REQUESTS = 200; // ms
const DELAY_BETWEEN_BATCHES = 1000; // ms

// Utility function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to create images directory if it doesn't exist
function ensureImagesDirectory() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`📁 Created images directory: ${IMAGES_DIR}`);
  }
}

// Function to download and save image
async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const imagePath = path.join(IMAGES_DIR, filename);
    
    fs.writeFileSync(imagePath, Buffer.from(buffer));
    console.log(`📸 Downloaded: ${filename}`);
    return `/images/real-estate/${filename}`;
    
  } catch (error) {
    console.error(`❌ Failed to download image: ${filename}`, error.message);
    return null;
  }
}

// Function to generate a safe filename from academy name
function generateImageFilename(academyName, index) {
  // Remove special characters and spaces, replace with hyphens
  const safeName = academyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50); // Limit length
    
  return `${String(index + 1).padStart(3, '0')}-${safeName}.jpg`;
}

// Function to parse CSV content
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Add the last value
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Function to get coordinates using Google Geocoding API
async function getCoordinatesFromAddress(address) {
  if (!GOOGLE_API_KEY) {
    console.warn('Google API key not found');
    return null;
  }
  
  const cleanAddress = address?.trim();
  if (!cleanAddress || cleanAddress.length < 5) {
    console.warn('Address is empty or too short:', address);
    return null;
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'ZERO_RESULTS') {
      console.warn('No results found for address:', cleanAddress);
      return null;
    }
    
    if (data.status !== 'OK') {
      console.warn('Geocoding API error:', data.status, data.error_message);
      return null;
    }
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting coordinates for address:', cleanAddress, error);
    return null;
  }
}

// Function to download Google Street View image
async function downloadStreetViewImage(address, filename) {
  if (!GOOGLE_API_KEY) {
    return null;
  }
  
  const cleanAddress = address?.trim();
  if (!cleanAddress || cleanAddress.length < 5) {
    return null;
  }
  
  const baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
  const params = new URLSearchParams({
    size: '800x600', // Higher resolution for better quality
    location: cleanAddress,
    heading: '0',
    pitch: '0',
    fov: '90',
    key: GOOGLE_API_KEY
  });
  
  const imageUrl = `${baseUrl}?${params.toString()}`;
  return await downloadImage(imageUrl, filename);
}

// Function to get sport-specific fallback image
function getSportFallbackImage(sportType) {
  const sportImages = {
    'Baseball': '/sports/baseball.png',
    'Basketball': '/sports/basketball.png',
    'Soccer': '/sports/soccer.png',
    'Tennis': '/sports/basketball.png', // Fallback to basketball since no tennis image
    'Gymnastics': '/sports/gymnastics.png',
    'Dancing': '/sports/gymnastics.png', // Fallback to gymnastics since no dancing image
    'Volleyball': '/sports/basketball.png', // Fallback to basketball since no volleyball image
    'Football': '/sports/soccer.png', // Fallback to soccer since no football image
    'Running': '/sports/basketball.png', // Fallback to basketball since no running image
    'Fencing': '/sports/fencing-gym.png'
  };
  
  const sportKey = Object.keys(sportImages).find(key => 
    sportType.toLowerCase().includes(key.toLowerCase())
  );
  
  return sportKey ? sportImages[sportKey] : '/placeholder-school.jpg';
}

// Function to validate and clean CSV row
function validateCSVRow(csvRow) {
  const academyName = csvRow['Sports Academy Name']?.trim();
  const address = csvRow['Address']?.trim();
  const city = csvRow['City']?.trim();
  const sports = csvRow['Sports']?.trim();
  
  // Skip entries with insufficient data
  if (!academyName || academyName === 'N/A' || !sports || !city) {
    return null;
  }
  
  // Must have either address or city
  if (!address && !city) {
    return null;
  }
  
  return {
    name: academyName,
    address: address || '',
    city: city || '',
    sports: sports,
    phone: csvRow['Phone Number']?.trim() || '',
    website: csvRow['website']?.trim() || '',
    email: csvRow['Email']?.trim() || '',
    zoningRestrictions: csvRow['Zoning Restrictions']?.trim() || '',
    notes: csvRow['Notes']?.trim() || ''
  };
}

// Function to transform validated row to final format
async function transformToFinalFormat(validatedRow, index, coordinates) {
  const sports = validatedRow.sports;
  const phone = validatedRow.phone;
  const website = validatedRow.website;
  const address = validatedRow.address;
  
  // Generate price based on sport type
  const priceRanges = {
    'Baseball': ['$2,400/mo', '$2,800/mo', '$3,200/mo'],
    'Basketball': ['$2,600/mo', '$3,000/mo', '$3,400/mo'],
    'Soccer': ['$2,200/mo', '$2,600/mo', '$3,000/mo'],
    'Tennis': ['$3,000/mo', '$3,400/mo', '$3,800/mo'],
    'Gymnastics': ['$2,800/mo', '$3,200/mo', '$3,600/mo'],
    'Dancing': ['$2,400/mo', '$2,800/mo', '$3,200/mo'],
    'Volleyball': ['$2,600/mo', '$3,000/mo', '$3,400/mo'],
    'Football': ['$3,200/mo', '$3,600/mo', '$4,000/mo'],
    'Running': ['$2,000/mo', '$2,400/mo', '$2,800/mo'],
    'Fencing': ['$3,400/mo', '$3,800/mo', '$4,200/mo']
  };
  
  const sportKey = Object.keys(priceRanges).find(key => sports.toLowerCase().includes(key.toLowerCase()));
  const prices = sportKey ? priceRanges[sportKey] : ['$2,500/mo', '$3,000/mo', '$3,500/mo'];
  const price = prices[index % prices.length];
  
  // Generate square footage
  const sqftOptions = ['2,000 sq ft', '2,400 sq ft', '2,800 sq ft', '3,200 sq ft', '3,600 sq ft', '4,000 sq ft'];
  const sqft = sqftOptions[index % sqftOptions.length];
  
  // Generate amenities based on sport
  const sportAmenities = {
    'Baseball': ['Batting Cages', 'Pitching Mounds', 'Training Field', 'Equipment Storage'],
    'Basketball': ['Courts', 'Shooting Machines', 'Weight Room', 'Locker Rooms'],
    'Soccer': ['Training Field', 'Goal Posts', 'Equipment Storage', 'Viewing Area'],
    'Tennis': ['Courts', 'Practice Wall', 'Pro Shop', 'Clubhouse'],
    'Gymnastics': ['Mats', 'Balance Beams', 'Parallel Bars', 'Spring Floor'],
    'Dancing': ['Mirrors', 'Ballet Bars', 'Sound System', 'Changing Rooms'],
    'Volleyball': ['Courts', 'Net Systems', 'Training Equipment', 'Seating Area'],
    'Football': ['Training Field', 'Equipment Room', 'Weight Room', 'Medical Facility'],
    'Running': ['Track', 'Training Equipment', 'Timing Systems', 'Warm-up Area'],
    'Fencing': ['Pistes', 'Equipment Storage', 'Electrical Scoring', 'Armory']
  };
  
  const amenities = sportKey ? sportAmenities[sportKey] : ['Training Area', 'Equipment', 'Facilities', 'Parking'];
  
  // Download images
  const images = [];
  const fallbackImage = getSportFallbackImage(sports);
  
  if (address) {
    const filename = generateImageFilename(validatedRow.name, index);
    console.log(`📸 Downloading Street View for: ${validatedRow.name}`);
    
    const downloadedImage = await downloadStreetViewImage(address, filename);
    if (downloadedImage) {
      images.push(downloadedImage);
    }
  }
  
  // Always add fallback image
  images.push(fallbackImage);
  
  return {
    id: `SA${String(index + 1).padStart(3, '0')}`,
    name: validatedRow.name,
    type: sports,
    grades: 'All Ages',
    enrollment: Math.floor(Math.random() * 150) + 50,
    rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
    reviews: Math.floor(Math.random() * 80) + 20,
    address: address || `${validatedRow.city}, TX`,
    city: validatedRow.city,
    state: 'TX',
    zip: '',
    coordinates: coordinates,
    price: price,
    sqft: sqft,
    phone: phone.startsWith('+1') ? phone : (phone.startsWith('(') ? phone : `+1 ${phone}`),
    website: website.startsWith('http') ? website : (website ? `https://${website}` : ''),
    images: images,
    amenities: amenities,
    description: `Professional ${sports.toLowerCase()} training facility with state-of-the-art equipment and experienced coaches.`,
    availability: index % 3 === 0 ? 'Available Now' : (index % 3 === 1 ? 'Available Next Month' : 'Contact for Availability'),
    featured: index % 5 === 0,
    saved: false
  };
}

// Main processing function
async function processRealEstateData() {
  console.log('🚀 Starting real estate data preprocessing...');
  
  // Check if API key is available
  if (!GOOGLE_API_KEY) {
    console.error('❌ NEXT_PUBLIC_GOOGLE_PLACES_API_KEY environment variable not found');
    console.log('Please set your Google API key:');
    console.log('export NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  // Ensure images directory exists
  ensureImagesDirectory();
  
  // Read and parse CSV file
  console.log('📖 Reading CSV file...');
  let csvData;
  try {
    const csvText = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    csvData = parseCSV(csvText);
    console.log(`✅ Parsed ${csvData.length} rows from CSV`);
  } catch (error) {
    console.error('❌ Error reading CSV file:', error);
    process.exit(1);
  }
  
  // Validate and clean data
  console.log('🔍 Validating and cleaning data...');
  const validatedData = [];
  csvData.forEach((row, index) => {
    const validated = validateCSVRow(row);
    if (validated) {
      validatedData.push(validated);
    } else {
      console.log(`⚠️  Skipping row ${index + 1}: insufficient data`);
    }
  });
  
  console.log(`✅ ${validatedData.length} valid entries after cleaning`);
  
  // Process coordinates and images in batches
  console.log('🌍 Geocoding addresses and downloading images...');
  const processedData = [];
  let successCount = 0;
  let failCount = 0;
  let imageCount = 0;
  
  for (let i = 0; i < validatedData.length; i += BATCH_SIZE) {
    const batch = validatedData.slice(i, i + BATCH_SIZE);
    
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validatedData.length / BATCH_SIZE)}`);
    
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      
      // Add delay between requests
      if (j > 0) {
        await delay(DELAY_BETWEEN_REQUESTS);
      }
      
      const coordinates = await getCoordinatesFromAddress(row.address || row.city);
      
      if (coordinates) {
        successCount++;
        const finalData = await transformToFinalFormat(row, processedData.length, coordinates);
        
        // Count downloaded images
        if (finalData.images.some(img => img.includes('/images/real-estate/'))) {
          imageCount++;
        }
        
        processedData.push(finalData);
      } else {
        failCount++;
        console.log(`❌ Failed to geocode: ${row.name} (${row.address || row.city})`);
      }
    }
    
    // Delay between batches
    if (i + BATCH_SIZE < validatedData.length) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log(`\n📊 Processing Results:`);
  console.log(`   ✅ Successfully geocoded: ${successCount}`);
  console.log(`   ❌ Failed to geocode: ${failCount}`);
  console.log(`   📍 Total locations with coordinates: ${processedData.length}`);
  console.log(`   📸 Downloaded Street View images: ${imageCount}`);
  
  // Save processed data to JSON file
  console.log('\n💾 Saving processed data...');
  try {
    const outputData = {
      generatedAt: new Date().toISOString(),
      totalCount: processedData.length,
      sourceFile: CSV_FILE_PATH,
      imagesDownloaded: imageCount,
      data: processedData
    };
    
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(outputData, null, 2));
    console.log(`✅ Saved processed data to ${OUTPUT_FILE_PATH}`);
    console.log(`📦 JSON file size: ${(fs.statSync(OUTPUT_FILE_PATH).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Calculate total images directory size
    const imageFiles = fs.readdirSync(IMAGES_DIR);
    const totalImageSize = imageFiles.reduce((total, file) => {
      const filePath = path.join(IMAGES_DIR, file);
      return total + fs.statSync(filePath).size;
    }, 0);
    
    console.log(`📸 Images directory size: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB (${imageFiles.length} files)`);
    
  } catch (error) {
    console.error('❌ Error saving processed data:', error);
    process.exit(1);
  }
  
  console.log('\n🎉 Preprocessing complete!');
  console.log('✅ Benefits:');
  console.log('   • No API keys exposed in frontend');
  console.log('   • No ongoing Street View API costs');
  console.log('   • Faster image loading from local files');
  console.log('   • Offline image availability');
  console.log('\nYou can now use the processed data in your application.');
}

// Run the script
if (require.main === module) {
  processRealEstateData().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { processRealEstateData }; 