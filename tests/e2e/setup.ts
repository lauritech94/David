// Create necessary directories for test artifacts
const fs = require('fs');
const path = require('path');

// Ensure directories exist
const requiredDirs = [
  'test-results',
  'test-results/screenshots',
  'test-results/downloads',
  'test-results/reports',
  'test-results/artifacts'
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export {};