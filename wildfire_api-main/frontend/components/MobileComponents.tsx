"use client"

import React from 'react';

interface MobileRestrictionModalProps {
  show: boolean;
  onClose: () => void;
}

export function MobileRestrictionModal({ show, onClose }: MobileRestrictionModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Content Not Available
        </h3>
        <p className="text-gray-600 mb-6">
          The Air Pollution content is not available on mobile screens. Please use a tablet or desktop device to access this feature.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function MobileEmissionMessage({ onGoToRisk }: { onGoToRisk: () => void }) {
  return (
    <div className="block md:hidden">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <svg
            className="w-20 h-20 mx-auto text-gray-400 mb-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Content Not Available
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            The emission map content is optimized for larger screens and is not available on mobile devices. Please use a tablet or desktop to access this feature.
          </p>
          <button
            onClick={onGoToRisk}
            className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            Go to Risk Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
