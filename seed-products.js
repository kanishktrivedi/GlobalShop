/**
 * Script to seed the Firestore database with mock product data
 * Run this in the browser console on your site to populate the products collection
 */

import { db } from './js/firebase.js';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const mockProducts = [
  {
    name: "Wireless Headphones",
    description: "Premium ANC over-ear headphones with 30h battery life and crystal-clear audio.",
    basePrice: 149.99,
    baseCurrency: "USD",
    priceOverrides: { "EUR": 139.99, "GBP": 119.99 },
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Smart Watch",
    description: "AMOLED display with GPS, heart rate variability tracking, and fitness monitoring.",
    basePrice: 199.0,
    baseCurrency: "USD",
    priceOverrides: { "EUR": 189.0, "CAD": 259.0 },
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Mechanical Keyboard",
    description: "Low-profile mechanical keyboard with hot-swappable switches and RGB backlighting.",
    basePrice: 109.0,
    baseCurrency: "USD",
    priceOverrides: { "GBP": 99.0, "AUD": 159.0 },
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "USB-C Hub",
    description: "8-in-1 USB-C hub with 100W power delivery and HDMI 4K output.",
    basePrice: 59.0,
    baseCurrency: "USD",
    priceOverrides: { "JPY": 8900 },
    images: [
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "4K Webcam",
    description: "Ultra HD webcam with autofocus, dual microphones, and privacy shutter.",
    basePrice: 129.0,
    baseCurrency: "USD",
    priceOverrides: { "CAD": 169.0, "EUR": 119.0 },
    images: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Portable SSD 1TB",
    description: "High-speed portable SSD with USB 3.2 Gen2 interface, up to 1,000 MB/s transfer speed.",
    basePrice: 139.0,
    baseCurrency: "USD",
    priceOverrides: { "AUD": 219.0, "GBP": 129.0 },
    images: [
      "https://images.unsplash.com/photo-1587202372775-98927b115591?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with precision tracking and 90-day battery life.",
    basePrice: 49.99,
    baseCurrency: "USD",
    priceOverrides: { "EUR": 45.99, "JPY": 7200 },
    images: [
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable waterproof Bluetooth speaker with 360-degree sound and 20h playtime.",
    basePrice: 79.99,
    baseCurrency: "USD",
    priceOverrides: { "GBP": 69.99, "CAD": 99.99 },
    images: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Phone Stand",
    description: "Adjustable aluminum phone stand compatible with all smartphone sizes.",
    basePrice: 24.99,
    baseCurrency: "USD",
    priceOverrides: { "EUR": 22.99, "AUD": 34.99 },
    images: [
      "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  },
  {
    name: "Laptop Sleeve",
    description: "Premium leather laptop sleeve with magnetic closure, fits 13-15 inch laptops.",
    basePrice: 89.99,
    baseCurrency: "USD",
    priceOverrides: { "GBP": 79.99, "EUR": 84.99 },
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1200&auto=format&fit=crop"
    ],
    active: true
  }
];

export async function seedProducts() {
  try {
    console.log('🌱 Starting to seed products...');
    
    // Check if products already exist
    const productsCol = collection(db, 'products');
    const existingProducts = await getDocs(productsCol);
    
    if (existingProducts.size > 0) {
      console.log(`⚠️  Found ${existingProducts.size} existing products. Skipping seed.`);
      console.log('💡 To re-seed, delete the products collection first.');
      return;
    }

    // Add each product to Firestore
    const promises = mockProducts.map(async (product) => {
      const docRef = await addDoc(productsCol, {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Added product: ${product.name} (ID: ${docRef.id})`);
      return docRef.id;
    });

    const productIds = await Promise.all(promises);
    
    console.log(`🎉 Successfully seeded ${productIds.length} products!`);
    console.log('📦 Product IDs:', productIds);
    
    return productIds;
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
}

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
  window.seedProducts = seedProducts;
  console.log('🚀 Product seeder loaded! Run seedProducts() to populate the database.');
}