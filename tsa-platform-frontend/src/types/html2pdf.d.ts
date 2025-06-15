declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: {
      type?: string
      quality?: number
    }
    html2canvas?: {
      scale?: number
      useCORS?: boolean
      allowTaint?: boolean
      backgroundColor?: string
    }
    jsPDF?: {
      unit?: string
      format?: string | number[]
      orientation?: string
    }
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf
    from(element: HTMLElement): Html2Pdf
    save(): Promise<void>
    output(type?: string): Promise<any>
    outputPdf(type?: string): Promise<any>
    outputImg(type?: string): Promise<any>
  }

  function html2pdf(): Html2Pdf
  export = html2pdf
} 