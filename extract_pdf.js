const fs = require('fs');
const path = require('path');

// We need to use pdfjs-dist for Node.js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractPdfText(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    let fullText = '';
    const pagesData = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Sort items by Y position (top to bottom) then X (left to right)
        const items = content.items.sort((a, b) => {
            const yd = b.transform[5] - a.transform[5];
            return yd !== 0 ? Math.sign(yd) : a.transform[4] - b.transform[4];
        });
        
        let pageText = '';
        let lastY = null, lastX = null;
        
        for (const item of items) {
            const x = item.transform[4];
            const y = Math.round(item.transform[5]);
            
            if (lastY !== null && Math.abs(y - lastY) > 3) {
                pageText += '\n';
            } else if (lastX !== null && (x - lastX) > 4) {
                pageText += ' ';
            }
            
            pageText += item.str;
            lastX = x + (item.width || item.str.length * 6);
            lastY = y;
        }
        
        pagesData.push({
            pageNumber: i,
            text: pageText,
            rawItems: content.items.map(item => ({
                str: item.str,
                transform: item.transform,
                fontName: item.fontName,
                width: item.width,
                height: item.height
            }))
        });
        
        fullText += `\n=== PAGE ${i} ===\n` + pageText + '\n';
    }
    
    return {
        fileName: path.basename(pdfPath),
        numPages: pdf.numPages,
        fullText: fullText,
        pages: pagesData
    };
}

const pdfPath = path.join(__dirname, 'PCPD_Borba_123-26.pdf');

extractPdfText(pdfPath)
    .then(result => {
        const outputPath = path.join(__dirname, 'PCPD_Borba_123-26_extracted.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log('Extração concluída! Arquivo salvo em:', outputPath);
        console.log('\n=== TEXTO COMPLETO ===');
        console.log(result.fullText);
    })
    .catch(err => {
        console.error('Erro:', err);
    });