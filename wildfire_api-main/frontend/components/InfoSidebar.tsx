"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface InfoSlide {
  title: string;
  content: React.ReactNode;
}

const slides: InfoSlide[] = [
  {
    title: "The Story",
    content: (
      <p className="text-sm leading-relaxed text-white">
        We saw a critical gap: when wildfires aren't making the national news, they often disappear from public view. Yet, countless smaller fires continue to burn, and the underlying risks to our environment are constantly growing. Here is an unfiltered, continuous view of the wildfire reality across the USA. Our goal is to move beyond the headlines to equip you with the full picture of our changing landscape.
      </p>
    )
  },
  {
    title: "The Interactive Map",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          This map uses orange bubbles to indicate wildfire activity across the country. While major disasters get the most attention, our map includes the smaller fire events that often go unnoticed by traditional media, yet leaving cumulative marks.
        </p>
        <p>By aggregating this data, we offer a clear view of:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong className="text-teal-400">Regional Trends:</strong> Filter by Date, State, and County to see exactly how fire patterns have shifted in your specific area.</li>
          <li><strong className="text-teal-400">Real-World Impact:</strong> Visualize the frequency of fire in different regions to understand which communities and ecosystems are most frequently at risk.</li>
        </ul>
      </div>
    )
  },
  {
    title: "Education Through Interaction",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          We believe that understanding the why is just as important as seeing the where. We designed this educational tool to allows you to explore the environmental factors that drive fire behavior.
        </p>
        <p>
          By interacting with parameters such as Temperature, Humidity, Fuel Moisture Class, and Duff Layer Fraction, you can learn how different climatic conditions directly influence the intensity of a fire. Seeing how "Prefire Fuel" or "Cover Type" changes the map helps bridge the gap between abstract science and real-world consequences.
        </p>
      </div>
    )
  },
  {
    title: "Predictive Insights for Better Awareness",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-white">
        <p>
          To help you understand the severity of an incident at a glance, we provide real-time KPI Intelligence Cards. These are designed to translate complex data into easy-to-understand metrics:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong className="text-teal-400">Current Risk Level:</strong> A simple 1–10 scale to communicate the urgency of a specific fire event.</li>
          <li><strong className="text-teal-400">Burning Index & Wind Speed:</strong> Key indicators of how a fire moves and how difficult it is to manage.</li>
          <li><strong className="text-teal-400">Duration & Prediction:</strong> We provide data-driven insights into fire longevity, helping you understand the likelihood of a fire being contained by the following day.</li>
        </ul>
      </div>
    )
  }
];

interface InfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  hideHeader?: boolean;
  currentTab?: string;
}

// Define content for different tabs
const getTabSlides = (tab: string): InfoSlide[] => {
  switch (tab) {
    case 'air-pollution':
      return [
        {
          title: "Air Quality & Emissions",
          content: (
            <p className="text-sm leading-relaxed text-white">
              Understanding air pollution and emissions patterns is crucial for environmental and public health. This section provides insights into how various pollutants affect our air quality and contribute to climate change.
            </p>
          )
        },
        {
          title: "Emission Sources",
          content: (
            <div className="space-y-3 text-sm leading-relaxed text-white">
              <p>Track the major sources of air pollution including:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-teal-400">Industrial Sources:</strong> Manufacturing, power plants, and chemical processes</li>
                <li><strong className="text-teal-400">Transportation:</strong> Vehicle emissions, aviation, and shipping</li>
                <li><strong className="text-teal-400">Natural Sources:</strong> Wildfires, dust, and volcanic activity</li>
              </ul>
            </div>
          )
        }
      ];
    case 'fire-forecast':
    default:
      return slides; // Default fire forecast slides
  }
};

export function InfoSidebar({ isOpen, onClose, hideHeader = false, currentTab = 'fire-forecast' }: InfoSidebarProps) {
  const slidesToUse = getTabSlides(currentTab);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidesToUse.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slidesToUse.length) % slidesToUse.length);
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-card relative border-r border-border">
      {!hideHeader && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-teal-500 via-cyan-600 to-teal-700">
          <h2 className="font-semibold text-white">Info</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="hidden md:flex h-8 w-8 text-white hover:bg-teal-800/50">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-4 text-teal-600">{slidesToUse[currentSlide].title}</h3>
          {slidesToUse[currentSlide].content}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between gap-4">
              <Button 
                variant="default" 
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Prev
              </Button>
          <span className="text-xs text-muted-foreground font-medium">
            {currentSlide + 1} / {slidesToUse.length}
          </span>
          <Button 
            variant="default" // Changed to default variant (filled)
            onClick={nextSlide}
            disabled={currentSlide === slidesToUse.length - 1}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" // Added explicit coloring to match theme
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
