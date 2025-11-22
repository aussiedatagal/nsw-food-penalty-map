# NSW Food Penalty Notices

An interactive map visualization of food safety penalty notices issued by the NSW Food Authority. Explore penalty notices by location, date, offence type, and penalty amount.

🔗 **Live Site**: [View on GitHub Pages](https://aussiedatagal.github.io/food_penalties/)

![NSW Food Penalty Notices Screenshot](screenshot.png)

## Features

- 🗺️ **Interactive Map**: Visualize penalty notices on an interactive map powered by Leaflet and OpenStreetMap
- 🔍 **Advanced Filtering**: Filter by date range, penalty amount, offence code, and council area
- 📊 **Location Grouping**: Penalties are grouped by location with color-coded markers indicating frequency
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔗 **Detailed Information**: Click on any location to see all penalty notices for that business

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
├── extract_penalty_notices.py    # Extract data from HTML files
├── normalize_penalty_notices.py  # Normalize and clean data
├── geocode_addresses.py          # Geocode addresses using OpenStreetMap
├── group_by_shop.py              # Group penalties by business location
├── fix_postcodes.py              # Fix and normalize postcodes
└── penalty_notices.json          # Processed penalty notice data
```

## Setup

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aussiedatagal/food_penalties.git
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

1. **Enable GitHub Pages**:
   - Go to your repository Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Update Base Path** (if needed):
   - If your repository name is different from `food_penalties`, update the `base` path in `frontend/vite.config.js`
   - The base path should match your repository name: `base: '/your-repo-name/'`

3. **Automatic Deployment**:
   - The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically build and deploy the site when you push to the `main` branch
   - The site will be available at `https://yourusername.github.io/food_penalties/`

## Data Processing Pipeline

The data processing involves several steps:

1. **Extract** (`extract_penalty_notices.py`): Extract structured data from HTML files downloaded from the NSW Food Authority website
2. **Normalize** (`normalize_penalty_notices.py`): Normalize shop names, addresses, and coordinates to handle inconsistencies
3. **Geocode** (`geocode_addresses.py`): Add latitude/longitude coordinates using OpenStreetMap Nominatim API
4. **Group** (`group_by_shop.py`): Group multiple penalty notices by business location
5. **Fix Postcodes** (`fix_postcodes.py`): Clean and normalize postcode data

## Technologies Used

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **React Leaflet** - React bindings for Leaflet

### Backend/Data Processing
- **Python 3** - Data processing scripts
- **BeautifulSoup4** - HTML parsing
- **Requests** - HTTP requests for geocoding

### Data Sources
- **NSW Food Authority** - Penalty notice data
- **OpenStreetMap Nominatim** - Geocoding service
- **OpenStreetMap** - Map tiles

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Attribution

- Data source: [NSW Food Authority](https://www.foodauthority.nsw.gov.au/offences/penalty-notices)
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Geocoding: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)

## Contact

For questions or feedback, please contact:
- Email: tkl9tlfno@mozmail.com
- GitHub: [@aussiedatagal](https://github.com/aussiedatagal)
- Other Projects: [aussiedatagal.github.io](https://github.com/aussiedatagal/aussiedatagal.github.io)

## Disclaimer

This project is for informational purposes only. The data is sourced from publicly available information published by the NSW Food Authority. While every effort has been made to ensure accuracy, users should verify information independently if needed for official purposes.

