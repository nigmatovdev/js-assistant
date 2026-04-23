import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "raw.txt")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "clean.txt")

def clean_text():
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    clean_lines = []
    current_paragraph = []

    def save_paragraph():
        if current_paragraph:
            # Join lines with space
            text = " ".join(current_paragraph)
            # Remove multiple spaces
            text = re.sub(r'\s+', ' ', text).strip()
            # Normalize smart quotes to standard ASCII quotes
            text = text.replace('‘', "'").replace('’', "'").replace('“', '"').replace('”', '"')
            
            if text:
                clean_lines.append(text)
            current_paragraph.clear()

    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
            
        # Skip standalone numbers (page numbers or stray digits)
        if re.match(r'^\d+$', line):
            continue
            
        is_new_block = False
        
        # Check if line is ALL CAPS
        has_letters = bool(re.search(r'[a-zA-Zа-яА-Я]', line))
        is_all_caps = has_letters and line == line.upper()
        
        if is_all_caps:
            is_new_block = True
        elif re.match(r'^\d+\s*-\s*modda', line, re.IGNORECASE):
            is_new_block = True
        elif re.match(r'^[IVXLC]+\s+bob', line, re.IGNORECASE):
            is_new_block = True
        elif re.match(r'^[a-zа-я]\)', line, re.IGNORECASE):
            is_new_block = True
        elif re.match(r'^\d+\)', line):
            is_new_block = True
        elif line.startswith('—') or line.startswith('- '):
            is_new_block = True
            
        if is_new_block:
            save_paragraph()
            current_paragraph.append(line)
        else:
            if current_paragraph:
                last_word = current_paragraph[-1]
                # Start new paragraph if current line starts with Capital and last line ended with punctuation
                if line[0].isupper() and last_word.endswith(('.', '?', '!', ':', ';')):
                    save_paragraph()
            current_paragraph.append(line)
            
    save_paragraph()

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(clean_lines))
        
    print(f"Extraction complete. Cleaned text saved to {OUTPUT_PATH}")

if __name__ == '__main__':
    clean_text()
