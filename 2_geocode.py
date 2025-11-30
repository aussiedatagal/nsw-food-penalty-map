#!/usr/bin/env python3
"""
Geocode addresses in penalty_notices.json using OpenStreetMap Nominatim.

This script:
- Geocodes addresses that don't have lat/lon coordinates
- Reuses geocoded locations for duplicate addresses
- Implements rate limiting to avoid OSM rate limits
- Uses fallback methods to strip unit/shop numbers for difficult addresses
- Tracks failed geocodings for manual review
"""

import json
import re
import time
import argparse
from pathlib import Path
from typing import Dict, Optional, Tuple

from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError


RATE_LIMIT_DELAY = 1.2
USER_AGENT_EMAIL = "231821315+aussiedatagal@users.noreply.github.com"


def normalize_address(address: str) -> str:
    """Normalize address for comparison (lowercase, strip extra spaces)."""
    return re.sub(r'\s+', ' ', address.strip().upper())


def generate_address_variants(full_address: str) -> list:
    """
    Generate address variants by stripping characters from the front.
    When a special character is encountered, strip up to and including that character.
    Minimum required: 4 tokens. Stop if below 4 tokens.
    """
    variants = [full_address]
    
    special_chars = set(',/-\t\n\r ')
    
    current = full_address
    i = 0
    
    while i < len(current):
        char = current[i]
        
        if char in special_chars:
            remaining = current[i + 1:].strip()
            
            tokens = re.split(r'[,\s/\-]+', remaining)
            tokens = [t.strip() for t in tokens if t.strip()]
            
            if len(tokens) >= 4:
                if remaining and remaining != full_address:
                    variants.append(remaining)
                current = remaining
                i = 0
            else:
                break
        else:
            i += 1
    seen = set()
    unique_variants = []
    for variant in variants:
        normalized = normalize_address(variant)
        if normalized not in seen:
            seen.add(normalized)
            unique_variants.append(variant)
    
    return unique_variants


def geocode_address(geocoder: Nominatim, address: str, max_retries: int = 3) -> Optional[Tuple[float, float]]:
    """Geocode an address with retry logic. Returns (lat, lon) tuple if successful, None otherwise."""
    for attempt in range(max_retries):
        try:
            location = geocoder.geocode(address, timeout=10, exactly_one=True)
            if location:
                return (location.latitude, location.longitude)
            return None
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"  Geocoding error (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"  Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            else:
                print(f"  Failed to geocode after {max_retries} attempts: {e}")
                return None
        except Exception as e:
            print(f"  Unexpected error geocoding '{address}': {e}")
            return None
    
    return None


def main():
    """Main geocoding function."""
    parser = argparse.ArgumentParser(description='Geocode addresses in penalty notices')
    parser.add_argument('--id', type=str, help='Geocode only a specific entry by ID (e.g. "prosecution-30052-1")')
    parser.add_argument('--slug', type=str, help='Geocode all entries for a prosecution slug (e.g. "wudu")')
    args = parser.parse_args()
    
    data_file = Path("penalty_notices.json")
    failed_file = Path("failed_geocoding.json")
    
    print(f"Loading {data_file}...")
    with open(data_file, 'r', encoding='utf-8') as f:
        penalty_notices = json.load(f)
    
    print(f"Loaded {len(penalty_notices)} penalty notices")
    
    # Filter to specific entries if requested
    if args.id:
        if args.id in penalty_notices:
            penalty_notices = {args.id: penalty_notices[args.id]}
            print(f"Processing only entry: {args.id}")
        else:
            print(f"Error: Entry {args.id} not found")
            return
    elif args.slug:
        filtered = {k: v for k, v in penalty_notices.items() if v.get('prosecution_slug') == args.slug}
        if filtered:
            penalty_notices = filtered
            print(f"Processing {len(filtered)} entries for prosecution slug: {args.slug}")
        else:
            print(f"Error: No entries found for prosecution slug: {args.slug}")
            return
    
    geocoder = Nominatim(user_agent=USER_AGENT_EMAIL)
    
    address_cache: Dict[str, Tuple[float, float]] = {}
    
    print("Building address cache from existing geocoded locations...")
    for notice_id, notice in penalty_notices.items():
        address = notice.get("address", {})
        if address.get("lat") is not None and address.get("lon") is not None:
            full_address = address.get("full", "")
            if full_address:
                normalized = normalize_address(full_address)
                address_cache[normalized] = (address["lat"], address["lon"])
    
    print(f"Found {len(address_cache)} already geocoded addresses in cache")
    
    stats = {
        "total": 0,
        "already_geocoded": 0,
        "geocoded_from_cache": 0,
        "geocoded_new": 0,
        "failed": 0
    }
    
    failed_geocodings = []
    
    print("\nStarting geocoding process...")
    for idx, (notice_id, notice) in enumerate(penalty_notices.items(), 1):
        address = notice.get("address", {})
        full_address = address.get("full", "")
        
        if not full_address:
            continue
        
        stats["total"] += 1
        
        if address.get("lat") is not None and address.get("lon") is not None:
            stats["already_geocoded"] += 1
            if idx % 100 == 0:
                print(f"Progress: {idx}/{len(penalty_notices)} (skipped {stats['already_geocoded']} already geocoded)")
            continue
        
        normalized = normalize_address(full_address)
        
        if normalized in address_cache:
            lat, lon = address_cache[normalized]
            address["lat"] = lat
            address["lon"] = lon
            stats["geocoded_from_cache"] += 1
            if idx % 100 == 0:
                print(f"Progress: {idx}/{len(penalty_notices)} (cached: {stats['geocoded_from_cache']}, new: {stats['geocoded_new']}, failed: {stats['failed']})")
            continue
        
        variants = generate_address_variants(full_address)
        
        geocoded = False
        for variant in variants:
            print(f"[{idx}/{len(penalty_notices)}] Trying: {variant}")
            
            time.sleep(RATE_LIMIT_DELAY)
            
            result = geocode_address(geocoder, variant)
            
            if result:
                lat, lon = result
                address["lat"] = lat
                address["lon"] = lon
                
                for v in variants:
                    address_cache[normalize_address(v)] = (lat, lon)
                
                stats["geocoded_new"] += 1
                geocoded = True
                if variant != full_address:
                    print(f"  Success with variant: {variant}")
                else:
                    print(f"  Success with original address")
                print(f"    Coordinates: ({lat:.6f}, {lon:.6f})")
                break
            else:
                print(f"  No result")
        
        if not geocoded:
            stats["failed"] += 1
            failed_geocodings.append({
                "penalty_notice_number": notice.get("penalty_notice_number"),
                "name": notice.get("name"),
                "address": full_address,
                "variants_tried": variants
            })
            print(f"  FAILED: All variants failed")
        
        if idx % 50 == 0:
            print(f"\nSaving progress... ({idx}/{len(penalty_notices)})")
            with open(data_file, 'w', encoding='utf-8') as f:
                json.dump(penalty_notices, f, indent=2, ensure_ascii=False)
            
            with open(failed_file, 'w', encoding='utf-8') as f:
                json.dump(failed_geocodings, f, indent=2, ensure_ascii=False)
    
    print("\nSaving final results...")
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(penalty_notices, f, indent=2, ensure_ascii=False)
    
    with open(failed_file, 'w', encoding='utf-8') as f:
        json.dump(failed_geocodings, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("GEOCODING SUMMARY")
    print("="*60)
    print(f"Total addresses processed: {stats['total']}")
    print(f"Already geocoded: {stats['already_geocoded']}")
    print(f"Geocoded from cache: {stats['geocoded_from_cache']}")
    print(f"Newly geocoded: {stats['geocoded_new']}")
    print(f"Failed: {stats['failed']}")
    print(f"\nFailed geocodings saved to: {failed_file}")
    print("="*60)


if __name__ == "__main__":
    main()

