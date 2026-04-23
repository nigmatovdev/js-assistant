import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "clean.txt")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "parsed.json")

def parse_code():
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_qism = ""
    current_bolim = ""
    current_bob = ""
    
    current_modda_num = None
    current_modda_title = ""
    current_modda_content = []
    
    moddas = []
    
    def save_modda():
        if current_modda_num is not None:
            # We try to separate the title from the content if they were merged.
            # In clean.txt, the title is often the first few words before the actual paragraph starts.
            # We will just treat the first line as having the title.
            
            content_str = "\n".join(current_modda_content).strip()
            moddas.append({
                "modda": current_modda_num,
                "title": current_modda_title,
                "content": content_str,
                "qism": current_qism,
                "bolim": current_bolim,
                "bob": current_bob
            })

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check QISM
        if re.match(r'^(UMUMIY|MAXSUS)\s+QISM$', line, re.IGNORECASE):
            current_qism = line
            continue
            
        # Check BO'LIM
        if re.match(r'^[A-Zʻ\'’]+\s+BO[ʻ\'’]LIM$', line):
            current_bolim = line
            continue
            
        # Check BOB
        bob_match = re.match(r'^([IVXLC]+)\s+bob\.\s+(.*)$', line, re.IGNORECASE)
        if bob_match:
            # e.g., "I bob. Jinoyat kodeksining vazifalari va prinsiplari"
            current_bob = line
            continue
            
        # Check MODDA
        modda_match = re.match(r'^(\d+(?:\s*-\s*\d+)?)\s*-\s*modda\.\s*(.*)$', line, re.IGNORECASE)
        if modda_match:
            save_modda()
            
            num_str = modda_match.group(1).strip()
            rest_of_line = modda_match.group(2).strip()
            
            # Convert num_str to int or string if it contains a dash
            try:
                modda_num = int(num_str)
            except ValueError:
                modda_num = num_str # fallback for things like "18 - 1"
            
            current_modda_num = modda_num
            
            # Since the title and first paragraph might be merged in clean.txt,
            # we will attempt a simple heuristic: the title is usually short and 
            # might not have a period. But to be safe and not lose text, 
            # we put the rest_of_line into content, or try to split it.
            # Let's just put the rest_of_line as title initially, but if it's long, 
            # it means it has content.
            # We'll split by the first period. BUT titles don't have periods.
            # So if we can't cleanly split, we'll assign the whole line to content and leave title empty.
            
            current_modda_title = rest_of_line
            current_modda_content = []
            continue
            
        # If it's not any of the headers, it belongs to the current modda's content
        if current_modda_num is not None:
            current_modda_content.append(line)

    save_modda()

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(moddas, f, ensure_ascii=False, indent=2)
        
    print(f"Parsed {len(moddas)} moddas into {OUTPUT_PATH}")

if __name__ == '__main__':
    parse_code()
