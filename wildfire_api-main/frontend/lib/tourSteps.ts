import { TourStep } from "@/components/ui/tour"

export const riskMapTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to the Fire Forecast",
    content: "This interactive tool helps you assess wildfire risk by analyzing environmental conditions and fire behavior. Let's take a quick tour to show you how it works!",
    target: "[data-tour='main-container']",
    position: "bottom"
  },
  {
    id: "date-state-county",
    title: "Select Location & Date",
    content: "Start by selecting the date, state, and county you want to analyze. This determines the geographic area and time period for your risk assessment. The date must be between January 1 and September 30.",
    target: "[data-tour='location-controls']",
    position: "bottom"
  },
  {
    id: "environmental-parameters",
    title: "Environmental Parameters",
    content: "These sliders let you adjust key environmental factors that affect fire risk. Hover over the info icons to learn what each parameter means and how it impacts fire behavior. You can fine-tune conditions to match your specific scenario.",
    target: "[data-tour='environmental-params']",
    position: "left"
  },
  {
    id: "flame-buttons",
    title: "Quick Fire Intensity Presets",
    content: "These flame buttons provide quick presets for different fire intensity levels. Click on any flame (🔥 to 🔥🔥🔥🔥) to automatically set environmental parameters for low, moderate, high, or extreme fire conditions.",
    target: "[data-tour='flame-buttons']",
    position: "left",
    anchor: "[data-tour='environmental-params']"
  },
  {
    id: "refresh-data",
    title: "Get Risk Assessment",
    content: "Once you've configured your parameters, click 'Refresh Data' to run the machine learning model and get your fire risk assessment. This will populate all the KPI cards and update the fire forecast visualization.",
    target: "[data-tour='refresh-button']",
    position: "left"
  },
  {
    id: "kpi-cards",
    title: "Risk Metrics Dashboard",
    content: "After running the model, these cards display key fire risk metrics including risk level, wind speed, predicted duration, and burning index. Hover over any card to see detailed explanations of what each metric means.",
    target: "[data-tour='kpi-cards']",
    position: "bottom"
  },
  {
    id: "risk-map",
    title: "Interactive Fire Forecast",
    content: "This visualization shows the fire forecast across your selected area. Events are shown as colored circles - hover over them to see detailed information including coordinates, risk level, and location details.",
    target: "[data-tour='risk-map']",
    position: "top-right"
  },
  {
    id: "reset-parameters",
    title: "Reset Everything",
    content: "Use this button to reset all environmental parameters, clear the risk assessment, and start over with default values. This is helpful when you want to analyze a completely different scenario.",
    target: "[data-tour='reset-button']",
    position: "left",
    anchor: "[data-tour='environmental-params']"
  },
  {
    id: "completion",
    title: "You're Ready!",
    content: "That's it! You now know how to use the Fire Forecast tool. Try different combinations of parameters to explore how environmental conditions affect wildfire risk in your area of interest.",
    target: "[data-tour='main-container']",
    position: "bottom"
  }
]