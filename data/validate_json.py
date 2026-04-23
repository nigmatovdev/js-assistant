import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "structured.json")

def validate():
    print(f"Validating {INPUT_PATH}...")
    
    try:
        with open(INPUT_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON Decode Error: {e}")
        return
    except Exception as e:
        print(f"❌ Error opening file: {e}")
        return

    errors = []
    seen_moddas = set()
    seen_ids = set()

    for idx, item in enumerate(data):
        item_id = item.get("id", f"INDEX_{idx}")
        modda = item.get("modda")
        title = item.get("title")
        content = item.get("content")
        hierarchy = item.get("hierarchy", {})

        # Check required fields
        if not modda:
            errors.append(f"[{item_id}] Missing or empty 'modda' number")
        if not title or not str(title).strip():
            errors.append(f"[{item_id}] Missing or empty 'title'")
        if not content or not str(content).strip():
            errors.append(f"[{item_id}] Missing or empty 'content'")
        if not hierarchy:
            errors.append(f"[{item_id}] Missing or empty 'hierarchy'")
        
        # Check hierarchy inner fields
        if hierarchy:
            if not hierarchy.get("qism") or not str(hierarchy.get("qism")).strip():
                errors.append(f"[{item_id}] Missing or empty 'qism' in hierarchy")
            if not hierarchy.get("bolim") or not str(hierarchy.get("bolim")).strip():
                errors.append(f"[{item_id}] Missing or empty 'bolim' in hierarchy")
            if not hierarchy.get("bob") or not str(hierarchy.get("bob")).strip():
                errors.append(f"[{item_id}] Missing or empty 'bob' in hierarchy")
        
        # Check content length
        if content and len(str(content).strip()) <= 50:
            errors.append(f"[{item_id}] Content length is too short (<= 50 characters): {len(str(content).strip())} chars")
        
        # Check duplicates
        if modda in seen_moddas:
            errors.append(f"[{item_id}] Duplicate modda number found: {modda}")
        else:
            if modda:
                seen_moddas.add(modda)
                
        if item_id in seen_ids:
            errors.append(f"[{item_id}] Duplicate ID found: {item_id}")
        else:
            seen_ids.add(item_id)
            
        # Check for broken encoding / replacement characters
        text_to_check = f"{title} {content} {hierarchy.get('qism', '')} {hierarchy.get('bolim', '')} {hierarchy.get('bob', '')}"
        if "\ufffd" in text_to_check:
            errors.append(f"[{item_id}] Found broken encoding character ''")

    if errors:
        print(f"FAILED: Validation failed with {len(errors)} errors:")
        for err in errors:
            print(f"  - {err}")
    else:
        print(f"SUCCESS: Validation successful! All {len(data)} moddas passed the checks.")

if __name__ == '__main__':
    validate()
