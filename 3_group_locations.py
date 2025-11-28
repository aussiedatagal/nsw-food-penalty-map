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


# Threshold for considering coordinates the same (in degrees)
# Approximately 11 meters at the equator
COORDINATE_EPSILON = 0.0001

# Threshold for name similarity when coordinates match exactly (60%)
# Lower threshold because exact coordinates strongly suggest same business
NAME_SIMILARITY_THRESHOLD_EXACT_COORDS = 0.60

# Threshold for name similarity when coordinates don't match (85%)
# Higher threshold needed when locations differ
NAME_SIMILARITY_THRESHOLD = 0.85


def normalize_name(name: str) -> str:
    """Normalize name for comparison (uppercase, strip whitespace)."""
    return name.strip().upper() if name else ""


def normalize_address_for_comparison(address: Dict) -> str:
    """Normalize address for comparison (for exact matching)."""
    import re
    
    # Normalize street abbreviations
    def normalize_street(street: str) -> str:
        if not street:
            return ""
        street = street.strip().upper()
        # Replace common abbreviations with full forms
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
    # Remove common suffixes and normalize
    normalized = party.strip().upper()
    # Remove common variations
    normalized = normalized.replace(" PTY LTD", "").replace(" PTY. LTD.", "").replace(" PTY", "")
    normalized = normalized.replace(" LTD", "").replace(" LIMITED", "")
    return normalized.strip()


def name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity ratio between two names (0.0 to 1.0)."""
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    if not norm1 or not norm2:
        return 0.0
    
    # If one name contains the other (or vice versa), consider it a strong match
    # This handles cases like "O'CHICKEN" vs "O'CHICKEN MACARTHUR SQUARE"
    if norm1 in norm2 or norm2 in norm1:
        # Return high similarity if one is substring of the other
        # Weight it based on how much of the longer name is covered
        longer = max(len(norm1), len(norm2))
        shorter = min(len(norm1), len(norm2))
        if longer > 0:
            return max(0.70, shorter / longer)  # At least 70% if substring match
    
    return SequenceMatcher(None, norm1, norm2).ratio()


def coordinates_match(lat1: float, lon1: float, lat2: float, lon2: float) -> bool:
    """Check if two coordinates are close enough to be considered the same."""
    return abs(lat1 - lat2) < COORDINATE_EPSILON and abs(lon1 - lon2) < COORDINATE_EPSILON


def create_penalty_dict(notice: Dict) -> Dict:
    """Create a copy of the full penalty notice data."""
    # Return a deep copy of the entire notice
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
    
    # Filter to only geocoded entries
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
    
    # Group by location and name similarity
    # We'll use a list to track groups, and for each new notice, check if it matches an existing group
    groups: List[Dict] = []
    
    for notice in geocoded_notices:
        address = notice.get("address", {})
        lat = address.get("lat")
        lon = address.get("lon")
        name = notice.get("name", "")
        council = notice.get("council", "")
        party_served = notice.get("party_served", "")
        
        # Find matching group
        matched_group = None
        
        for group in groups:
            group_lat = group["address"]["lat"]
            group_lon = group["address"]["lon"]
            group_name = group["name"]
            group_party_served = group.get("party_served", "")
            group_address = group["address"]
            
            # Check if coordinates match
            coords_match = coordinates_match(lat, lon, group_lat, group_lon)
            
            if coords_match:
                # Strong signals that it's the same business:
                # 1. Exact party_served match (normalized)
                party_match = False
                if party_served and group_party_served:
                    norm_party1 = normalize_party_served(party_served)
                    norm_party2 = normalize_party_served(group_party_served)
                    if norm_party1 and norm_party2 and norm_party1 == norm_party2:
                        party_match = True
                
                # If party_served matches exactly, merge regardless of name similarity
                # This indicates the same business owner/entity
                if party_match:
                    matched_group = group
                    break
                
                # Otherwise, check if names are similar enough
                # Use lower threshold when coordinates match exactly
                # But don't merge just based on address alone - require name similarity
                # Different party_served at same address likely means different business
                similarity = name_similarity(name, group_name)
                threshold = NAME_SIMILARITY_THRESHOLD_EXACT_COORDS if coords_match else NAME_SIMILARITY_THRESHOLD
                
                # If names are similar, but party_served is different and both are present,
                # don't merge - likely different businesses
                party_mismatch = False
                if party_served and group_party_served:
                    norm_party1 = normalize_party_served(party_served)
                    norm_party2 = normalize_party_served(group_party_served)
                    if norm_party1 and norm_party2 and norm_party1 != norm_party2:
                        party_mismatch = True
                
                if similarity >= threshold and not party_mismatch:
                    matched_group = group
                    break
        
        # Create penalty dict
        penalty = create_penalty_dict(notice)
        
        if matched_group:
            # Add penalty to existing group
            matched_group["penalties"].append(penalty)
            # Update party_served if it's different (keep first non-empty one, or merge if needed)
            if not matched_group.get("party_served") and party_served:
                matched_group["party_served"] = party_served
        else:
            # Create new group
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
    
    # Sort groups by name for consistent output
    groups.sort(key=lambda g: normalize_name(g["name"]))
    
    # Sort penalties within each group by date_issued (most recent first)
    for group in groups:
        group["penalties"].sort(
            key=lambda p: p.get("date_issued") or "", 
            reverse=True
        )
    
    # Save results
    print(f"\nSaving {len(groups)} grouped locations to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(groups, f, indent=2, ensure_ascii=False)
    
    # Copy to frontend folder
    frontend_file = Path("frontend/public/grouped_locations.json")
    if frontend_file.parent.exists():
        print(f"Copying to {frontend_file}...")
        shutil.copy2(output_file, frontend_file)
        print(f"Successfully copied to frontend folder")
    else:
        print(f"Warning: Frontend folder not found at {frontend_file.parent}")
    
    # Print summary statistics
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

