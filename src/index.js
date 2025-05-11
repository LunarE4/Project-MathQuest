import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// Debug: Verify the root element exists
console.log('Root element:', rootElement); // Should log the DIV

// Debug: Test basic rendering
const testRoot = ReactDOM.createRoot(rootElement);
testRoot.render(<h1>TEST</h1>); // Temporarily replace <App />
