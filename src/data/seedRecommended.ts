import type { RecommendedSection, SelectedListing } from '../types/recommended';

// Prototype seed — a published Recommended Listings section. Uses stable product
// IDs (event IDs are generated at seed time, so products are used here).
const ITEMS: { id: string; type: SelectedListing['listingType'] }[] = [
  { id: 'prod_folkjournal', type: 'physical_product' },
  { id: 'prod_classicaltracks', type: 'digital_product' },
  { id: 'prod_songwriting', type: 'masterclass' },
  { id: 'prod_canvas', type: 'physical_product' },
  { id: 'prod_bharatanatyam', type: 'masterclass' },
  { id: 'prod_photobook', type: 'physical_product' },
  { id: 'prod_fitnessbook', type: 'digital_product' },
  { id: 'prod_nutrition', type: 'digital_product' },
];

export function buildRecommendedSection(now: number): RecommendedSection {
  const at = new Date(now - 5 * 86400000).toISOString();
  const selectedListings: SelectedListing[] = ITEMS.map((it, i) => ({ listingId: it.id, listingType: it.type, displayOrder: i }));
  const config = {
    heading: 'Recommended Shopping',
    description: 'Hand-picked products and classes for the IICA community.',
    selectedListings,
  };
  return {
    id: 'rec_home_section',
    ...config,
    state: 'published',
    updatedAt: at,
    publishedAt: at,
    updatedBy: 'Aparna Menon',
    published: { ...config, publishedAt: at, updatedBy: 'Aparna Menon' },
  };
}
