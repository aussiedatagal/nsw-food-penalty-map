#!/usr/bin/env python3
"""
Group penalty notices by location and business name.

This script:
- Reads penalty_notices.json
- Skips entries that are not geocoded (missing lat/lon)
- Groups penalties by location (lat/lon) and business name
- Merges entries with same exact coordinates and >60% similar names
- Merges entries with different coordinates and >85% similar names
- Outputs grouped_locations.json with penalties array for each location
"""

import json
import shutil
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Tuple


COORDINATE_EPSILON = 0.0001
NAME_SIMILARITY_THRESHOLD_EXACT_COORDS = 0.60
NAME_SIMILARITY_THRESHOLD = 0.85


def normalize_name(name: str) -> str:
    """Normalize name for comparison (uppercase, strip whitespace)."""
    return name.strip().upper() if name else ""


def normalize_address_for_comparison(address: Dict) -> str:
    """Normalize address for comparison."""
    import re
    
    def normalize_street(street: str) -> str:
        if not street:
            return ""
        street = street.strip().upper()
        street = re.sub(r'\bST\b', 'STREET', street)
        street = re.sub(r'\bAVE\b', 'AVENUE', street)
        street = re.sub(r'\bRD\b', 'ROAD', street)
        street = re.sub(r'\bDR\b', 'DRIVE', street)
        street = re.sub(r'\bCT\b', 'COURT', street)
        street = re.sub(r'\bPL\b', 'PLACE', street)
        street = re.sub(r'\bCRES\b', 'CRESCENT', street)
        street = re.sub(r'\bCR\b', 'CRESCENT', street)
        return street
    
    parts = []
    if address.get("street"):
        parts.append(normalize_street(address["street"]))
    if address.get("city"):
        parts.append(address["city"].strip().upper())
    if address.get("postal_code"):
        parts.append(address["postal_code"].strip().upper())
    return ", ".join(parts)


def normalize_party_served(party: str) -> str:
    """Normalize party_served for comparison."""
    if not party:
        return ""
    normalized = party.strip().upper()
    normalized = normalized.replace(" PTY LTD", "").replace(" PTY. LTD.", "").replace(" PTY", "")
    normalized = normalized.replace(" LTD", "").replace(" LIMITED", "")
    return normalized.strip()


def name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity ratio between two names (0.0 to 1.0)."""
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    if not norm1 or not norm2:
        return 0.0
    
    if norm1 in norm2 or norm2 in norm1:
        longer = max(len(norm1), len(norm2))
        shorter = min(len(norm1), len(norm2))
        if longer > 0:
            return max(0.70, shorter / longer)
    
    return SequenceMatcher(None, norm1, norm2).ratio()


def coordinates_match(lat1: float, lon1: float, lat2: float, lon2: float) -> bool:
    """Check if two coordinates are close enough to be considered the same."""
    return abs(lat1 - lat2) < COORDINATE_EPSILON and abs(lon1 - lon2) < COORDINATE_EPSILON


def create_penalty_dict(notice: Dict) -> Dict:
    """Create a copy of the full penalty notice data."""
    return json.loads(json.dumps(notice))


def main():
    """Main grouping function."""
    data_file = Path("penalty_notices.json")
    output_file = Path("grouped_locations.json")
    
    # Load penalty notices
    print(f"Loading {data_file}...")
    with open(data_file, 'r', encoding='utf-8') as f:
        penalty_notices = json.load(f)
    
    print(f"Loaded {len(penalty_notices)} penalty notices")
    
    geocoded_notices = []
    skipped_count = 0
    
    for notice_id, notice in penalty_notices.items():
        address = notice.get("address", {})
        lat = address.get("lat")
        lon = address.get("lon")
        
        if lat is None or lon is None:
            skipped_count += 1
            continue
        
        geocoded_notices.append(notice)
    
    print(f"Skipped {skipped_count} notices without geocoding")
    print(f"Processing {len(geocoded_notices)} geocoded notices")
    
    groups: List[Dict] = []
    
    for notice in geocoded_notices:
        address = notice.get("address", {})
        lat = address.get("lat")
        lon = address.get("lon")
        name = notice.get("name", "")
        council = notice.get("council", "")
        party_served = notice.get("party_served", "")
        
        matched_group = None
        
        for group in groups:
            group_lat = group["address"]["lat"]
            group_lon = group["address"]["lon"]
            group_name = group["name"]
            group_party_served = group.get("party_served", "")
            group_address = group["address"]
            
            coords_match = coordinates_match(lat, lon, group_lat, group_lon)
            
            if coords_match:
                party_match = False
                if party_served and group_party_served:
                    norm_party1 = normalize_party_served(party_served)
                    norm_party2 = normalize_party_served(group_party_served)
                    if norm_party1 and norm_party2 and norm_party1 == norm_party2:
                        party_match = True
                
                if party_match:
                    matched_group = group
                    break
                
                similarity = name_similarity(name, group_name)
                threshold = NAME_SIMILARITY_THRESHOLD_EXACT_COORDS if coords_match else NAME_SIMILARITY_THRESHOLD
                
                party_mismatch = False
                if party_served and group_party_served:
                    norm_party1 = normalize_party_served(party_served)
                    norm_party2 = normalize_party_served(group_party_served)
                    if norm_party1 and norm_party2 and norm_party1 != norm_party2:
                        party_mismatch = True
                
                if similarity >= threshold and not party_mismatch:
                    matched_group = group
                    break
        
        penalty = create_penalty_dict(notice)
        
        if matched_group:
            matched_group["penalties"].append(penalty)
            if not matched_group.get("party_served") and party_served:
                matched_group["party_served"] = party_served
        else:
            new_group = {
                "name": name,
                "address": {
                    "street": address.get("street"),
                    "city": address.get("city"),
                    "postal_code": address.get("postal_code"),
                    "full": address.get("full"),
                    "lat": lat,
                    "lon": lon,
                },
                "council": council,
                "party_served": party_served,
                "penalties": [penalty],
            }
            groups.append(new_group)
    
    groups.sort(key=lambda g: normalize_name(g["name"]))
    
    for group in groups:
        group["penalties"].sort(
            key=lambda p: p.get("date_issued") or "", 
            reverse=True
        )
    
    print(f"\nSaving {len(groups)} grouped locations to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(groups, f, indent=2, ensure_ascii=False)
    
    frontend_file = Path("frontend/public/grouped_locations.json")
    if frontend_file.parent.exists():
        print(f"Copying to {frontend_file}...")
        shutil.copy2(output_file, frontend_file)
        print(f"Successfully copied to frontend folder")
    else:
        print(f"Warning: Frontend folder not found at {frontend_file.parent}")
    
    total_penalties = sum(len(g["penalties"]) for g in groups)
    groups_with_multiple = sum(1 for g in groups if len(g["penalties"]) > 1)
    max_penalties = max((len(g["penalties"]) for g in groups), default=0)
    
    print("\n" + "="*60)
    print("GROUPING SUMMARY")
    print("="*60)
    print(f"Total geocoded notices: {len(geocoded_notices)}")
    print(f"Total groups created: {len(groups)}")
    print(f"Total penalties in groups: {total_penalties}")
    print(f"Groups with multiple penalties: {groups_with_multiple}")
    print(f"Maximum penalties per location: {max_penalties}")
    print(f"Output saved to: {output_file}")
    print("="*60)


if __name__ == "__main__":
    main()

