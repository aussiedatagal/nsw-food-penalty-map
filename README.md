# NSW Food Penalty Notices

Interactive map visualization of food safety penalty notices issued by the NSW Food Authority. Filter by location, date, offence type, and penalty amount.

**Live Site**: [View on GitHub Pages](https://aussiedatagal.github.io/nsw-food-penalty-map/)

![NSW Food Penalty Notices Screenshot](screenshot.png)

## Features

- Interactive map with Leaflet and OpenStreetMap
- Filter by date range, penalty amount, offence code, and council area
- Location grouping with color-coded markers showing frequency
- Responsive design for desktop and mobile
- Click any location to view all penalty notices for that business

## Data Source

The data is extracted from publicly available penalty notices published by the [NSW Food Authority](https://www.foodauthority.nsw.gov.au/offences/penalty-notices). The data includes:

- Business name and address
- Date of offence and date issued
- Offence code and description
- Penalty amount
- Council area
- Geocoded coordinates

## Project Structure

```
food_penalties/
├── frontend/              # React + Vite frontend application
│   ├── src/              # React components and utilities
│   ├── public/           # Static assets and data files
│   └── dist/             # Build output (for GitHub Pages)
├── 1_parse_scrape.py     # Extract data from HTML files
├── 2_geocode.py          # Geocode addresses using OpenStreetMap
├── 3_group_locations.py  # Group penalties by business location
└── penalty_notices.json  # Processed penalty notice data
```

## Setup

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aussiedatagal/nsw-food-penalty-map.git
cd food_penalties
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Development

Run the development server:
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the frontend for production:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

### GitHub Pages Deployment

This repository is configured for automatic deployment to GitHub Pages using GitHub Actions.

1. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Under "Source", select "GitHub Actions"

2. Update base path (if needed):
   - If your repository name differs from `food_penalties`, update the `base` path in `frontend/vite.config.js`
   - Base path should match your repository name: `base: '/your-repo-name/'`

3. Automatic deployment:
   - The GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys on push to `main`
   - Site available at `https://yourusername.github.io/nsw-food-penalty-map/`

## Data Processing Pipeline

1. **Extract** (`1_parse_scrape.py`): Extract structured data from HTML files
2. **Geocode** (`2_geocode.py`): Add latitude/longitude coordinates using OpenStreetMap Nominatim API
3. **Group** (`3_group_locations.py`): Group multiple penalty notices by business location

## Technologies Used

### Frontend
- React 19
- Vite
- Leaflet
- React Leaflet

### Data Processing
- Python 3
- BeautifulSoup4
- geopy

### Data Sources
- NSW Food Authority
- OpenStreetMap Nominatim
- OpenStreetMap

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Attribution

- Data source: [NSW Food Authority](https://www.foodauthority.nsw.gov.au/offences/penalty-notices)
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Geocoding: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)

## Contact

For questions or feedback:
- Email: tkl9tlfno@mozmail.com
- GitHub: [@aussiedatagal](https://github.com/aussiedatagal)
- Projects: [aussiedatagal.github.io](https://aussiedatagal.github.io)

## Disclaimer

This project is for informational purposes only. Data is sourced from publicly available information published by the NSW Food Authority.

