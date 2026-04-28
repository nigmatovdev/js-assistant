import sys
import os
import json

# Add current dir to path
sys.path.insert(0, ".")

from back.rag.pipeline import ask_stream

def test_api():
    question = "Jinoyat kodeksi nima?"
    model = "inclusionai/ling-2.6-1t:free"
    print(f"Testing API with question: {question} and model: {model}")
    print("-" * 50)
    
    tokens_received = 0
    try:
        for kind, value in ask_stream(question, provider="api", model=model):
            print(f"Kind: {kind}, Value: {value!r}")
            if kind == "token":
                tokens_received += 1
        
        print("\n" + "-" * 50)
        if tokens_received == 0:
            print("FAILED: No tokens received!")
        else:
            print(f"SUCCESS: Received {tokens_received} tokens.")
            
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")

if __name__ == "__main__":
    test_api()
