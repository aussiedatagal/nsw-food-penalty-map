#!/usr/bin/env python3
"""
Step 0: Download weekly penalty notices from NSW Food Authority.

This script:
- Downloads the weekly penalty notices page
- Extracts links to individual penalty notices
- Downloads and parses each notice
- Adds new notices to penalty_notices.json (or updates existing ones)
"""

import json
import re
import time
import argparse
from pathlib import Path
from typing import Dict, Optional

import requests
from bs4 import BeautifulSoup


# Constants
WEEKLY_URL = "https://www.foodauthority.nsw.gov.au/offences/penalty-notices/week"
BASE_URL = "https://www.foodauthority.nsw.gov.au"
RATE_LIMIT_DELAY = 1.2


# Parsing functions (reused from 1_parse_scrape.py logic)
def extract_text(soup: BeautifulSoup, selector: str) -> Optional[str]:
    """Extract text from a CSS selector, returning None if not found."""
    element = soup.select_one(selector)
    if element:
        return element.get_text(strip=True)
    return None


def extract_datetime(soup: BeautifulSoup, selector: str) -> Optional[str]:
    """Extract datetime attribute from a time element."""
    element = soup.select_one(selector)
    if element and element.name == 'time':
        return element.get('datetime')
    return None


def parse_penalty_notice_from_html(html_content: str, url: str = "") -> Optional[Dict]:
    """Parse a single penalty notice HTML content."""
    soup = BeautifulSoup(html_content, 'lxml')
    
    penalty_notice_number = extract_text(
        soup, '.field--name-field-penalty-notice-number .field__item'
    )
    
    if not penalty_notice_number:
        print(f"Warning: Could not find penalty notice number in {url}")
        return None
    
    trade_name = extract_text(
        soup, '.field--name-field-penalty-notice-trade .field__item'
    )
    
    party_served_trade = extract_text(
        soup, '.field--name-field-penalty-notice-trade .field__item'
    )
    party_served_surname = extract_text(
        soup, '.field--name-field-penalty-notice-surname .field__item'
    )
    party_served = party_served_surname or party_served_trade
    
    street = extract_text(
        soup, '.field--name-field-penalty-notice-street .field__item'
    )
    
    city = extract_text(
        soup, '.field--name-field-penalty-notice-city .field__item'
    )
    
    postal_code = extract_text(
        soup, '.field--name-field-penalty-notice-zip .field__item'
    )
    if not postal_code:
        postal_code = city
    
    council = extract_text(
        soup, '.field--name-field-penalty-notice-council .field__item'
    )
    
    address_parts = []
    if street:
        address_parts.append(street)
    if city:
        address_parts.append(city)
    if postal_code:
        address_parts.append(postal_code)
    full_address = ", ".join(address_parts) if address_parts else None
    
    date_of_offence = extract_datetime(
        soup, '.field--name-field-penalty-notice-date .field__item time'
    )
    date_issued = extract_datetime(
        soup, '.field--name-field-penalty-notice-issued-date .field__item time'
    )
    
    offence_code = extract_text(
        soup, '.field--name-field-penalty-notice-code .field__item'
    )
    offence_description = extract_text(
        soup, '.field--name-field-penalty-notice-description .field__item'
    )
    offence_nature = extract_text(
        soup, '.field--name-field-penalty-notice-nature .field__item'
    )
    
    penalty_amount = extract_text(
        soup, '.field--name-field-penalty-notice-amount .field__item'
    )
    
    issued_by = extract_text(
        soup, '.field--name-field-penalty-notice-issued-by .field__item'
    )
    
    result = {
        "type": "penalty_notice",
        "penalty_notice_number": penalty_notice_number,
        "name": trade_name or "(NO TRADING NAME)",
        "address": {
            "street": street,
            "city": city,
            "postal_code": postal_code,
            "full": full_address,
            "lat": None,
            "lon": None,
        },
        "council": council,
        "date_of_offence": date_of_offence,
        "offence_code": offence_code,
        "offence_description": offence_description,
        "offence_nature": offence_nature,
        "penalty_amount": penalty_amount or "",
        "party_served": party_served,
        "date_issued": date_issued,
        "issued_by": issued_by,
    }
    
    return result


def compare_entries(existing: Dict, new: Dict) -> bool:
    """Compare two penalty notice entries to see if they're the same."""
    fields_to_compare = [
        "penalty_notice_number", "name", "council", "date_of_offence",
        "offence_code", "offence_description", "offence_nature",
        "penalty_amount", "party_served", "date_issued", "issued_by"
    ]
    
    for field in fields_to_compare:
        if existing.get(field) != new.get(field):
            return False
    
    for field in ["street", "city", "postal_code", "full"]:
        if existing.get("address", {}).get(field) != new.get("address", {}).get(field):
            return False
    
    return True


def download_weekly_notices() -> list:
    """Download the weekly page and extract links to individual penalty notices."""
    print(f"Downloading weekly page: {WEEKLY_URL}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(WEEKLY_URL, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error downloading weekly page: {e}")
        return []
    
    soup = BeautifulSoup(response.text, 'lxml')
    
    # Find all links to penalty notices
    notice_links = []
    
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        # Match penalty notice URLs
        match = re.search(r'/offences/penalty-notices/(\d+)', href)
        if match:
            notice_id = match.group(1)
            # Convert relative URLs to absolute
            if href.startswith('/'):
                full_url = BASE_URL + href
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = BASE_URL + '/' + href.lstrip('/')
            
            if full_url not in notice_links:
                notice_links.append(full_url)
    
    print(f"Found {len(notice_links)} penalty notice links")
    return notice_links


def download_and_parse_notice(url: str) -> Optional[Dict]:
    """Download and parse a single penalty notice."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        time.sleep(RATE_LIMIT_DELAY)  # Rate limiting
        return parse_penalty_notice_from_html(response.text, url)
    except requests.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return None
    except Exception as e:
        print(f"Error parsing {url}: {e}")
        return None


def main():
    """Main function to download and update penalty notices."""
    parser = argparse.ArgumentParser(description='Download weekly penalty notices')
    parser.add_argument('--test', action='store_true', help='Test mode: only download and show links, do not process')
    parser.add_argument('--limit', type=int, help='Limit the number of notices to process (for testing)')
    args = parser.parse_args()
    
    base_dir = Path(__file__).parent
    penalty_notices_file = base_dir / "penalty_notices.json"
    
    # Load existing data
    existing_notices = {}
    if penalty_notices_file.exists():
        try:
            with open(penalty_notices_file, 'r', encoding='utf-8') as f:
                existing_notices = json.load(f)
            print(f"Loaded {len(existing_notices)} existing penalty notices")
        except Exception as e:
            print(f"Warning: Could not load existing data: {e}")
            existing_notices = {}
    
    # Download weekly notices
    print("\n" + "="*60)
    print("Downloading weekly penalty notices")
    print("="*60)
    notice_urls = download_weekly_notices()
    
    if not notice_urls:
        print("No penalty notices found. Exiting.")
        return
    
    if args.test:
        print(f"\nTest mode: Found {len(notice_urls)} penalty notice links")
        print("First 5 links:")
        for url in notice_urls[:5]:
            print(f"  - {url}")
        print("\nExiting test mode. Run without --test to process notices.")
        return
    
    # Limit notices if requested (for testing)
    if args.limit:
        notice_urls = notice_urls[:args.limit]
        print(f"\nLimited to processing {len(notice_urls)} notices (--limit={args.limit})")
    
    # Download and parse each notice
    print(f"\nDownloading and parsing {len(notice_urls)} penalty notices...")
    new_notices = {}
    new_notice_ids = []
    skipped_count = 0
    updated_count = 0
    error_count = 0
    
    for idx, url in enumerate(notice_urls, 1):
        print(f"[{idx}/{len(notice_urls)}] Processing: {url}")
        notice = download_and_parse_notice(url)
        
        if not notice:
            error_count += 1
            continue
        
        notice_id = notice["penalty_notice_number"]
        
        if notice_id in existing_notices:
            if compare_entries(existing_notices[notice_id], notice):
                skipped_count += 1
                print(f"  Skipped: Already exists with same data")
            else:
                print(f"  WARNING: Notice {notice_id} already exists but data differs!")
                print(f"  Updating with new data...")
                existing_notices[notice_id] = notice
                updated_count += 1
        else:
            existing_notices[notice_id] = notice
            new_notices[notice_id] = notice
            new_notice_ids.append(notice_id)
            print(f"  Added new notice: {notice_id}")
    
    print(f"\nDownload summary:")
    print(f"  New notices: {len(new_notices)}")
    print(f"  Updated notices: {updated_count}")
    print(f"  Skipped (already exists): {skipped_count}")
    print(f"  Errors: {error_count}")
    
    if not new_notice_ids and updated_count == 0:
        print("\nNo new or updated notices. Exiting.")
        return
    
    # Save updated penalty notices
    print(f"\nSaving updated penalty notices to {penalty_notices_file}...")
    with open(penalty_notices_file, 'w', encoding='utf-8') as f:
        json.dump(existing_notices, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("DOWNLOAD SUMMARY")
    print("="*60)
    print(f"Total penalty notices: {len(existing_notices)}")
    print(f"New notices added: {len(new_notices)}")
    print(f"Updated notices: {updated_count}")
    print("="*60)
    print("\nNext steps:")
    print("  1. Run: python3 2_geocode.py (to geocode new addresses)")
    print("  2. Run: python3 3_group_locations.py (to update grouped locations)")


if __name__ == "__main__":
    main()

