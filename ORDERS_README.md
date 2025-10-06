# Orders Functionality

## Overview
The orders functionality allows users to view their past orders after checkout. Orders are stored in Firestore under `/orders/{uid}` and displayed in a clean card-based design.

## Features

### 🔐 Authentication Required
- Users must be signed in to view their orders
- Orders are fetched from Firestore using the user's UID
- Proper security rules ensure users can only access their own orders

### 🎨 Clean Card Design
- Each order is displayed in a clean, modern card
- Cards show order details, items, pricing, and date/time
- Hover effects and smooth transitions
- Responsive design that works on all screen sizes

### 📊 Order Information Displayed
- **Order ID** (shortened for readability)
- **Date/Time** (formatted nicely)
- **Status** (completed, pending, etc.)
- **Items List** with quantities and prices
- **Subtotal, Tax, and Total** in the order currency
- **Currency Information**

### 🛒 Checkout Integration
- After successful checkout, users are automatically redirected to the orders page
- Success message shows order number and total
- Cart is cleared and checkout modal is closed

## Technical Implementation

### Database Structure
Orders are stored in Firestore with this structure:
```javascript
{
  userId: "user_uid",
  currency: "USD",
  items: [
    {
      id: "product_id",
      name: "Product Name",
      qty: 2,
      unitPriceOriginal: 199.99,
      unitPriceConverted: 199.99,
      currencyOriginal: "USD",
      currencyConverted: "USD"
    }
  ],
  subtotalOriginal: 399.98,
  subtotalConverted: 399.98,
  taxConverted: 27.998,
  totalConverted: 427.978,
  createdAt: serverTimestamp()
}
```

### Key Functions

#### `getUserOrders(uid)`
Fetches all orders for a user from Firestore, ordered by creation date (newest first).

#### `formatOrderDate(timestamp)`
Formats Firestore timestamp into a human-readable date/time string.

#### `renderOrderCard(order)`
Generates HTML for displaying a single order in card format.

#### `loadUserOrders()`
Loads and displays the current user's orders in the orders view.

## Usage

1. **Place an Order**: Add items to cart and complete checkout
2. **View Orders**: Navigate to `/orders` or click "Orders" in navigation
3. **Order Details**: Each order shows comprehensive information in an easy-to-read format

## Security
- Firestore security rules ensure users can only read their own orders
- Authentication is required for all order operations
- User IDs are properly validated

## Styling
Order cards use:
- Clean borders and shadows
- Proper spacing and typography
- Hover effects for interactivity
- Status badges with color coding
- Responsive grid layout

The design matches the overall application aesthetic while providing clear, scannable order information.
