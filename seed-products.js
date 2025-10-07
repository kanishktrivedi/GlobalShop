/**
 * Script to seed the Firestore database with product data from products.json
 * Run this in the browser console on your site to populate the products collection
 */

import { db } from './js/firebase.js';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/**
 * Loads product data from the products.json file
 */
async function loadProductsFromJSON() {
  try {
    console.log('📄 Loading products from seeds/products.json...');
    const response = await fetch('./seeds/products.json');

    if (!response.ok) {
      throw new Error(`Failed to load products.json: ${response.status} ${response.statusText}`);
    }

    const products = await response.json();
    console.log(`✅ Loaded ${products.length} products from JSON file`);
    return products;
  } catch (error) {
    console.error('❌ Error loading products from JSON:', error);

    // Fallback to a few sample products if JSON loading fails
    console.log('🔄 Using fallback sample products...');
    return [
      {
        name: "Wireless Headphones",
        description: "Premium ANC over-ear headphones with 30h battery life.",
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
        description: "AMOLED display with GPS and fitness tracking.",
        basePrice: 199.0,
        baseCurrency: "USD",
        priceOverrides: { "EUR": 189.0 },
        images: [
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop"
        ],
        active: true
      },
      {
        name: "Mechanical Keyboard",
        description: "Low-profile mechanical keyboard with RGB backlighting.",
        basePrice: 109.0,
        baseCurrency: "USD",
        priceOverrides: { "GBP": 99.0 },
        images: [
          "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop"
        ],
        active: true
      }
    ];
  }
}

export async function seedProducts(forceReseed = false) {
  try {
    console.log('🌱 Starting to seed products...');

    // Check if products already exist
    const productsCol = collection(db, 'products');
    const existingProducts = await getDocs(productsCol);

    if (existingProducts.size > 0 && !forceReseed) {
      console.log(`⚠️  Found ${existingProducts.size} existing products. Skipping seed.`);
      console.log('💡 To re-seed, run seedProducts(true) or delete the products collection first.');
      return existingProducts.docs.map(doc => doc.id);
    }

    if (forceReseed && existingProducts.size > 0) {
      console.log('🗑️  Force reseed enabled. Note: This will add new products alongside existing ones.');
      console.log('💡 To completely replace products, manually delete the collection first.');
    }

    // Load products from JSON file
    const productsData = await loadProductsFromJSON();

    if (!productsData || productsData.length === 0) {
      throw new Error('No product data loaded');
    }

    console.log(`📦 Preparing to seed ${productsData.length} products...`);

    // Add each product to Firestore with progress tracking
    const productIds = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsData.length; i++) {
      const product = productsData[i];
      try {
        const docRef = await addDoc(productsCol, {
          ...product,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        productIds.push(docRef.id);
        successCount++;
        console.log(`✅ [${i + 1}/${productsData.length}] Added: ${product.name} (ID: ${docRef.id})`);

        // Add small delay to avoid overwhelming Firestore
        if (i < productsData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [${i + 1}/${productsData.length}] Failed to add ${product.name}:`, error);
      }
    }

    console.log(`🎉 Seeding completed!`);
    console.log(`✅ Successfully added: ${successCount} products`);
    if (errorCount > 0) {
      console.log(`❌ Failed to add: ${errorCount} products`);
    }
    console.log('📦 Product IDs:', productIds);

    return productIds;
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
}

/**
 * Clears all products from the database (use with caution!)
 */
export async function clearProducts() {
  try {
    console.log('🗑️  Clearing all products...');

    const productsCol = collection(db, 'products');
    const existingProducts = await getDocs(productsCol);

    if (existingProducts.size === 0) {
      console.log('ℹ️  No products to clear.');
      return;
    }

    console.log(`🗑️  Found ${existingProducts.size} products to delete...`);

    // Note: In a production app, you'd want to use batch operations for better performance
    const deletePromises = existingProducts.docs.map(async (doc) => {
      await doc.ref.delete();
      console.log(`🗑️  Deleted: ${doc.data().name} (ID: ${doc.id})`);
    });

    await Promise.all(deletePromises);
    console.log('✅ All products cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing products:', error);
    throw error;
  }
}

/**
 * Gets current product count
 */
export async function getProductCount() {
  try {
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    const count = snapshot.size;
    console.log(`📊 Current product count: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Error getting product count:', error);
    return 0;
  }
}

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
  // Expose functions to window for browser console use
  window.seedProducts = seedProducts;
  window.clearProducts = clearProducts;
  window.getProductCount = getProductCount;
  window.loadProductsFromJSON = loadProductsFromJSON;

  console.log('🚀 Product seeder loaded!');
  console.log('📋 Available commands:');
  console.log('  • seedProducts() - Seed products from JSON file');
  console.log('  • seedProducts(true) - Force reseed (adds to existing)');
  console.log('  • clearProducts() - Delete all products');
  console.log('  • getProductCount() - Check current product count');
  console.log('  • loadProductsFromJSON() - Preview JSON data');
  console.log('');
  console.log('💡 Quick start: Run seedProducts() to populate the database with all 36 products!');
}