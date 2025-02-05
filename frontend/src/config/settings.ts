// Environment-specific settings
const ENV = import.meta.env.MODE;

interface Settings {
    apiUrl: string;
    appName: string;
    logoUrl: string;
    // Add other settings here as needed
}

const productionSettings: Settings = {
    apiUrl: 'https://ra-api.ironcliff.ai',
    appName: 'Orchestrator',
    logoUrl: '/cognify-icon.svg'  // Using existing icon
};

const developmentSettings: Settings = {
    apiUrl: 'http://localhost:8000',
    appName: 'Orchestrator (Dev)',
    logoUrl: '/cognify-icon.svg'  // Using existing icon
};

// Select settings based on environment
const settings: Settings = ENV === 'production' ? productionSettings : developmentSettings;

export default settings; 