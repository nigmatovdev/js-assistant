import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(SCRIPT_DIR, "structured.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "chunks.json")

def chunk_text(text, max_len=500):
    # Split by sentences (looking for ., !, ?, or \n followed by space)
    sentences = re.split(r'(?<=[.!?\n])\s+', text.strip())
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence: 
            continue
        
        # If the sentence itself is longer than max_len, we split by words
        if len(sentence) > max_len:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
            
            words = sentence.split(' ')
            for word in words:
                if len(current_chunk) + len(word) + 1 <= max_len:
                    current_chunk += word + " "
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = word + " "
        else:
            # Check if adding the sentence would exceed max_len
            if len(current_chunk) + len(sentence) + 1 <= max_len:
                current_chunk += sentence + " "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + " "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

def process():
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_chunks = []

    for item in data:
        # We'll chunk the search_text to ensure modda number and title context is in the text if possible
        # Or we can just chunk the content, but search_text is already prepared for indexing.
        text_to_chunk = item.get("search_text", "")
        if not text_to_chunk:
            text_to_chunk = item.get("content", "")

        chunks = chunk_text(text_to_chunk, max_len=500)
        
        for idx, chunk in enumerate(chunks):
            chunk_id = idx + 1
            all_chunks.append({
                "id": f"{item['id']}_chunk_{chunk_id}",
                "modda": item["modda"],
                "chunk_id": chunk_id,
                "text": chunk,
                "metadata": {
                    "qism": item["hierarchy"]["qism"],
                    "bolim": item["hierarchy"]["bolim"],
                    "bob": item["hierarchy"]["bob"],
                    "title": item["title"]
                }
            })

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(data)} moddas into {len(all_chunks)} chunks.")
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == '__main__':
    process()
