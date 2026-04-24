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

    # Track how many superscript variants have been seen for each base article number.
    # e.g. if we see "18 -modda." (space before dash) after already seeing "18-modda.",
    # we assign it modda="18_1", the next "18 -modda." becomes "18_2", etc.
    superscript_counts = {}

    def save_modda():
        if current_modda_num is None:
            return

        content_lines = list(current_modda_content)
        title = current_modda_title

        # Fix split titles.
        #
        # Case A — title continuation starts with lowercase:
        #   "11-modda. ...nisbatan\namal qilishi Oʻzbekiston..."
        #   Scan forward for the first uppercase word; everything before it is the
        #   title continuation, the rest stays as content.
        #
        # Case B — title is entirely missing (rest_of_line was empty):
        #   "198-modda.\n\nEkinzorlarni... nobud qilish Olovga ehtiyotsizlik..."
        #   The first uppercase word after position 0 marks the content sentence start;
        #   everything before it is the article title.
        if content_lines:
            first = content_lines[0].strip()
            if first and (first[0].islower() or not title):
                words = first.split(' ')
                start_scan = 0 if not title else 1
                split_idx = None
                for i, w in enumerate(words):
                    if i >= start_scan and i > 0 and w and w[0].isupper():
                        split_idx = i
                        break
                if split_idx is not None:
                    extracted = ' '.join(words[:split_idx])
                    content_rest = ' '.join(words[split_idx:])
                    title = (title + ' ' + extracted).strip()
                    content_lines[0] = content_rest
                else:
                    title = (title + ' ' + first).strip()
                    content_lines = content_lines[1:]

        # Strip all-uppercase section headers that leaked into content.
        # These appear right before the next article starts (e.g. "JAVOBGARLIK ASOSLARI").
        while content_lines:
            last = content_lines[-1].strip()
            if last.isupper() and len(last.split()) >= 2:
                content_lines.pop()
            else:
                break

        content_str = "\n".join(content_lines).strip()
        moddas.append({
            "modda": current_modda_num,
            "title": title,
            "content": content_str,
            "qism": current_qism,
            "bolim": current_bolim,
            "bob": current_bob,
        })

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # ── Section-level headers ─────────────────────────────────────────────

        # QISM (UMUMIY QISM / MAXSUS QISM)
        if re.match(r'^(UMUMIY|MAXSUS)\s+QISM$', line, re.IGNORECASE):
            save_modda()
            current_modda_num = None
            current_qism = line
            continue

        # BO'LIM
        if re.match(r"^[A-ZÀ-Ýʻ'']+\s+BO[ʻ'']LIM$", line):
            current_bolim = line
            continue

        # BOB  (e.g. "I bob. Jinoyat kodeksining vazifalari...")
        if re.match(r'^[IVXLC]+\s+bob\.', line, re.IGNORECASE):
            current_bob = line
            continue

        # All-uppercase standalone section titles between articles
        # (e.g. "JAVOBGARLIK ASOSLARI", "JAZO VA UNI TAYINLASH").
        # These are NOT article content — skip them entirely.
        if line.isupper() and len(line.split()) >= 2:
            continue

        # ── Article (modda) header ────────────────────────────────────────────
        #
        # Two surface forms appear in the extracted text:
        #   "18-modda."    → original article 18
        #   "18 -modda."   → superscript article (18¹, 18², …); the superscript
        #                    digit was lost during PDF extraction, leaving a space.
        #
        # We capture the optional space to tell them apart.
        modda_match = re.match(r'^(\d+)(\s+)?-\s*modda[.\s](.*)$', line, re.IGNORECASE)
        if modda_match:
            save_modda()

            base_num = int(modda_match.group(1))
            has_space = bool(modda_match.group(2))   # True → superscript article
            rest_of_line = modda_match.group(3).strip()

            if has_space:
                count = superscript_counts.get(base_num, 0) + 1
                superscript_counts[base_num] = count
                modda_num = f"{base_num}_{count}"
            else:
                modda_num = base_num

            current_modda_num = modda_num
            current_modda_title = rest_of_line
            current_modda_content = []
            continue

        # ── Content line ──────────────────────────────────────────────────────
        if current_modda_num is not None:
            # Skip any all-uppercase stray headers that appear mid-content
            if not (line.isupper() and len(line.split()) >= 2):
                current_modda_content.append(line)

    save_modda()

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(moddas, f, ensure_ascii=False, indent=2)

    print(f"Parsed {len(moddas)} moddas into {OUTPUT_PATH}")


if __name__ == '__main__':
    parse_code()
