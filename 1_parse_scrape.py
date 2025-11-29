#!/usr/bin/env python3
"""
Parse scraped HTML files from NSW Food Authority offence pages.

This script:
- Parses penalty notices from www.foodauthority.nsw.gov.au/offences/penalty-notices/<id>
- Parses prosecutions from www.foodauthority.nsw.gov.au/offences/prosecutions/<slug>
- Normalises both into a single JSON file (penalty_notices.json) that the rest
  of the pipeline (geocoding, grouping, frontend) can consume.

Prosecutions are treated as more severe penalty notices and share the same
core fields (name, address, dates, penalty_amount, etc) with some extra
metadata.
"""

import json
import os
import re
import sys
from datetime import datetime
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


def find_prosecution_files(base_dir: str) -> list:
    """Find all prosecution HTML files."""
    base_path = Path(base_dir)
    prosecutions_dir = base_path / "www.foodauthority.nsw.gov.au" / "offences" / "prosecutions"

    if not prosecutions_dir.exists():
        print(f"Warning: Directory {prosecutions_dir} does not exist - no prosecutions will be parsed")
        return []

    files = []
    for file_path in prosecutions_dir.iterdir():
        # Prosecution pages are slug-based (e.g. pizza-hut-cambridge-gardens), so just take all files
        if file_path.is_file():
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


def extract_html_text(soup: BeautifulSoup, selector: str) -> Optional[str]:
    """
    Extract text from a selector, preserving line breaks from <br> tags,
    list structure, and paragraph breaks.
    """
    element = soup.select_one(selector)
    if not element:
        return None
    
    # Create a copy to avoid modifying the original
    element_copy = BeautifulSoup(str(element), "lxml")
    
    # Replace <br> and <br/> tags with newlines
    for br in element_copy.find_all("br"):
        br.replace_with("\n")
    
    # Replace <p> tags with newlines before and after
    for p in element_copy.find_all("p"):
        p.insert_before("\n")
        p.insert_after("\n")
    
    # Replace <li> tags with newlines and add numbering/bullets
    # Process each list separately to get correct numbering
    for list_tag in element_copy.find_all(["ol", "ul"]):
        list_items = list_tag.find_all("li", recursive=False)  # Only direct children
        for idx, li in enumerate(list_items, start=1):
            li.insert_before("\n")
            if list_tag.name == "ol":
                # Numbered list items for ordered lists
                prefix = f"{idx}. "
            else:
                # Bullet points for unordered lists
                prefix = "• "
            
            # Prepend the prefix to the list item content
            if li.string:
                li.string = prefix + li.string
            else:
                # If the li has nested elements, prepend prefix as text
                li.insert(0, prefix)
    
    # Replace <ol> and <ul> tags with newlines
    for list_tag in element_copy.find_all(["ol", "ul"]):
        list_tag.insert_before("\n")
        list_tag.insert_after("\n")
    
    # Get the text with preserved newlines
    text = element_copy.get_text()
    
    # Normalise multiple consecutive newlines to at most two
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Normalise multiple spaces to single space (but preserve newlines)
    text = re.sub(r"[ \t]+", " ", text)
    # Remove spaces at the start/end of lines
    text = "\n".join(line.strip() for line in text.split("\n"))
    # Remove leading/trailing newlines
    text = text.strip()
    
    return text or None


def parse_date_text(date_str: Optional[str]) -> Optional[str]:
    """
    Parse a human-readable date like '18 September 2023' to ISO format used elsewhere.

    Returns ISO string with time set to noon UTC (to match the other dates), or None.
    """
    if not date_str:
        return None

    cleaned = re.sub(r"\s+", " ", date_str).strip()
    # Some dates might have prefixes like 'On 18 September 2023' – strip leading words
    match = re.search(r"(\d{1,2}\s+[A-Za-z]+\s+\d{4})", cleaned)
    if not match:
        return None

    date_part = match.group(1)
    try:
        dt = datetime.strptime(date_part, "%d %B %Y")
        # Keep the same convention as other dates (12:00:00Z)
        return dt.strftime("%Y-%m-%dT12:00:00Z")
    except ValueError:
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
    
    penalty_notice_number = extract_text(
        soup, '.field--name-field-penalty-notice-number .field__item'
    )
    
    if not penalty_notice_number:
        print(f"Warning: Could not find penalty notice number in {file_path}")
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


def parse_prosecution_notice(file_path: Path) -> Optional[Dict]:
    """Parse a single prosecution HTML file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

    soup = BeautifulSoup(content, "lxml")

    prosecution_id: Optional[str] = None
    shortlink = soup.select_one('link[rel="shortlink"]')
    if shortlink and shortlink.get("href"):
        node_match = re.search(r"/node/(\d+)", shortlink["href"])
        if node_match:
            prosecution_id = f"prosecution-{node_match.group(1)}"

    if not prosecution_id:
        prosecution_id = f"prosecution-{file_path.name}"

    trade_name = extract_text(
        soup, ".field--name-field-prosecution-notice-trade .field__item"
    )
    name_of_convicted = extract_text(
        soup, ".field--name-field-prosecution-notice-name .field__item"
    )

    council = extract_text(
        soup, ".field--name-field-prosecution-notice-council .field__item"
    )
    date_of_decision = extract_datetime(
        soup, ".field--name-field-prosecution-notice-date .field__item time"
    )
    court = extract_text(
        soup, ".field--name-field-prosecution-notice-court .field__item"
    )
    brought_by = extract_text(
        soup, ".field--name-field-prosecution-notice-brought .field__item"
    )

    address_element = soup.select_one(
        ".field--name-field-prosecution-notice-address .field__item"
    )
    street = None
    city = None
    full_address = None
    if address_element:
        lines = [line.strip() for line in address_element.stripped_strings if line.strip()]
        if lines:
            street = lines[0]
            if len(lines) > 1:
                city = lines[1]
            full_parts = [part for part in [street, city] if part]
            full_address = ", ".join(full_parts) if full_parts else None

    date_of_offence_text = extract_html_text(
        soup, ".field--name-field-prosecution-notice-offence .field__item"
    )
    date_of_offence = parse_date_text(date_of_offence_text)

    offence_nature = extract_html_text(
        soup, ".field--name-field-prosecution-notice-nature .field__item"
    )

    decision_text = extract_html_text(
        soup, ".field--name-field-prosecution-notice-desc .field__item"
    )
    offence_description = (
        f"Prosecution: {decision_text}" if decision_text else "Prosecution"
    )

    penalty_text = extract_html_text(
        soup, ".field--name-field-prosecution-notice-penalty .field__item"
    )
    penalty_amount = penalty_text or ""
    if penalty_text:
        total_match = re.search(
            r"Total penalty:\s*\$?([0-9][0-9,]*(?:\.[0-9]{2})?)",
            penalty_text,
            flags=re.IGNORECASE,
        )
        if total_match:
            amount_str = total_match.group(1)
            penalty_amount = f"${amount_str}"

    decision_details = extract_html_text(
        soup, ".field--name-field-prosecution-notice-details .field__item"
    )
    usual_place = extract_html_text(
        soup, ".field--name-field-prosecution-notice-place .field__item"
    )

    result = {
        "type": "prosecution",
        "prosecution_notice_id": prosecution_id,
        "penalty_notice_number": prosecution_id,
        "name": trade_name or "(NO TRADING NAME)",
        "party_served": name_of_convicted,
        "address": {
            "street": street,
            "city": city,
            "postal_code": None,
            "full": full_address,
            "lat": None,
            "lon": None,
        },
        "council": council,
        "date_of_offence": date_of_offence,
        "date_issued": date_of_decision,
        "offence_code": None,
        "offence_description": offence_description,
        "offence_nature": offence_nature,
        "penalty_amount": penalty_amount,
        "issued_by": brought_by,
        "prosecution": {
            "court": court,
            "brought_by": brought_by,
            "decision": decision_text,
            "penalty_details_raw": penalty_text,
            "decision_details": decision_details,
            "usual_place_of_business": usual_place,
        },
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


def main():
    """Main function to parse all penalty notice and prosecution files."""
    base_dir = Path(__file__).parent
    output_file = base_dir / "penalty_notices.json"
    
    existing_data = {}
    if output_file.exists():
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            print(f"Loaded {len(existing_data)} existing penalty notices")
        except Exception as e:
            print(f"Warning: Could not load existing data: {e}")
            existing_data = {}
    
    penalty_files = find_penalty_notice_files(str(base_dir))
    print(f"Found {len(penalty_files)} penalty notice files to process")

    prosecution_files = find_prosecution_files(str(base_dir))
    print(f"Found {len(prosecution_files)} prosecution files to process")
    
    if not penalty_files and not prosecution_files:
        print("No files found to process")
        return
    
    processed_penalties = 0
    skipped_penalties = 0
    updated_penalties = 0
    error_penalties = 0

    processed_prosecutions = 0
    skipped_prosecutions = 0
    updated_prosecutions = 0
    error_prosecutions = 0
    
    for file_path in penalty_files:
        result = parse_penalty_notice(file_path)
        
        if not result:
            error_penalties += 1
            continue
        
        penalty_number = result["penalty_notice_number"]
        
        if penalty_number in existing_data:
            if compare_entries(existing_data[penalty_number], result):
                skipped_penalties += 1
                continue
            else:
                print(f"WARNING: Penalty notice {penalty_number} already exists but data differs!")
                print(f"  Existing: {json.dumps(existing_data[penalty_number], indent=2)}")
                print(f"  New: {json.dumps(result, indent=2)}")
                existing_data[penalty_number] = result
                updated_penalties += 1
        else:
            existing_data[penalty_number] = result
            processed_penalties += 1

    for file_path in prosecution_files:
        result = parse_prosecution_notice(file_path)

        if not result:
            error_prosecutions += 1
            continue

        prosecution_key = result["penalty_notice_number"]

        if prosecution_key in existing_data:
            if compare_entries(existing_data[prosecution_key], result):
                skipped_prosecutions += 1
                continue
            else:
                print(f"WARNING: Prosecution {prosecution_key} already exists but data differs!")
                print(f"  Existing: {json.dumps(existing_data[prosecution_key], indent=2)}")
                print(f"  New: {json.dumps(result, indent=2)}")
                existing_data[prosecution_key] = result
                updated_prosecutions += 1
        else:
            existing_data[prosecution_key] = result
            processed_prosecutions += 1
    
    print(f"\nSaving results to {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSummary:")
    print(f"  Penalty notices:")
    print(f"    Processed: {processed_penalties} new entries")
    print(f"    Updated: {updated_penalties} entries (data differed)")
    print(f"    Skipped: {skipped_penalties} entries (already exists, same data)")
    print(f"    Errors: {error_penalties} files")
    print(f"  Prosecutions:")
    print(f"    Processed: {processed_prosecutions} new entries")
    print(f"    Updated: {updated_prosecutions} entries (data differed)")
    print(f"    Skipped: {skipped_prosecutions} entries (already exists, same data)")
    print(f"    Errors: {error_prosecutions} files")
    print(f"\n  Total: {len(existing_data)} offence records in output file")


if __name__ == "__main__":
    main()

