#!/usr/bin/env python3
"""
Verify the pipeline results for duplicates, missing penalties, etc.
"""

import json
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher


def normalize_name(name: str) -> str:
    """Normalize name for comparison."""
    return name.strip().upper() if name else ""


def name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity ratio between two names."""
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


def coordinates_match(lat1: float, lon1: float, lat2: float, lon2: float, epsilon: float = 0.0001) -> bool:
    """Check if two coordinates are close enough."""
    return abs(lat1 - lat2) < epsilon and abs(lon1 - lon2) < epsilon


def main():
    """Verify pipeline results."""
    base_dir = Path(__file__).parent
    penalty_notices_file = base_dir / "penalty_notices.json"
    grouped_locations_file = base_dir / "grouped_locations.json"
    
    print("="*60)
    print("PIPELINE VERIFICATION")
    print("="*60)
    
    # Load data
    print("\nLoading data...")
    with open(penalty_notices_file, 'r', encoding='utf-8') as f:
        penalty_notices = json.load(f)
    
    with open(grouped_locations_file, 'r', encoding='utf-8') as f:
        grouped_locations = json.load(f)
    
    print(f"Loaded {len(penalty_notices)} penalty notices")
    print(f"Loaded {len(grouped_locations)} location groups")
    
    # Check 1: All geocoded penalties should be in groups
    print("\n" + "="*60)
    print("CHECK 1: Missing Penalties")
    print("="*60)
    
    geocoded_notices = {}
    for notice_id, notice in penalty_notices.items():
        address = notice.get("address", {})
        if address.get("lat") is not None and address.get("lon") is not None:
            geocoded_notices[notice_id] = notice
    
    # Collect all penalty notice numbers from groups
    penalties_in_groups = set()
    for group in grouped_locations:
        for penalty in group.get("penalties", []):
            penalty_num = penalty.get("penalty_notice_number")
            if penalty_num:
                penalties_in_groups.add(penalty_num)
    
    missing_penalties = []
    for notice_id, notice in geocoded_notices.items():
        penalty_num = notice.get("penalty_notice_number")
        if penalty_num not in penalties_in_groups:
            missing_penalties.append({
                "penalty_notice_number": penalty_num,
                "name": notice.get("name"),
                "address": notice.get("address", {}).get("full")
            })
    
    if missing_penalties:
        print(f"❌ FOUND {len(missing_penalties)} MISSING PENALTIES:")
        for p in missing_penalties:
            print(f"  - {p['penalty_notice_number']}: {p['name']} ({p['address']})")
    else:
        print(f"✅ All {len(geocoded_notices)} geocoded penalties are in groups")
    
    # Check 2: Duplicate locations (same coordinates)
    print("\n" + "="*60)
    print("CHECK 2: Duplicate Locations (Same Coordinates)")
    print("="*60)
    
    coord_groups = defaultdict(list)
    for idx, group in enumerate(grouped_locations):
        address = group.get("address", {})
        lat = address.get("lat")
        lon = address.get("lon")
        if lat is not None and lon is not None:
            # Round to 4 decimal places for grouping
            coord_key = (round(lat, 4), round(lon, 4))
            coord_groups[coord_key].append((idx, group))
    
    duplicate_coords = []
    for coord_key, groups in coord_groups.items():
        if len(groups) > 1:
            duplicate_coords.append((coord_key, groups))
    
    if duplicate_coords:
        print(f"❌ FOUND {len(duplicate_coords)} LOCATIONS WITH DUPLICATE COORDINATES:")
        for coord_key, groups in duplicate_coords:
            print(f"\n  Coordinates: {coord_key}")
            for idx, group in groups:
                print(f"    - Group {idx}: {group.get('name')} ({len(group.get('penalties', []))} penalties)")
    else:
        print(f"✅ No duplicate coordinates found")
    
    # Check 3: Similar names at same coordinates
    print("\n" + "="*60)
    print("CHECK 3: Similar Names at Same Coordinates")
    print("="*60)
    
    similar_names_same_coords = []
    for i, group1 in enumerate(grouped_locations):
        addr1 = group1.get("address", {})
        lat1 = addr1.get("lat")
        lon1 = addr1.get("lon")
        name1 = group1.get("name", "")
        
        if lat1 is None or lon1 is None:
            continue
        
        for j, group2 in enumerate(grouped_locations[i+1:], start=i+1):
            addr2 = group2.get("address", {})
            lat2 = addr2.get("lat")
            lon2 = addr2.get("lon")
            name2 = group2.get("name", "")
            
            if lat2 is None or lon2 is None:
                continue
            
            if coordinates_match(lat1, lon1, lat2, lon2):
                similarity = name_similarity(name1, name2)
                if similarity > 0.5:  # More than 50% similar
                    similar_names_same_coords.append({
                        "coord": (lat1, lon1),
                        "group1": (i, name1, len(group1.get("penalties", []))),
                        "group2": (j, name2, len(group2.get("penalties", []))),
                        "similarity": similarity
                    })
    
    if similar_names_same_coords:
        print(f"⚠️  FOUND {len(similar_names_same_coords)} PAIRS WITH SIMILAR NAMES AT SAME COORDINATES:")
        for item in similar_names_same_coords:
            print(f"\n  Coordinates: {item['coord']}")
            print(f"    Group {item['group1'][0]}: {item['group1'][1]} ({item['group1'][2]} penalties) - Similarity: {item['similarity']:.2%}")
            print(f"    Group {item['group2'][0]}: {item['group2'][1]} ({item['group2'][2]} penalties)")
    else:
        print(f"✅ No similar names at same coordinates found")
    
    # Check 4: Penalty counts
    print("\n" + "="*60)
    print("CHECK 4: Penalty Counts")
    print("="*60)
    
    total_penalties_in_groups = sum(len(g.get("penalties", [])) for g in grouped_locations)
    print(f"Total penalties in groups: {total_penalties_in_groups}")
    print(f"Total geocoded notices: {len(geocoded_notices)}")
    
    if total_penalties_in_groups == len(geocoded_notices):
        print("✅ Penalty counts match")
    else:
        print(f"⚠️  Penalty count mismatch: {total_penalties_in_groups} in groups vs {len(geocoded_notices)} geocoded notices")
        print(f"   Difference: {abs(total_penalties_in_groups - len(geocoded_notices))}")
    
    # Check 5: Duplicate penalty notice numbers in groups
    print("\n" + "="*60)
    print("CHECK 5: Duplicate Penalty Notice Numbers")
    print("="*60)
    
    penalty_numbers_seen = defaultdict(list)
    for group_idx, group in enumerate(grouped_locations):
        for penalty in group.get("penalties", []):
            penalty_num = penalty.get("penalty_notice_number")
            if penalty_num:
                penalty_numbers_seen[penalty_num].append((group_idx, group.get("name")))
    
    duplicates = {k: v for k, v in penalty_numbers_seen.items() if len(v) > 1}
    
    if duplicates:
        print(f"❌ FOUND {len(duplicates)} DUPLICATE PENALTY NOTICE NUMBERS:")
        for penalty_num, locations in list(duplicates.items())[:10]:  # Show first 10
            print(f"  {penalty_num} appears in {len(locations)} locations:")
            for group_idx, group_name in locations:
                print(f"    - Group {group_idx}: {group_name}")
        if len(duplicates) > 10:
            print(f"  ... and {len(duplicates) - 10} more")
    else:
        print(f"✅ No duplicate penalty notice numbers found")
    
    # Summary
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)
    issues = []
    if missing_penalties:
        issues.append(f"{len(missing_penalties)} missing penalties")
    if duplicate_coords:
        issues.append(f"{len(duplicate_coords)} duplicate coordinate locations")
    if duplicates:
        issues.append(f"{len(duplicates)} duplicate penalty numbers")
    
    if issues:
        print(f"⚠️  Issues found: {', '.join(issues)}")
        exit_code = 0  # Don't fail the workflow, just report issues
    else:
        print("✅ All checks passed!")
        exit_code = 0
    print("="*60)
    
    exit(exit_code)


if __name__ == "__main__":
    main()

