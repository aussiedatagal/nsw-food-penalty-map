#!/usr/bin/env python3
"""
Parse scraped HTML files from NSW Food Authority penalty notices.

Finds all files matching the pattern www.foodauthority.nsw.gov.au/offences/penalty-notices/\d+
and extracts structured data into penalty_notices.json
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, Optional

from bs4 import BeautifulSoup


def find_penalty_notice_files(base_dir: str) -> list:
    """Find all penalty notice HTML files matching the pattern."""
    base_path = Path(base_dir)
    penalty_dir = base_path / "www.foodauthority.nsw.gov.au" / "offences" / "penalty-notices"
    
    if not penalty_dir.exists():
        print(f"Error: Directory {penalty_dir} does not exist")
        return []
    
    # Find all files that match the pattern (numeric filenames only)
    files = []
    for file_path in penalty_dir.iterdir():
        if file_path.is_file() and re.match(r'^\d+$', file_path.name):
            files.append(file_path)
    
    return sorted(files)


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


def parse_penalty_notice(file_path: Path) -> Optional[Dict]:
    """Parse a single penalty notice HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None
    
    soup = BeautifulSoup(content, 'lxml')
    
    # Extract penalty notice number
    penalty_notice_number = extract_text(
        soup, '.field--name-field-penalty-notice-number .field__item'
    )
    
    if not penalty_notice_number:
        print(f"Warning: Could not find penalty notice number in {file_path}")
        return None
    
    # Extract trade name (for the "name" field)
    trade_name = extract_text(
        soup, '.field--name-field-penalty-notice-trade .field__item'
    )
    
    # Extract party served (surname takes precedence over trade name)
    party_served_trade = extract_text(
        soup, '.field--name-field-penalty-notice-trade .field__item'
    )
    party_served_surname = extract_text(
        soup, '.field--name-field-penalty-notice-surname .field__item'
    )
    # Use surname if available, otherwise trade name
    party_served = party_served_surname or party_served_trade
    
    # Extract address fields
    street = extract_text(
        soup, '.field--name-field-penalty-notice-street .field__item'
    )
    
    # Get city and postal code
    city = extract_text(
        soup, '.field--name-field-penalty-notice-city .field__item'
    )
    
    # Try to get postal code from zip field first, otherwise use city as specified
    postal_code = extract_text(
        soup, '.field--name-field-penalty-notice-zip .field__item'
    )
    if not postal_code:
        # As per user instructions, use city field as postal_code if zip not found
        postal_code = city
    
    council = extract_text(
        soup, '.field--name-field-penalty-notice-council .field__item'
    )
    
    # Build full address
    address_parts = []
    if street:
        address_parts.append(street)
    if city:
        address_parts.append(city)
    if postal_code:
        address_parts.append(postal_code)
    full_address = ", ".join(address_parts) if address_parts else None
    
    # Extract dates
    date_of_offence = extract_datetime(
        soup, '.field--name-field-penalty-notice-date .field__item time'
    )
    date_issued = extract_datetime(
        soup, '.field--name-field-penalty-notice-issued-date .field__item time'
    )
    
    # Extract offence details
    offence_code = extract_text(
        soup, '.field--name-field-penalty-notice-code .field__item'
    )
    offence_description = extract_text(
        soup, '.field--name-field-penalty-notice-description .field__item'
    )
    offence_nature = extract_text(
        soup, '.field--name-field-penalty-notice-nature .field__item'
    )
    
    # Extract penalty amount
    penalty_amount = extract_text(
        soup, '.field--name-field-penalty-notice-amount .field__item'
    )
    
    # Extract issued by
    issued_by = extract_text(
        soup, '.field--name-field-penalty-notice-issued-by .field__item'
    )
    
    # Build the result dictionary
    result = {
        "penalty_notice_number": penalty_notice_number,
        "name": trade_name or "(NO TRADING NAME)",
        "address": {
            "street": street,
            "city": city,
            "postal_code": postal_code,
            "full": full_address,
            "lat": None,
            "lon": None
        },
        "council": council,
        "date_of_offence": date_of_offence,
        "offence_code": offence_code,
        "offence_description": offence_description,
        "offence_nature": offence_nature,
        "penalty_amount": penalty_amount,
        "party_served": party_served,
        "date_issued": date_issued,
        "issued_by": issued_by
    }
    
    return result


def compare_entries(existing: Dict, new: Dict) -> bool:
    """Compare two penalty notice entries to see if they're the same."""
    # Compare all fields except lat/lon (which may be added later)
    fields_to_compare = [
        "penalty_notice_number", "name", "council", "date_of_offence",
        "offence_code", "offence_description", "offence_nature",
        "penalty_amount", "party_served", "date_issued", "issued_by"
    ]
    
    for field in fields_to_compare:
        if existing.get(field) != new.get(field):
            return False
    
    # Compare address fields
    for field in ["street", "city", "postal_code", "full"]:
        if existing.get("address", {}).get(field) != new.get("address", {}).get(field):
            return False
    
    return True


def main():
    """Main function to parse all penalty notice files."""
    base_dir = Path(__file__).parent
    output_file = base_dir / "penalty_notices.json"
    
    # Load existing data if it exists
    existing_data = {}
    if output_file.exists():
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            print(f"Loaded {len(existing_data)} existing penalty notices")
        except Exception as e:
            print(f"Warning: Could not load existing data: {e}")
            existing_data = {}
    
    # Find all penalty notice files
    files = find_penalty_notice_files(str(base_dir))
    print(f"Found {len(files)} penalty notice files to process")
    
    if not files:
        print("No files found to process")
        return
    
    # Process each file
    processed = 0
    skipped = 0
    updated = 0
    errors = 0
    
    for file_path in files:
        result = parse_penalty_notice(file_path)
        
        if not result:
            errors += 1
            continue
        
        penalty_number = result["penalty_notice_number"]
        
        # Check if this penalty notice already exists
        if penalty_number in existing_data:
            # Compare with existing entry
            if compare_entries(existing_data[penalty_number], result):
                skipped += 1
                continue
            else:
                # Data differs - log it
                print(f"WARNING: Penalty notice {penalty_number} already exists but data differs!")
                print(f"  Existing: {json.dumps(existing_data[penalty_number], indent=2)}")
                print(f"  New: {json.dumps(result, indent=2)}")
                # Update with new data
                existing_data[penalty_number] = result
                updated += 1
        else:
            # New entry
            existing_data[penalty_number] = result
            processed += 1
    
    # Save the updated data
    print(f"\nSaving results to {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSummary:")
    print(f"  Processed: {processed} new entries")
    print(f"  Updated: {updated} entries (data differed)")
    print(f"  Skipped: {skipped} entries (already exists, same data)")
    print(f"  Errors: {errors} files")
    print(f"  Total: {len(existing_data)} penalty notices in output file")


if __name__ == "__main__":
    main()

