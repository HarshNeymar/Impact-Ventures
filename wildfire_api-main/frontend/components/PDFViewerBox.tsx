"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import PDF components to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then(mod => mod.Document),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8 text-teal-400">Loading PDF...</div> }
);

const Page = dynamic(
  () => import('react-pdf').then(mod => mod.Page),
  { ssr: false }
);

// Configure PDF.js worker (only on client)
if (typeof window !== 'undefined') {
  import('react-pdf').then((mod) => {
    mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

export function PDFViewerBox() {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfWidth, setPdfWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Set width based on container, with max width for larger screens
        const containerWidth = containerRef.current.offsetWidth;
        setPdfWidth(Math.min(containerWidth - 48, 900)); // 48px for padding, max 900px
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-lg border border-teal-500/30 shadow-lg shadow-teal-500/10 p-6 mb-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-teal-400 mb-2">
          IEEE Publication Paper
        </h3>
        <p className="text-sm text-gray-400">
          Our research paper published in the IEEE proceedings
        </p>
      </div>

      <div ref={containerRef} className="space-y-4 w-full">
        {/* Navigation Controls */}
        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-teal-500/20">
          <Button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            size="sm"
            variant="outline"
            className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>

          <div className="text-sm text-white font-medium">
            Page {pageNumber} of {numPages || '...'}
          </div>

          <Button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            size="sm"
            variant="outline"
            className="!bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-teal-700 !text-white !border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* PDF Viewer */}
        <div className="flex justify-center bg-slate-900/50 rounded-lg border border-teal-500/20 p-4">
          <Document
            file="/AAIML_camera-ready-paper.pdf"
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-12 text-teal-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
                  Loading PDF...
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-12 text-red-400">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Error loading PDF</p>
                  <p className="text-sm text-gray-400">Please try again later.</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={pdfWidth || undefined}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="pdf-page"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
