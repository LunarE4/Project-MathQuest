import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ensure this path is correct

// Debug: Verify the root element exists
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement); // Should log the actual DIV

// Debug: Test if basic rendering works
const testRoot = ReactDOM.createRoot(rootElement);
testRoot.render(<h1 style={{ color: 'red' }}>TEST MOUNT</h1>); // Temporary test
