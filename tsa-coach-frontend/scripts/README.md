# Real Estate Data Preprocessing

This directory contains scripts to preprocess real estate data for optimal performance in the web application.

## Overview

Instead of geocoding and processing 2000+ addresses on every page load, we preprocess the data once and serve it as a fast-loading JSON file.

## Setup

### 1. Environment Variables

Set your Google Places API key:
```bash
export GOOGLE_PLACES_API_KEY=your_api_key_here
```

Or create a `.env.local` file:
```bash
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### 2. Input Data

Ensure your CSV file is located at:
```
public/real-estate.csv
```

## Running the Preprocessing

### Option 1: NPM Script (Recommended)
```bash
npm run preprocess-real-estate
```

### Option 2: Direct Node Command
```bash
GOOGLE_PLACES_API_KEY=your_key node scripts/preprocess-real-estate.js
```

## What the Script Does

1. **📖 Reads CSV** - Parses `public/real-estate.csv`
2. **🔍 Validates Data** - Filters out entries with insufficient information
3. **🌍 Geocodes Addresses** - Uses Google Geocoding API to get coordinates
4. **🖼️ Generates Images** - Creates Google Street View image URLs
5. **💾 Saves Results** - Outputs to `public/real-estate-processed.json`

## Output

The script generates `public/real-estate-processed.json` with:

```json
{
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "totalCount": 850,
  "sourceFile": "./public/real-estate.csv",
  "data": [
    {
      "id": "SA001",
      "name": "Austin Basketball Academy",
      "type": "Basketball",
      "coordinates": { "lat": 30.2672, "lng": -97.7431 },
      "images": [
        "https://maps.googleapis.com/maps/api/streetview?...",
        "/sports/basketball.png"
      ],
      // ... other properties
    }
  ]
}
```

## Performance Benefits

### Before Preprocessing:
- ❌ 2000+ API calls on every page load
- ❌ 30-60 second loading times
- ❌ Expensive API usage
- ❌ Rate limiting issues

### After Preprocessing:
- ✅ Single JSON file load (~2-5 seconds)
- ✅ Instant map rendering
- ✅ Minimal API usage
- ✅ Reliable performance

## Troubleshooting

### Common Issues

**"Google API key not found"**
```bash
# Solution: Set your API key
export GOOGLE_PLACES_API_KEY=your_key_here
```

**"Failed to geocode many addresses"**
- Check API key permissions (Geocoding API enabled)
- Verify billing is set up for your Google Cloud project
- Check rate limits

**"CSV file not found"**
```bash
# Ensure file exists at:
ls public/real-estate.csv
```

### Script Configuration

You can modify these settings in `preprocess-real-estate.js`:

```javascript
const BATCH_SIZE = 10;                    // Addresses per batch
const DELAY_BETWEEN_REQUESTS = 200;      // ms between requests
const DELAY_BETWEEN_BATCHES = 1000;      // ms between batches
```

## Updating Data

When your CSV file changes:

1. Update `public/real-estate.csv`
2. Run preprocessing: `npm run preprocess-real-estate`
3. Restart your development server: `npm run dev`

The web application will automatically use the new preprocessed data.

## API Requirements

### Google Cloud APIs Needed:
- **Geocoding API** - For address coordinates
- **Street View Static API** - For property images

### Estimated Costs:
- Geocoding: ~$5 per 1000 addresses
- Street View: ~$7 per 1000 images
- **Total: ~$12 for 1000 properties** (one-time cost)

## Development Workflow

```bash
# 1. Update CSV data
vim public/real-estate.csv

# 2. Preprocess data
npm run preprocess-real-estate

# 3. Start development server
npm run dev

# 4. View results at http://localhost:3000/coach/real-estate
```

Your map will now load instantly with real coordinates and images! 🚀 