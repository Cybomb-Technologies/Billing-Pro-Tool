// scripts/applyBrand.js
const fs = require('fs-extra');
const path = require('path');

const brand = process.env.BRAND || 'default';
const src = path.resolve('public', 'brands', brand);
const dest = path.resolve('public', 'activeBrand');

if (!fs.existsSync(src)) {
  console.error('Brand not found:', brand);
  process.exit(1);
}

fs.removeSync(dest);
fs.copySync(src, dest);
console.log('Applied brand:', brand);
