import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import html2pdf from 'html2pdf.js'

export interface ExportOptions {
  filename?: string
  quality?: number
  format?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
}

/**
 * Enhanced color sanitization for export - converts all modern CSS colors to compatible formats
 */
const sanitizeColorsForExport = (element: HTMLElement): HTMLElement => {
  const clonedElement = element.cloneNode(true) as HTMLElement
  
  // Comprehensive OKLCH to hex color mappings (based on common CSS frameworks)
  const oklchMappings: { [key: string]: string } = {
    // Blue colors
    'oklch(0.628 0.258 262.1)': '#3b82f6',
    'oklch(0.7 0.2 262)': '#60a5fa',
    'oklch(0.5 0.3 262)': '#1d4ed8',
    'oklch(0.4 0.35 262)': '#1e3a8a',
    'oklch(0.8 0.15 262)': '#93c5fd',
    'oklch(0.9 0.1 262)': '#dbeafe',
    
    // Green colors
    'oklch(0.65 0.25 142)': '#10b981',
    'oklch(0.62 0.24 142)': '#059669',
    'oklch(0.55 0.22 142)': '#047857',
    'oklch(0.75 0.2 142)': '#34d399',
    'oklch(0.85 0.15 142)': '#6ee7b7',
    'oklch(0.92 0.1 142)': '#d1fae5',
    
    // Red colors
    'oklch(0.6 0.3 27)': '#dc2626',
    'oklch(0.55 0.32 27)': '#b91c1c',
    'oklch(0.7 0.25 27)': '#ef4444',
    'oklch(0.75 0.2 27)': '#f87171',
    'oklch(0.85 0.15 27)': '#fca5a5',
    'oklch(0.92 0.1 27)': '#fee2e2',
    
    // Orange colors
    'oklch(0.7 0.2 27)': '#f97316',
    'oklch(0.65 0.25 27)': '#ea580c',
    'oklch(0.75 0.18 40)': '#fb923c',
    'oklch(0.85 0.12 40)': '#fdba74',
    
    // Yellow colors
    'oklch(0.85 0.1 90)': '#facc15',
    'oklch(0.8 0.15 90)': '#eab308',
    'oklch(0.9 0.08 90)': '#fde047',
    'oklch(0.95 0.05 90)': '#fef3c7',
    
    // Purple colors
    'oklch(0.6 0.25 270)': '#8b5cf6',
    'oklch(0.55 0.3 270)': '#7c3aed',
    'oklch(0.7 0.2 270)': '#a78bfa',
    'oklch(0.85 0.12 270)': '#c4b5fd',
    
    // Gray colors
    'oklch(0.15 0 0)': '#1f2937',
    'oklch(0.2 0 0)': '#374151',
    'oklch(0.3 0 0)': '#4b5563',
    'oklch(0.4 0 0)': '#6b7280',
    'oklch(0.5 0 0)': '#9ca3af',
    'oklch(0.6 0 0)': '#d1d5db',
    'oklch(0.7 0 0)': '#e5e7eb',
    'oklch(0.8 0 0)': '#f3f4f6',
    'oklch(0.9 0 0)': '#f9fafb',
    'oklch(0.95 0 0)': '#ffffff',
    'oklch(0.98 0 0)': '#ffffff',
    'oklch(0 0 0)': '#000000',
    
    // TSA Brand Blue
    'oklch(0.35 0.15 262)': '#004aad',
    'oklch(0.3 0.18 262)': '#003888',
  }
  
  // Enhanced color conversion function
  const convertModernColor = (colorValue: string): string => {
    // Normalize the color string
    const normalizedColor = colorValue.trim().toLowerCase()
    
    // Direct mapping lookup (most reliable)
    for (const [oklch, hex] of Object.entries(oklchMappings)) {
      if (normalizedColor.includes(oklch.toLowerCase())) {
        return hex
      }
    }
    
    // Handle oklch() with any format
    const oklchRegex = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/i
    const oklchMatch = normalizedColor.match(oklchRegex)
    
    if (oklchMatch) {
      const [, l, c, h] = oklchMatch
      const lightness = parseFloat(l)
      const chroma = parseFloat(c)
      const hue = parseFloat(h)
      
      // Convert based on hue and lightness ranges
      if (hue >= 220 && hue <= 280) { // Blue range
        if (lightness > 0.8) return '#dbeafe'
        if (lightness > 0.7) return '#93c5fd'
        if (lightness > 0.6) return '#60a5fa'
        if (lightness > 0.5) return '#3b82f6'
        if (lightness > 0.4) return '#1d4ed8'
        return '#1e3a8a'
      } else if (hue >= 120 && hue <= 180) { // Green range
        if (lightness > 0.8) return '#d1fae5'
        if (lightness > 0.7) return '#6ee7b7'
        if (lightness > 0.6) return '#34d399'
        if (lightness > 0.5) return '#10b981'
        if (lightness > 0.4) return '#059669'
        return '#047857'
      } else if (hue >= 0 && hue <= 60) { // Red/Orange range
        if (lightness > 0.8) return '#fee2e2'
        if (lightness > 0.7) return '#fca5a5'
        if (lightness > 0.6) return '#f87171'
        if (lightness > 0.5) return '#ef4444'
        if (lightness > 0.4) return '#dc2626'
        return '#b91c1c'
      } else if (hue >= 60 && hue <= 120) { // Yellow/Green range
        if (lightness > 0.8) return '#fef3c7'
        if (lightness > 0.7) return '#fde047'
        return '#eab308'
      } else if (hue >= 280 && hue <= 320) { // Purple range
        if (lightness > 0.8) return '#e9d5ff'
        if (lightness > 0.7) return '#c4b5fd'
        if (lightness > 0.6) return '#a78bfa'
        if (lightness > 0.5) return '#8b5cf6'
        return '#7c3aed'
      }
      
      // Fallback based on lightness for unknown hues
      if (lightness > 0.9) return '#ffffff'
      if (lightness > 0.8) return '#f3f4f6'
      if (lightness > 0.6) return '#9ca3af'
      if (lightness > 0.4) return '#6b7280'
      if (lightness > 0.2) return '#374151'
      return '#000000'
    }
    
    // Handle other modern color functions
    if (normalizedColor.includes('lab(') || normalizedColor.includes('lch(') || normalizedColor.includes('color(')) {
      // Extract lightness if possible and return safe fallback
      const labMatch = normalizedColor.match(/(?:lab|lch|color)\(\s*([\d.%]+)/i)
      if (labMatch) {
        const lightness = parseFloat(labMatch[1])
        if (lightness > 80) return '#f3f4f6'
        if (lightness > 60) return '#9ca3af'
        if (lightness > 40) return '#6b7280'
        if (lightness > 20) return '#374151'
        return '#1f2937'
      }
      return '#6b7280' // Safe gray fallback
    }
    
    // If no conversion possible, return original
    return colorValue
  }
  
  // Get all elements in the cloned tree
  const queriedElements = Array.from(clonedElement.querySelectorAll('*'))
  const allElements = [clonedElement, ...queriedElements] as HTMLElement[]
  
  allElements.forEach(el => {
    try {
      // Get computed styles
      const computedStyle = window.getComputedStyle(el)
      
      // List of all possible color properties
      const colorProperties = [
        'color', 'backgroundColor', 'borderColor', 
        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'boxShadow', 'textShadow', 'fill', 'stroke', 'outline', 'outlineColor',
        'textDecorationColor', 'caretColor', 'accentColor'
      ]
      
      colorProperties.forEach(prop => {
        try {
          const computedValue = computedStyle.getPropertyValue(prop)
          const inlineValue: string = el.style.getPropertyValue(prop)
          
          // Process computed styles
          if (computedValue && (
            computedValue.includes('oklch') || 
            computedValue.includes('lab(') || 
            computedValue.includes('lch(') || 
            computedValue.includes('color(')
          )) {
            const convertedColor = convertModernColor(computedValue)
            if (convertedColor !== computedValue) {
              el.style.setProperty(prop, convertedColor, 'important')
            }
          }
          
          // Process inline styles
          if (inlineValue && (
            inlineValue.includes('oklch') || 
            inlineValue.includes('lab(') || 
            inlineValue.includes('lch(') || 
            inlineValue.includes('color(')
          )) {
            const convertedColor = convertModernColor(inlineValue)
            if (convertedColor !== inlineValue) {
              el.style.setProperty(prop, convertedColor, 'important')
            }
          }
        } catch (propError) {
          console.warn(`Error processing property ${prop}:`, propError)
        }
      })
      
      // Handle inline styles with modern color functions
      const inlineStyle = el.getAttribute('style')
      if (inlineStyle && (
        inlineStyle.includes('oklch') || 
        inlineStyle.includes('lab(') || 
        inlineStyle.includes('lch(') || 
        inlineStyle.includes('color(')
      )) {
        let newStyle = inlineStyle
        
        // Replace all modern color functions
        const modernColorRegex = /(oklch|lab|lch|color)\([^)]+\)/gi
        newStyle = newStyle.replace(modernColorRegex, (match) => {
          const converted = convertModernColor(match)
          return converted !== match ? converted : '#6b7280'
        })
        
        el.setAttribute('style', newStyle)
      }
      
      // Handle CSS custom properties (--variables)
      const allProps = Array.from(computedStyle)
      allProps.forEach(prop => {
        if (prop.startsWith('--')) {
          const value = computedStyle.getPropertyValue(prop)
          if (value && (
            value.includes('oklch') || 
            value.includes('lab(') || 
            value.includes('lch(') || 
            value.includes('color(')
          )) {
            const converted = convertModernColor(value)
            if (converted !== value) {
              el.style.setProperty(prop, converted, 'important')
            }
          }
        }
      })
      
    } catch (elementError) {
      console.warn('Error processing element:', elementError)
      // Continue with next element
    }
  })
  
  return clonedElement
}

/**
 * Export HTML element as PNG image
 */
export const exportAsPNG = async (
  element: HTMLElement, 
  options: ExportOptions = {}
): Promise<void> => {
  try {
    console.log('Starting PNG export with color sanitization...')
    
    // Sanitize colors before export
    const sanitizedElement = sanitizeColorsForExport(element)
    
    // Temporarily add to DOM for html2canvas
    sanitizedElement.style.position = 'fixed'
    sanitizedElement.style.top = '-9999px'
    sanitizedElement.style.left = '-9999px'
    sanitizedElement.style.width = element.scrollWidth + 'px'
    sanitizedElement.style.height = element.scrollHeight + 'px'
    document.body.appendChild(sanitizedElement)
    
    console.log('Creating canvas...')
    const canvas = await html2canvas(sanitizedElement, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      foreignObjectRendering: false, // Disable to avoid color issues
      ignoreElements: (element) => {
        // Ignore elements that might cause issues
        return element.tagName === 'SCRIPT' || 
               element.tagName === 'STYLE' ||
               element.tagName === 'NOSCRIPT'
      }
    })

    // Remove temporary element
    document.body.removeChild(sanitizedElement)
    
    console.log('Converting to blob...')
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('PNG export successful')
        saveAs(blob, options.filename || 'marketing-material.png')
      } else {
        throw new Error('Failed to generate PNG blob')
      }
    }, 'image/png', options.quality || 0.95)
    
  } catch (error) {
    console.error('PNG export failed:', error)
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('oklch') || error.message.includes('color')) {
        throw new Error('Export failed due to unsupported color format. The page contains modern CSS colors that need conversion. Please try again.')
      } else if (error.message.includes('canvas')) {
        throw new Error('Canvas rendering failed. Please try refreshing the page and try again.')
      } else if (error.message.includes('CORS')) {
        throw new Error('Cross-origin issue detected. Please refresh the page and try again.')
      }
    }
    
    throw new Error('PNG export failed. Please refresh the page and try again.')
  }
}

/**
 * Export HTML element as PDF using html2pdf.js (better quality)
 */
export const exportAsPDF = async (
  element: HTMLElement, 
  options: ExportOptions = {}
): Promise<void> => {
  try {
    console.log('Starting PDF export with color sanitization...')
    
    // Sanitize colors before export
    const sanitizedElement = sanitizeColorsForExport(element)
    
    // Temporarily add to DOM for html2pdf
    sanitizedElement.style.position = 'fixed'
    sanitizedElement.style.top = '-9999px'
    sanitizedElement.style.left = '-9999px'
    document.body.appendChild(sanitizedElement)
    
    const opt = {
      margin: 0.5,
      filename: options.filename || 'marketing-material.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        foreignObjectRendering: false,
        ignoreElements: (element: Element) => {
          return element.tagName === 'SCRIPT' || 
                 element.tagName === 'STYLE' ||
                 element.tagName === 'NOSCRIPT'
        }
      },
      jsPDF: { 
        unit: 'in', 
        format: options.format || 'a4', 
        orientation: options.orientation || 'portrait' 
      }
    }

    await html2pdf().set(opt).from(sanitizedElement).save()
    
    // Remove temporary element
    document.body.removeChild(sanitizedElement)
    console.log('PDF export successful')
    
  } catch (error) {
    console.error('PDF export failed:', error)
    
    if (error instanceof Error && (error.message.includes('oklch') || error.message.includes('color'))) {
      throw new Error('Export failed due to unsupported color format. Please try refreshing the page and try again.')
    }
    throw new Error('Failed to export as PDF. Please try refreshing the page.')
  }
}

/**
 * Enhanced print function that preserves styling
 */
export const printWithStyling = (element: HTMLElement, title?: string): void => {
  try {
    // Sanitize colors before printing
    const sanitizedElement = sanitizeColorsForExport(element)
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Failed to open print window')
    }

    // Get all stylesheets from the current document
    const stylesheets = Array.from(document.styleSheets)
    let allCSS = ''

    // Extract CSS rules
    stylesheets.forEach(stylesheet => {
      try {
        if (stylesheet.cssRules) {
          Array.from(stylesheet.cssRules).forEach(rule => {
            allCSS += rule.cssText + '\n'
          })
        }
      } catch (e) {
        // Handle CORS issues with external stylesheets
        console.warn('Could not access stylesheet:', e)
      }
    })

    // Add Tailwind and custom styles directly
    const additionalCSS = `
      @import url('https://cdn.tailwindcss.com');
      
      body { 
        font-family: system-ui, -apple-system, sans-serif; 
        margin: 0; 
        padding: 20px;
        background: white;
      }
      
      @media print {
        body { margin: 0; padding: 10px; }
        @page { margin: 0.5in; size: auto; }
      }
    `

    // Write the complete HTML document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Print Preview'}</title>
          <style>${additionalCSS}</style>
          <style>${allCSS}</style>
        </head>
        <body>
          ${sanitizedElement.outerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  } catch (error) {
    console.error('Print failed:', error)
    throw new Error('Failed to print document')
  }
}

/**
 * Copy HTML content to clipboard
 */
export const copyToClipboard = async (content: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(content)
  } catch (error) {
    console.error('Clipboard copy failed:', error)
    throw new Error('Failed to copy to clipboard')
  }
}

/**
 * Download HTML content as file
 */
export const downloadAsHTML = (content: string, filename?: string): void => {
  try {
    // Sanitize colors in HTML content before download
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const sanitizedDiv = sanitizeColorsForExport(tempDiv)
    const sanitizedContent = sanitizedDiv.innerHTML
    
    const blob = new Blob([sanitizedContent], { type: 'text/html;charset=utf-8' })
    saveAs(blob, filename || 'marketing-material.html')
  } catch (error) {
    console.error('HTML download failed:', error)
    throw new Error('Failed to download HTML file')
  }
} 