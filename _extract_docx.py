import zipfile, re

z = zipfile.ZipFile('PCPD MODELO.docx')
data = z.read('word/document.xml')
matches = re.findall(rb'<w:t[^>]*>([^<]+)</w:t>', data)
with open('_docx_texts.txt', 'w', encoding='utf-8') as f:
    f.write(f'Found {len(matches)} text segments\n')
    for m in matches:
        f.write(m.decode('utf-8', errors='replace') + '\n')
print(f'Written {len(matches)} segments')
