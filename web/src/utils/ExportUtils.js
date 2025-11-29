// Export/Import utilities for experiments

/**
 * Trigger file download
 */
export function downloadFile(content, filename, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file from input element
 */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        resolve(content);
      } catch (error) {
        reject(new Error('Failed to read file: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Validate imported experiment JSON
 */
export function validateImportJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.version) {
      return { valid: false, error: 'Missing version field' };
    }
    
    if (data.experiment) {
      // Single experiment
      if (!data.experiment.id && !data.experiment.name) {
        return { valid: false, error: 'Invalid experiment format' };
      }
      return { valid: true, type: 'single', data: data.experiment };
    } else if (data.experiments && Array.isArray(data.experiments)) {
      // Multiple experiments
      if (data.experiments.length === 0) {
        return { valid: false, error: 'Empty experiments array' };
      }
      return { valid: true, type: 'multiple', data: data.experiments };
    }
    
    return { valid: false, error: 'Invalid import format' };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON: ' + error.message };
  }
}

/**
 * Create file input element for importing
 */
export function createFileInput(accept = '.json', multiple = false) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) {
        reject(new Error('No file selected'));
        return;
      }
      
      Promise.all(files.map(readFile))
        .then(contents => resolve(contents))
        .catch(reject);
    };
    
    input.oncancel = () => reject(new Error('File selection cancelled'));
    input.click();
  });
}

/**
 * Export chart as image
 */
export function exportChartAsImage(chartRef, filename, format = 'png') {
  if (!chartRef || !chartRef.current) {
    throw new Error('Chart reference not available');
  }
  
  const svgElement = chartRef.current.querySelector('svg');
  if (!svgElement) {
    throw new Error('SVG element not found');
  }
  
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0f1c'; // Background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, filename, `image/${format}`);
      }
      URL.revokeObjectURL(url);
    }, `image/${format}`);
  };
  
  img.onerror = () => {
    URL.revokeObjectURL(url);
    throw new Error('Failed to export chart');
  };
  
  img.src = url;
}

