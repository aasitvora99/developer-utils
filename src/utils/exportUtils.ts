import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportAsImage = async (element: HTMLElement, filename: string, format: 'png' | 'jpg') => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
  }
};

export const exportAsPDF = async (element: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
  }
};

export const exportAsHTML = (content: string, filename: string) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .diff-added { background-color: #d4edda; color: #155724; }
        .diff-removed { background-color: #f8d7da; color: #721c24; }
        .diff-unchanged { background-color: #f8f9fa; color: #495057; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${filename}</h1>
        <div>${content}</div>
        <p><small>Generated on ${new Date().toLocaleString()}</small></p>
    </div>
</body>
</html>`;
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const link = document.createElement('a');
  link.download = `${filename}.html`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
};