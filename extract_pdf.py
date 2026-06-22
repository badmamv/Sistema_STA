import fitz  # PyMuPDF
import json
import sys

def extract_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    result = {
        "fileName": pdf_path.split('\\')[-1],
        "numPages": len(doc),
        "fullText": "",
        "pages": []
    }
    
    for i, page in enumerate(doc):
        # Get text with position info
        blocks = page.get_text("dict")["blocks"]
        page_text = ""
        
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    line_text = ""
                    for span in line["spans"]:
                        line_text += span["text"]
                    page_text += line_text + "\n"
        
        result["pages"].append({
            "pageNumber": i + 1,
            "text": page_text.strip()
        })
        result["fullText"] += f"\n=== PAGE {i+1} ===\n{page_text}\n"
    
    doc.close()
    return result

if __name__ == "__main__":
    pdf_path = r"H:\Meu Drive\Inteligência Artificial\INTELIGÊNCIA ARTIFICIAL\STA\Sistema_STA\PCPD_Borba_123-26.pdf"
    
    try:
        import fitz
    except ImportError:
        print("PyMuPDF não instalado. Instalando...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf"])
        import fitz
    
    result = extract_pdf(pdf_path)
    
    output_path = r"H:\Meu Drive\Inteligência Artificial\INTELIGÊNCIA ARTIFICIAL\STA\Sistema_STA\PCPD_Borba_123-26_extracted.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"Extração concluída! Arquivo salvo em: {output_path}")
    print("\n=== TEXTO COMPLETO ===")
    print(result["fullText"])