import type { UserRecord } from '../types/users';
import type { TimelineEvent } from '../types/users';
import type { ProductCategoryRecord, ProductRecord, ProductStatus, ProductType } from '../types/products';

const DAY = 86400000;

const DEFAULT_CATEGORIES: Record<ProductType, string[]> = {
  masterclass: ['Music', 'Dance', 'Theatre', 'Visual Arts', 'Fitness', 'Yoga', 'Sports Coaching', 'Personal Branding'],
  digital: ['E-books', 'Music & Audio', 'Digital Art', 'Templates & Resources', 'Recorded Sessions', 'Guides'],
  physical: ['Art & Paintings', 'Books', 'Handcrafted Products', 'Apparel', 'Merchandise', 'Collectibles', 'Fitness Products'],
};

export function buildProductCategories(): ProductCategoryRecord[] {
  const out: ProductCategoryRecord[] = [];
  (Object.keys(DEFAULT_CATEGORIES) as ProductType[]).forEach((type) => {
    DEFAULT_CATEGORIES[type].forEach((name, i) => {
      out.push({
        id: `pcat_${type}_${i}`,
        name,
        type,
        description: `${name} — ${type} products.`,
        status: 'active',
        createdAt: '2024-06-01T00:00:00Z',
      });
    });
  });
  return out;
}

interface Spec {
  id: string;
  sellerId: string;
  type: ProductType;
  category: string;
  title: string;
  price: number;
  status: ProductStatus;
  stock?: number;
  seats?: number;
  capacity?: number;
}

const SPECS: Spec[] = [
  { id: 'prod_folkjournal', sellerId: 'usr_heritage', type: 'physical', category: 'Handcrafted Products', title: 'Handcrafted Folk Art Journal', price: 899, status: 'published', stock: 34 },
  { id: 'prod_classicaltracks', sellerId: 'usr_aisha', type: 'digital', category: 'Music & Audio', title: 'Indian Classical Practice Tracks', price: 499, status: 'published' },
  { id: 'prod_songwriting', sellerId: 'usr_nikhil', type: 'masterclass', category: 'Music', title: 'The Art of Indian Songwriting', price: 1499, status: 'published', capacity: 50, seats: 31 },
  { id: 'prod_bharatanatyam', sellerId: 'usr_meera', type: 'masterclass', category: 'Dance', title: 'Bharatanatyam Foundations', price: 1999, status: 'published', capacity: 30, seats: 22 },
  { id: 'prod_canvas', sellerId: 'usr_ananya', type: 'physical', category: 'Art & Paintings', title: 'Original Canvas Artwork', price: 12500, status: 'published', stock: 3 },
  { id: 'prod_yogaguide', sellerId: 'usr_meera', type: 'digital', category: 'Guides', title: 'Yoga Mobility Guide', price: 0, status: 'published' },
  { id: 'prod_courtyard', sellerId: 'usr_royal', type: 'masterclass', category: 'Personal Branding', title: 'Royal Courtyard Cultural Workshop', price: 2499, status: 'published', capacity: 40, seats: 18 },
  { id: 'prod_fitnessbook', sellerId: 'usr_aarav', type: 'digital', category: 'E-books', title: 'Fitness Strength Program (E-book)', price: 699, status: 'published' },
  { id: 'prod_sprint', sellerId: 'usr_abhishek', type: 'masterclass', category: 'Sports Coaching', title: 'Sprint Training Masterclass', price: 999, status: 'draft', capacity: 25, seats: 0 },
  { id: 'prod_artprint', sellerId: 'usr_sophia', type: 'physical', category: 'Collectibles', title: 'Limited Edition Art Print', price: 3500, status: 'draft', stock: 20 },
  { id: 'prod_modeltemplates', sellerId: 'usr_kabir', type: 'digital', category: 'Templates & Resources', title: 'Modeling Portfolio Templates', price: 299, status: 'draft' },
  { id: 'prod_scarf', sellerId: 'usr_heritage', type: 'physical', category: 'Apparel', title: 'Handwoven Heritage Scarf', price: 1799, status: 'out_of_stock', stock: 0 },
  { id: 'prod_vinyl', sellerId: 'usr_devang', type: 'physical', category: 'Collectibles', title: 'Vintage Vinyl Collectible', price: 4500, status: 'hidden', stock: 8 },
  { id: 'prod_artbasics', sellerId: 'usr_sophia', type: 'masterclass', category: 'Visual Arts', title: 'Contemporary Art Basics', price: 1299, status: 'draft', capacity: 40, seats: 0 },
  { id: 'prod_meditation', sellerId: 'usr_meera', type: 'digital', category: 'Music & Audio', title: 'Meditation Audio Pack', price: 0, status: 'published' },
  { id: 'prod_nutrition', sellerId: 'usr_vikram', type: 'digital', category: 'Recorded Sessions', title: 'Athlete Nutrition Guide', price: 599, status: 'published' },
  { id: 'prod_photobook', sellerId: 'usr_james', type: 'physical', category: 'Books', title: 'Signed Photography Book', price: 2200, status: 'published', stock: 60 },
  { id: 'prod_branding', sellerId: 'usr_devang', type: 'masterclass', category: 'Personal Branding', title: 'Personal Branding Intensive', price: 3999, status: 'draft', capacity: 20, seats: 0 },
  { id: 'prod_yogaposter', sellerId: 'usr_meera', type: 'physical', category: 'Merchandise', title: 'Old Yoga Poster', price: 499, status: 'archived', stock: 0 },
];

const skuOf = (title: string) => 'SKU-' + title.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();

function buildTimeline(id: string, status: ProductStatus, base: number): TimelineEvent[] {
  const t: TimelineEvent[] = [{ id: `${id}_tl0`, key: 'created', label: 'Product created', at: new Date(base).toISOString() }];
  if (['published', 'out_of_stock', 'hidden', 'archived'].includes(status)) t.push({ id: `${id}_tl3`, key: 'published', label: 'Product published', at: new Date(base + 4 * DAY).toISOString() });
  if (status === 'out_of_stock') t.push({ id: `${id}_tl4`, key: 'oos', label: 'Marked out of stock', at: new Date(base + 30 * DAY).toISOString() });
  if (status === 'hidden') t.push({ id: `${id}_tl5`, key: 'hidden', label: 'Hidden from Shop', at: new Date(base + 20 * DAY).toISOString() });
  if (status === 'archived') t.push({ id: `${id}_tl6`, key: 'archived', label: 'Product archived', at: new Date(base + 60 * DAY).toISOString() });
  return t;
}

// A few published listings are launched within the last 15 days so the Mobile
// "What's New" preview (products + classes) has eligible records.
const RECENT_DAYS: Record<string, number> = {
  prod_photobook: 3,      // New Product (physical)
  prod_nutrition: 6,      // New Product (digital)
  prod_courtyard: 9,      // New Class (masterclass)
  prod_bharatanatyam: 12, // New Class (masterclass)
};

export function buildProducts(users: UserRecord[], now: number): ProductRecord[] {
  return SPECS.map((s, idx) => {
    const seller = users.find((u) => u.id === s.sellerId);
    const base = RECENT_DAYS[s.id] != null ? now - RECENT_DAYS[s.id] * DAY : now - (90 - idx * 3) * DAY;
    const p: ProductRecord = {
      id: s.id,
      sellerUserId: s.sellerId,
      sellerName: seller?.name ?? 'Creator',
      sellerIicaId: seller?.iicaId,
      type: s.type,
      category: s.category,
      title: s.title,
      description: `${s.title} by ${seller?.name ?? 'a creator'}. A quality ${s.category.toLowerCase()} offering curated for the IICA community.`,
      images: [`img_${s.id}_1`, `img_${s.id}_2`, `img_${s.id}_3`],
      price: s.price,
      discountPrice: s.price > 1000 && idx % 4 === 0 ? Math.round(s.price * 0.85) : null,
      currency: 'INR',
      status: s.status,
      createdAt: new Date(base).toISOString(),
      lastUpdatedAt: new Date(base + 5 * DAY).toISOString(),
      timeline: buildTimeline(s.id, s.status, base),
      notes: [],
    };
    if (s.type === 'physical') {
      p.physical = {
        sku: skuOf(s.title),
        stock: s.stock ?? 10,
        lowStockThreshold: 5,
        weight: s.category === 'Art & Paintings' ? '2.5 kg' : '0.6 kg',
        dimensions: '30 × 20 × 5 cm',
        shippingOrigin: seller?.city ?? 'Mumbai',
        dispatchTimeline: '3–5 business days',
        returnPolicy: '7-day return for damaged items',
      };
    } else if (s.type === 'masterclass') {
      const sessionAt = now + (10 + idx) * DAY;
      p.masterclass = {
        sessionAt: new Date(sessionAt).toISOString(),
        timezone: 'Asia/Kolkata',
        durationMins: 90,
        capacity: s.capacity ?? 40,
        seatsBooked: s.seats ?? 0,
        deliveryMode: 'Live on Zoom',
        deliveryInstructions: 'Seller emails the Zoom link to the buyer 1 hour before the session.',
      };
    } else {
      p.digital = {
        digitalFormat: s.category === 'Music & Audio' ? 'MP3 (ZIP)' : s.category === 'Templates & Resources' ? 'ZIP' : 'PDF',
        availability: 'Unlimited',
        deliveryTime: 'Within 24 hours',
        deliveryInstructions: 'Seller emails the digital file to the buyer after purchase.',
      };
    }
    return p;
  });
}
