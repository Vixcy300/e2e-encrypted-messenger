#!/usr/bin/env node

/**
 * Post-install script to create placeholder icons
 * Run after npm install
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public');

// Create SVG icon template
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#gradient)"/>
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="${size}" y2="${size}">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <path d="M${size * 0.5} ${size * 0.25}L${size * 0.625} ${size * 0.375}L${size * 0.5} ${size * 0.5}L${size * 0.375} ${size * 0.375}Z" fill="white"/>
  <path d="M${size * 0.5} ${size * 0.5}L${size * 0.625} ${size * 0.625}L${size * 0.5} ${size * 0.75}L${size * 0.375} ${size * 0.625}Z" fill="white" opacity="0.7"/>
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.0625}" fill="white"/>
  <path d="M${size * 0.3} ${size * 0.3}L${size * 0.35} ${size * 0.25}M${size * 0.7} ${size * 0.3}L${size * 0.65} ${size * 0.25}" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
</svg>
`.trim();

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('🎨 Creating PWA icons...\n');

// Create SVG icons
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  const svgFilename = `icon-${size}x${size}.svg`;
  const svgPath = path.join(publicDir, svgFilename);
  
  // Create SVG file
  fs.writeFileSync(svgPath, createSVGIcon(size));
  console.log(`✓ Created ${svgFilename}`);
});

// Create favicon.ico placeholder
const faviconPath = path.join(publicDir, 'favicon.ico');
if (!fs.existsSync(faviconPath)) {
  // Create a simple ICO file (this is a minimal valid ICO)
  const icoBuffer = Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10,
    0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x68, 0x04,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log('✓ Created favicon.ico');
}

console.log('\n✅ All icons created successfully!');
console.log('\n📝 Note: These are placeholder SVG icons.');
console.log('   For production, replace with optimized PNG icons.');
console.log('   Use tools like: https://realfavicongenerator.net/\n');
