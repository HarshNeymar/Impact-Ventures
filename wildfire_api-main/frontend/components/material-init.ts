// Centralized Material Web component registration to avoid duplicate custom element warnings in HMR.
// Only import this file once (e.g., in RootLayout or a top-level client component).

// Guard against duplicate registrations by checking if already defined
const registerMaterialComponents = () => {
  if (typeof window === 'undefined') return; // Skip during SSR
  
  // Only register if not already defined to prevent HMR warnings
  if (!customElements.get('md-filled-card')) {
    import('@material/web/labs/card/filled-card.js');
  }
  if (!customElements.get('md-elevated-card')) {
    import('@material/web/labs/card/elevated-card.js');
  }
  if (!customElements.get('md-filled-button')) {
    import('@material/web/button/filled-button.js');
  }
  if (!customElements.get('md-outlined-button')) {
    import('@material/web/button/outlined-button.js');
  }
  if (!customElements.get('md-chip-set')) {
    import('@material/web/chips/chip-set.js');
  }
  if (!customElements.get('md-filter-chip')) {
    import('@material/web/chips/filter-chip.js');
  }
  if (!customElements.get('md-linear-progress')) {
    import('@material/web/progress/linear-progress.js');
  }
};

// Execute immediately if in browser environment
if (typeof window !== 'undefined') {
  registerMaterialComponents();
}

export { registerMaterialComponents };