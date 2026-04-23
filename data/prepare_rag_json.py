import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "parsed.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "structured.json")

def process():
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    structured_data = []

    qisms = []
    bolims = []
    bobs = []

    for item in data:
        qism = item.get("qism", "")
        bolim = item.get("bolim", "")
        bob = item.get("bob", "")
        modda = item.get("modda", "")
        title = item.get("title", "")
        content = item.get("content", "")

        # Maintain unique lists to act as indices
        if qism and qism not in qisms:
            qisms.append(qism)
        if bolim and bolim not in bolims:
            bolims.append(bolim)
        if bob and bob not in bobs:
            bobs.append(bob)

        q_idx = qisms.index(qism) + 1 if qism else 0
        bl_idx = bolims.index(bolim) + 1 if bolim else 0
        b_idx = bobs.index(bob) + 1 if bob else 0

        # Construct ID
        item_id = f"JK_{q_idx}_{bl_idx}_{b_idx}_{modda}"

        # Construct full path
        path_parts = [p for p in [qism, bolim, bob, f"{modda}-modda"] if p]
        full_path = " > ".join(path_parts)

        # Construct search text
        search_text = f"{modda}-modda {title} {content}".strip()

        structured_item = {
            "id": item_id,
            "modda": modda,
            "title": title,
            "content": content,
            "hierarchy": {
                "qism": qism,
                "bolim": bolim,
                "bob": bob
            },
            "full_path": full_path,
            "search_text": search_text,
            "keywords": []
        }

        structured_data.append(structured_item)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(structured_data, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(structured_data)} moddas into {OUTPUT_PATH}")

if __name__ == '__main__':
    process()
