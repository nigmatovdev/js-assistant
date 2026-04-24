import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "structured.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "chunks.json")

def chunk_text(text, max_len=800, min_len=120):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(sentence) > max_len:
            if current:
                chunks.append(current.strip())
                current = ""
            words = sentence.split()
            for word in words:
                if len(current) + len(word) + 1 <= max_len:
                    current += word + " "
                else:
                    if current:
                        chunks.append(current.strip())
                    current = word + " "
        else:
            if len(current) + len(sentence) + 1 <= max_len:
                current += sentence + " "
            else:
                if current:
                    chunks.append(current.strip())
                current = sentence + " "

    if current:
        chunks.append(current.strip())

    # Merge short trailing fragments into the previous chunk
    result = []
    for chunk in chunks:
        if result and len(chunk) < min_len:
            result[-1] = result[-1] + " " + chunk
        else:
            result.append(chunk)

    return result

def process():
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_chunks = []

    for item in data:
        # Chunk the content only; prefix every chunk with article ID + title
        # so every chunk is self-contained and embeds with full context.
        modda_prefix = f"{item['modda_display']}-modda. {item['title']}."
        content = item.get("content", "").strip()
        text_to_chunk = content if content else item.get("title", "")

        raw_chunks = chunk_text(text_to_chunk, max_len=800)

        for idx, chunk in enumerate(raw_chunks):
            chunk_id = idx + 1
            all_chunks.append({
                "id": f"{item['id']}_chunk_{chunk_id}",
                "modda": item["modda"],
                "modda_display": item["modda_display"],
                "chunk_id": chunk_id,
                "text": f"{modda_prefix} {chunk}",
                "metadata": {
                    "qism": item["hierarchy"]["qism"],
                    "bolim": item["hierarchy"]["bolim"],
                    "bob": item["hierarchy"]["bob"],
                    "title": item["title"],
                    "modda_display": item["modda_display"],
                }
            })

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(data)} moddas into {len(all_chunks)} chunks.")
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == '__main__':
    process()
