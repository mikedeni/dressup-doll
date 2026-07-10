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
    key: 'eyebrows',
    label: 'Eyebrows',
    procedural: true,
    variants: [
      { name: 'Natural', shape: 'straight' },
      { name: 'Arched', shape: 'arched' },
      { name: 'Raised', shape: 'raised' },
      { name: 'Angry', shape: 'angry' },
      { name: 'Worried', shape: 'worried' },
      { name: 'Bold', shape: 'straight', thick: true },
    ],
  },
  {
    key: 'eyes',
    label: 'Eyes',
    procedural: true,
    variants: [
      { name: 'Brown', color: 0x5a3d2b, r: 9 },
      { name: 'Blue', color: 0x3a6ea5, r: 9 },
      { name: 'Green', color: 0x3d7a4d, r: 9 },
      { name: 'Grey', color: 0x6b6f76, r: 9 },
      { name: 'Amber', color: 0xb5792e, r: 9 },
      { name: 'Big Dark', color: 0x2b2b2b, r: 11 },
    ],
  },
  {
    key: 'nose',
    label: 'Nose',
    procedural: true,
    variants: [
      { name: 'Button', shape: 'button' },
      { name: 'Line', shape: 'line' },
      { name: 'Curved', shape: 'curve' },
      { name: 'None', shape: 'none' },
    ],
  },
  {
    key: 'mouth',
    label: 'Mouth',
    procedural: true,
    variants: [
      { name: 'Smile', shape: 'smile' },
      { name: 'Neutral', shape: 'neutral' },
      { name: 'Open', shape: 'open' },
      { name: 'Frown', shape: 'frown' },
      { name: 'Grin', shape: 'grin' },
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
