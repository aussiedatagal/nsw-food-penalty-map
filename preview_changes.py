#!/usr/bin/env python3
"""
Preview what changes would be made in a dry run.
Shows statistics and a summary of what would be committed.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any


def load_json_safely(filepath: Path) -> Dict[str, Any]:
    """Load JSON file, return empty dict if file doesn't exist."""
    if not filepath.exists():
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {filepath}: {e}", file=sys.stderr)
        return {}


def compare_dicts(old: Dict, new: Dict, path: str = "") -> list:
    """Compare two dictionaries and return list of differences."""
    differences = []
    
    # Check for new keys
    for key in new:
        if key not in old:
            differences.append(f"  + {path}{key}: NEW (value: {str(new[key])[:100]})")
        elif isinstance(new[key], dict) and isinstance(old.get(key), dict):
            differences.extend(compare_dicts(old[key], new[key], f"{path}{key}."))
        elif new[key] != old.get(key):
            old_val = str(old.get(key))[:100]
            new_val = str(new[key])[:100]
            differences.append(f"  ~ {path}{key}: CHANGED")
            differences.append(f"     Old: {old_val}")
            differences.append(f"     New: {new_val}")
    
    # Check for removed keys
    for key in old:
        if key not in new:
            differences.append(f"  - {path}{key}: REMOVED")
    
    return differences


def main():
    """Generate preview of changes."""
    base_dir = Path(__file__).parent
    
    # Files that would be committed
    penalty_notices_file = base_dir / "penalty_notices.json"
    grouped_locations_file = base_dir / "grouped_locations.json"
    frontend_grouped_file = base_dir / "frontend" / "public" / "grouped_locations.json"
    
    print("="*70)
    print("DRY RUN PREVIEW - Changes That Would Be Committed")
    print("="*70)
    
    # Load current (committed) versions from git
    import subprocess
    import tempfile
    
    # Get current committed versions
    current_penalty_notices = {}
    current_grouped_locations = {}
    current_frontend_grouped = {}
    
    # Try to get committed versions from git
    # First check if we're in a git repo and HEAD exists
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--verify", "HEAD"],
            capture_output=True,
            timeout=5
        )
        has_head = result.returncode == 0
    except Exception:
        has_head = False
    
    if has_head:
        try:
            result = subprocess.run(
                ["git", "show", "HEAD:penalty_notices.json"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                current_penalty_notices = json.loads(result.stdout)
        except Exception:
            pass  # Fall back to current file
        
        try:
            result = subprocess.run(
                ["git", "show", "HEAD:grouped_locations.json"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                current_grouped_locations = json.loads(result.stdout)
        except Exception:
            pass  # Fall back to current file
        
        try:
            result = subprocess.run(
                ["git", "show", "HEAD:frontend/public/grouped_locations.json"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                current_frontend_grouped = json.loads(result.stdout)
        except Exception:
            pass  # Fall back to current file
    
    # If git didn't work or HEAD doesn't exist, use current files as baseline
    # (this means no changes will be detected, which is fine for first run)
    if not current_penalty_notices:
        current_penalty_notices = load_json_safely(penalty_notices_file)
    if not current_grouped_locations:
        current_grouped_locations = load_json_safely(grouped_locations_file)
    if not current_frontend_grouped:
        current_frontend_grouped = load_json_safely(frontend_grouped_file)
    
    # Load new versions
    new_penalty_notices = load_json_safely(penalty_notices_file)
    new_grouped_locations = load_json_safely(grouped_locations_file)
    new_frontend_grouped = load_json_safely(frontend_grouped_file)
    
    # Compare penalty_notices.json
    print("\n" + "="*70)
    print("1. penalty_notices.json")
    print("="*70)
    
    old_count = len(current_penalty_notices)
    new_count = len(new_penalty_notices)
    
    if isinstance(current_penalty_notices, dict) and isinstance(new_penalty_notices, dict):
        # Find new notices
        new_notice_ids = set(new_penalty_notices.keys()) - set(current_penalty_notices.keys())
        removed_notice_ids = set(current_penalty_notices.keys()) - set(new_penalty_notices.keys())
        common_ids = set(new_penalty_notices.keys()) & set(current_penalty_notices.keys())
        
        changed_notices = []
        for notice_id in common_ids:
            if new_penalty_notices[notice_id] != current_penalty_notices[notice_id]:
                changed_notices.append(notice_id)
        
        print(f"Current count: {old_count}")
        print(f"New count: {new_count}")
        print(f"Difference: {new_count - old_count:+d}")
        print(f"\nNew notices: {len(new_notice_ids)}")
        if new_notice_ids:
            print("  First 10 new notice IDs:")
            for notice_id in list(new_notice_ids)[:10]:
                name = new_penalty_notices[notice_id].get("name", "Unknown")
                print(f"    - {notice_id}: {name}")
            if len(new_notice_ids) > 10:
                print(f"    ... and {len(new_notice_ids) - 10} more")
        
        print(f"\nRemoved notices: {len(removed_notice_ids)}")
        if removed_notice_ids:
            print("  Removed notice IDs:")
            for notice_id in list(removed_notice_ids)[:10]:
                print(f"    - {notice_id}")
            if len(removed_notice_ids) > 10:
                print(f"    ... and {len(removed_notice_ids) - 10} more")
        
        print(f"\nChanged notices: {len(changed_notices)}")
        if changed_notices:
            print("  Changed notice IDs:")
            for notice_id in changed_notices[:10]:
                print(f"    - {notice_id}")
            if len(changed_notices) > 10:
                print(f"    ... and {len(changed_notices) - 10} more")
    else:
        if old_count != new_count:
            print(f"Count changed: {old_count} → {new_count} ({new_count - old_count:+d})")
        else:
            print("No changes detected")
    
    # Compare grouped_locations.json
    print("\n" + "="*70)
    print("2. grouped_locations.json")
    print("="*70)
    
    old_groups_count = len(current_grouped_locations) if isinstance(current_grouped_locations, list) else 0
    new_groups_count = len(new_grouped_locations) if isinstance(new_grouped_locations, list) else 0
    
    print(f"Current groups: {old_groups_count}")
    print(f"New groups: {new_groups_count}")
    print(f"Difference: {new_groups_count - old_groups_count:+d}")
    
    if isinstance(new_grouped_locations, list) and isinstance(current_grouped_locations, list):
        # Count total penalties
        old_penalties = sum(len(g.get("penalties", [])) for g in current_grouped_locations)
        new_penalties = sum(len(g.get("penalties", [])) for g in new_grouped_locations)
        print(f"\nTotal penalties in groups:")
        print(f"  Current: {old_penalties}")
        print(f"  New: {new_penalties}")
        print(f"  Difference: {new_penalties - old_penalties:+d}")
    
    # Compare frontend/public/grouped_locations.json
    print("\n" + "="*70)
    print("3. frontend/public/grouped_locations.json")
    print("="*70)
    
    old_frontend_count = len(current_frontend_grouped) if isinstance(current_frontend_grouped, list) else 0
    new_frontend_count = len(new_frontend_grouped) if isinstance(new_frontend_grouped, list) else 0
    
    print(f"Current groups: {old_frontend_count}")
    print(f"New groups: {new_frontend_count}")
    print(f"Difference: {new_frontend_count - old_frontend_count:+d}")
    
    # Check for duplicates
    print("\n" + "="*70)
    print("4. Duplicate Check")
    print("="*70)
    
    if isinstance(new_penalty_notices, dict):
        # Check for duplicate penalty notice numbers
        all_notice_ids = list(new_penalty_notices.keys())
        if len(all_notice_ids) != len(set(all_notice_ids)):
            print("❌ WARNING: Duplicate penalty notice numbers found!")
            from collections import Counter
            duplicates = [item for item, count in Counter(all_notice_ids).items() if count > 1]
            print(f"   Found {len(duplicates)} duplicate IDs")
        else:
            print(f"✅ No duplicate penalty notice numbers ({len(all_notice_ids)} unique)")
    
    if isinstance(new_grouped_locations, list):
        # Check for duplicate penalty numbers in groups
        from collections import defaultdict
        penalty_numbers_seen = defaultdict(list)
        for group_idx, group in enumerate(new_grouped_locations):
            for penalty in group.get("penalties", []):
                penalty_num = penalty.get("penalty_notice_number")
                if penalty_num:
                    penalty_numbers_seen[penalty_num].append((group_idx, group.get("name")))
        
        duplicates = {k: v for k, v in penalty_numbers_seen.items() if len(v) > 1}
        if duplicates:
            print(f"❌ WARNING: {len(duplicates)} penalty notice numbers appear in multiple groups!")
            for penalty_num, locations in list(duplicates.items())[:5]:
                print(f"   {penalty_num} appears in {len(locations)} groups")
            if len(duplicates) > 5:
                print(f"   ... and {len(duplicates) - 5} more")
        else:
            total_penalties = sum(len(g.get("penalties", [])) for g in new_grouped_locations)
            print(f"✅ No duplicate penalty numbers in groups ({total_penalties} total penalties)")
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    has_changes = (
        (old_count != new_count) or
        (old_groups_count != new_groups_count) or
        (old_frontend_count != new_frontend_count)
    )
    
    if has_changes:
        print("✅ Changes detected - ready to commit")
        print("\nFiles that would be committed:")
        if old_count != new_count:
            print(f"  - penalty_notices.json ({old_count} → {new_count})")
        if old_groups_count != new_groups_count:
            print(f"  - grouped_locations.json ({old_groups_count} → {new_groups_count} groups)")
        if old_frontend_count != new_frontend_count:
            print(f"  - frontend/public/grouped_locations.json ({old_frontend_count} → {new_frontend_count} groups)")
    else:
        print("ℹ️  No changes detected - nothing to commit")
    
    print("="*70)
    
    # Exit with code 0 if changes detected, 1 if no changes
    sys.exit(0 if has_changes else 1)


if __name__ == "__main__":
    main()

