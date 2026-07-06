// Wardrobe data: each category has selectable variants (index 0 = "none"
// for removable layers). Colors are the fill used by the texture painters.

export const CATEGORIES = [
  {
    key: 'hair',
    label: 'Hair',
    variants: [
      { name: 'Short Brown', color: 0x5b3a29 },
      { name: 'Long Black', color: 0x2b2b2b, long: true },
      { name: 'Long Pink', color: 0xe87ea1, long: true },
      { name: 'Short Blonde', color: 0xe6c15a },
    ],
  },
  {
    key: 'top',
    label: 'Top',
    variants: [
      { name: 'Red Tee', color: 0xd94f4f },
      { name: 'Blue Tee', color: 0x4f74d9 },
      { name: 'Green Tee', color: 0x4fae62 },
      { name: 'Purple Tee', color: 0x8e5fd9 },
    ],
  },
  {
    key: 'bottom',
    label: 'Bottom',
    variants: [
      { name: 'Jeans', color: 0x3b5b8c },
      { name: 'Black Pants', color: 0x333333 },
      { name: 'Orange Skirt', color: 0xe8963f, skirt: true },
      { name: 'Pink Skirt', color: 0xe87ea1, skirt: true },
    ],
  },
  {
    key: 'shoes',
    label: 'Shoes',
    variants: [
      { name: 'Red Shoes', color: 0xc0392b },
      { name: 'White Shoes', color: 0xf0f0f0 },
      { name: 'Brown Boots', color: 0x6e4a2f },
    ],
  },
];

export function textureKey(categoryKey, variantIndex) {
  return `${categoryKey}-${variantIndex}`;
}
