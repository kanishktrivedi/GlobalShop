# Dynamic Products System

This GlobalShop implementation now features a dynamic product system that fetches data from Firestore instead of using static product arrays.

## Features

✅ **Dynamic Product Loading**: Products are fetched from Firestore in real-time  
✅ **Multi-Currency Support**: Products support price overrides for different currencies  
✅ **Search & Filtering**: Real-time search with autocomplete suggestions  
✅ **Sorting**: Sort by price (asc/desc) and name (asc/desc)  
✅ **Responsive Design**: Works on all device sizes  
✅ **Error Handling**: Graceful fallbacks when database is unavailable  

## Getting Started

### 1. Seed the Database

Visit `seed-database.html` in your browser to populate the Firestore database with mock products:

```
http://localhost:your-port/GlobalShop/seed-database.html
```

Or run the seeding function directly in the browser console:

```javascript
// Import and run the seeder
import('./seed-products.js').then(module => {
  module.seedProducts();
});
```

### 2. View Products

Navigate to the products page to see the dynamically loaded products:

```
http://localhost:your-port/GlobalShop/products.html
```

## Database Schema

Products are stored in Firestore with the following structure:

```javascript
{
  name: "Product Name",
  description: "Product description",
  basePrice: 99.99,
  baseCurrency: "USD",
  priceOverrides: {
    "EUR": 89.99,
    "GBP": 79.99
  },
  images: ["https://example.com/image.jpg"],
  active: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

## Key Files

- `seed-products.js` - Database seeding script with mock data
- `seed-database.html` - Web interface for seeding/clearing database
- `js/firebase.js` - Firebase configuration and product fetching functions
- `js/products-page.js` - Updated to use dynamic product loading
- `js/products.js` - Legacy static products (still used as fallback)

## Currency Features

The system supports:

- **Base Pricing**: Each product has a base price in a base currency
- **Price Overrides**: Specific prices for certain currencies (no conversion needed)
- **Dynamic Conversion**: Real-time currency conversion for currencies without overrides
- **Fallback**: Graceful handling when conversion services are unavailable

## Search & Filtering

- **Trie-based Search**: Efficient autocomplete using a Trie data structure
- **Real-time Filtering**: Products filter as you type
- **Suggestions**: Shows up to 5 matching product names
- **Case Insensitive**: Search works regardless of case

## Error Handling

The system includes comprehensive error handling:

- Database connection failures
- Product loading errors
- Currency conversion failures
- Search functionality degradation
- User-friendly error messages

## Development

To add new products programmatically:

```javascript
import { db } from './js/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const newProduct = {
  name: "New Product",
  description: "Product description",
  basePrice: 99.99,
  baseCurrency: "USD",
  priceOverrides: {},
  images: ["https://example.com/image.jpg"],
  active: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

await addDoc(collection(db, 'products'), newProduct);
```

## Performance

- Products are cached in memory after first load
- Search trie is built once and reused
- Price conversions are cached
- Lazy loading of product images
- Efficient Firestore queries with proper indexing

## Next Steps

Consider implementing:

- Product categories and filtering
- Inventory management
- Product reviews and ratings
- Admin panel for product management
- Image optimization and CDN
- Advanced search with filters (price range, category, etc.)