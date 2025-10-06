### Firestore data model (multi-currency e-commerce)

- **Collection `products`**
  - `name`: string
  - `description`: string
  - `basePrice`: number  // base price in `baseCurrency`
  - `baseCurrency`: string  // e.g., "USD"
  - `priceOverrides`: map<string, number>  // per-currency price overrides (optional)
  - `images`: array<string>  // image URLs
  - `active`: boolean
  - `createdAt`: timestamp (serverTimestamp)
  - `updatedAt`: timestamp (serverTimestamp)

- **Collection `orders`**
  - `userId`: string | null  // null for guest
  - `currency`: string  // checkout currency
  - `items`: array<object>
    - item fields:
      - `id`: string  // productId
      - `name`: string
      - `qty`: number
      - `unitPriceOriginal`: number  // in product baseCurrency
      - `unitPriceConverted`: number  // in order currency
      - `currencyOriginal`: string
      - `currencyConverted`: string
  - `subtotalOriginal`: number  // sum in original base currencies
  - `subtotalConverted`: number  // sum in order currency
  - `status`: string  // e.g., "created", "paid", "canceled"
  - `createdAt`: timestamp (serverTimestamp)

- **Collection `users`** (optional)
  - `email`: string
  - `defaultCurrency`: string
  - `createdAt`: timestamp (serverTimestamp)

#### Notes on pricing
- "Base price" is stored once in `baseCurrency` to avoid drift.
- If `priceOverrides[targetCurrency]` exists, use it instead of conversion.
- Otherwise, convert at runtime using cached FX rates.

#### Suggested security rules (outline)
- `products`: read: true (public), write: admin only.
- `orders`: read: user owns doc or admin; write: user owns doc or system.
- `users`: read/write: user owns doc.

#### Suggested indexes
- `products` where `active == true` order by `name` (ascending)
- `orders` where `userId == <uid>` order by `createdAt` (desc)


