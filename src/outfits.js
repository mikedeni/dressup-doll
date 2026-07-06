// Wardrobe data backed by the Kenney "Modular Characters" pack (CC0),
// see public/assets/doll/. Each variant maps to texture keys loaded in
// preload: `top-N` + `top-N-arm`, `bottom-N-hip` + `bottom-N-leg`, etc.

export const CATEGORIES = [
  {
    key: 'hair',
    label: 'Hair',
    variants: [
      { name: 'Messy Brown', offsetX: 10 },
      { name: 'Long Blonde' },
      { name: 'Long Black' },
      { name: 'Short Red' },
      { name: 'Wavy Brown' },
    ],
  },
  {
    key: 'face',
    label: 'Face',
    variants: [
      { name: 'Happy' },
      { name: 'Cheeky' },
      { name: 'Calm' },
      { name: 'Smiley' },
    ],
  },
  {
    key: 'top',
    label: 'Top',
    variants: [
      { name: 'Red Shirt' },
      { name: 'Blue Shirt' },
      { name: 'Green Shirt' },
      { name: 'Yellow Shirt' },
      { name: 'White Shirt' },
      { name: 'Navy Shirt' },
    ],
  },
  {
    key: 'bottom',
    label: 'Bottom',
    variants: [
      { name: 'Light Jeans' },
      { name: 'Blue Jeans' },
      { name: 'Green Pants' },
      { name: 'Red Pants' },
      { name: 'Tan Pants' },
    ],
  },
  {
    key: 'shoes',
    label: 'Shoes',
    variants: [
      { name: 'Brown Shoes' },
      { name: 'Red Shoes' },
      { name: 'Blue Shoes' },
      { name: 'Black Shoes' },
      { name: 'Tan Shoes' },
    ],
  },
];

export function textureKey(categoryKey, variantIndex) {
  return `${categoryKey}-${variantIndex}`;
}
