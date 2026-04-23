"""
Extract raw text from Jinoyat Kodeksi PDF using PyMuPDF (fitz).
Processes all pages sequentially and saves to raw.txt in UTF-8.
"""

import fitz  # PyMuPDF
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(SCRIPT_DIR, "uz-crim-code.pdf")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "raw.txt")


def extract_text(pdf_path: str, output_path: str) -> None:
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"Opened: {pdf_path}  ({total_pages} pages)")

    with open(output_path, "w", encoding="utf-8") as out:
        for page_num in range(total_pages):
            page = doc[page_num]
            text = page.get_text()       # preserves line breaks, no cleaning
            out.write(text)
            print(f"  Page {page_num + 1}/{total_pages} extracted")

    doc.close()
    print(f"\nDone — saved to {output_path}")


if __name__ == "__main__":
    extract_text(PDF_PATH, OUTPUT_PATH)
