#!/usr/bin/env tsx

// List all available lucide-react icons
import * as lucideReact from 'lucide-react';

console.log('Available lucide-react icons:');
console.log('=============================');

const iconNames = Object.keys(lucideReact)
  .filter(name => name !== 'default' && !name.startsWith('create'))
  .sort();

iconNames.forEach((name, index) => {
  if (index % 4 === 0) console.log('');
  process.stdout.write(name.padEnd(20));
});

console.log('\n\nTotal icons:', iconNames.length);
