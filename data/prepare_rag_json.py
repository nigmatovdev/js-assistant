import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "parsed.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "structured.json")

_SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}


def modda_display(modda):
    """Return a human-readable article label, e.g. 18 → '18', '18_1' → '18¹'."""
    s = str(modda)
    if '_' in s:
        base, sup = s.split('_', 1)
        sup_str = ''.join(_SUPERSCRIPT_MAP.get(c, c) for c in sup)
        return f"{base}{sup_str}"
    return s


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

        # Maintain unique ordered lists to derive stable numeric indices
        if qism and qism not in qisms:
            qisms.append(qism)
        if bolim and bolim not in bolims:
            bolims.append(bolim)
        if bob and bob not in bobs:
            bobs.append(bob)

        q_idx = qisms.index(qism) + 1 if qism else 0
        bl_idx = bolims.index(bolim) + 1 if bolim else 0
        b_idx = bobs.index(bob) + 1 if bob else 0

        # Unique ID — modda is now always unique (superscript variants use "N_K" form)
        item_id = f"JK_{q_idx}_{bl_idx}_{b_idx}_{modda}"

        display = modda_display(modda)
        modda_label = f"{display}-modda"

        path_parts = [p for p in [qism, bolim, bob, modda_label] if p]
        full_path = " > ".join(path_parts)

        search_text = f"{modda_label} {title} {content}".strip()

        structured_item = {
            "id": item_id,
            "modda": modda,
            "modda_display": display,
            "title": title,
            "content": content,
            "hierarchy": {
                "qism": qism,
                "bolim": bolim,
                "bob": bob,
            },
            "full_path": full_path,
            "search_text": search_text,
            "keywords": [],
        }

        structured_data.append(structured_item)

    # Sanity check: all IDs must be unique
    ids = [item["id"] for item in structured_data]
    dupes = [id_ for id_ in ids if ids.count(id_) > 1]
    if dupes:
        print(f"WARNING: {len(set(dupes))} duplicate IDs remain: {set(dupes)}")
    else:
        print("All IDs are unique.")

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(structured_data, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(structured_data)} moddas into {OUTPUT_PATH}")


if __name__ == '__main__':
    process()
