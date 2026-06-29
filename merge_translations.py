#!/usr/bin/env python3
"""
Merge translation keys from backup/i18n-work into current main branch.
Combines all keys from both versions, preferring Lovable's base structure
but adding all missing keys from the backup branch.
"""
import json
import subprocess
import os

def get_json_from_branch(filepath, branch):
    """Get JSON content from a specific git branch"""
    try:
        result = subprocess.run(
            ['git', 'show', f'{branch}:{filepath}'],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except:
        return {}

def deep_merge(base, updates):
    """Recursively merge updates into base, preserving base structure"""
    for key, value in updates.items():
        if key not in base:
            base[key] = value
        elif isinstance(base[key], dict) and isinstance(value, dict):
            deep_merge(base[key], value)
        # If key exists in base, keep base value (Lovable's version)
    return base

languages = [
    'en', 'af', 'zu', 'xh', 'sn', 'sw', 'ha', 'ig', 'ar', 'de',
    'el', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl',
    'pt', 'ru', 'tr', 'yo', 'zh'
]

for lang in languages:
    filepath = f'src/i18n/locales/{lang}.json'

    # Get both versions
    lovable = get_json_from_branch(filepath, 'HEAD')  # current (Lovable)
    backup = get_json_from_branch(filepath, 'backup/i18n-work')  # my work

    if not lovable:
        lovable = {}

    # Merge: lovable as base, add missing keys from backup
    merged = deep_merge(lovable.copy(), backup)

    # Write back
    with open(filepath, 'w') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    # Count what was added
    added = len(set(str(merged)) - set(str(lovable)))
    print(f"✓ {lang}.json: merged (added keys)")

print("\n✓ All language files merged!")
