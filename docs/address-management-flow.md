# Address Management & Order Flow

## Overview

This document describes the complete address management lifecycle and its integration with the order creation flow. The system allows users to manage their shipping addresses and select an address during checkout.

## Architecture

### API Layer

The address module is built on the backend API endpoints:

```
GET    /api/v1/user-addresses/              - List user's addresses
POST   /api/v1/user-addresses/              - Create new address
GET    /api/v1/user-addresses/<id>/         - Get address details
PATCH  /api/v1/user-addresses/<id>/         - Update address
DELETE /api/v1/user-addresses/<id>/         - Delete address
```

Frontend API wrapper: `src/api/user-addresses.js`

**Exposed functions:**
- `listUserAddresses()` - fetch all addresses
- `getUserAddress(addressId)` - fetch single address
- `createUserAddress(addressData)` - create new address
- `updateUserAddress(addressId, addressData)` - update existing address
- `deleteUserAddress(addressId)` - delete address

### Data Models

**Address Record:**
```javascript
{
  id: string,                    // UUID
  contact_name: string,          // 收货人名称
  contact_phone: string,         // 手机号
  province: string,              // 省份
  city: string,                  // 城市
  district: string,              // 区县
  address_detail: string,        // 详细地址
  postal_code: string,           // 邮编
  is_default: boolean,           // 是否为默认地址
  created_at: string,            // 创建时间
  updated_at: string             // 更新时间
}
```

## Pages & Components

### 1. Address Management Page
**Path:** `/pages/user/addresses/index`

**Purpose:** Display all user's addresses in a list format

**Features:**
- List view with all user addresses
- Address details display (name, phone, location, address)
- Default address badge indicator
- Edit and Delete action buttons
- Loading skeleton and error states
- Pull-to-refresh support
- "Add new address" button

**States:**
- **Loading:** Shows skeleton cards while fetching
- **Error:** Error message + retry button
- **Empty:** No addresses - prompts to add first address
- **Populated:** Full list with edit/delete actions

**Navigation:**
```
+ Add address button → Address Edit Page (new mode)
Edit button          → Address Edit Page (edit mode with address ID)
Delete button        → Confirmation modal + delete
```

### 2. Address Edit Page
**Path:** `/pages/user/addresses/edit/index`

**Purpose:** Form-based interface for creating and editing addresses

**Features:**
- Form fields: contact name, phone, province, city, district, address detail, postal code
- Checkbox for setting as default address
- Full form validation with user-friendly error messages
- Auto-load existing address data in edit mode
- Submit and Cancel buttons
- Loading state during submission

**Form Sections:**
```
1. Contacts
   - Contact name (required, text)
   - Contact phone (required, text)

2. Location
   - Province (required, text)
   - City (required, text)
   - District (required, text)

3. Address Details
   - Address detail (required, textarea)
   - Postal code (optional, text)
   - Set as default (checkbox)
```

**Validation Rules:**
- Contact name: must not be empty
- Contact phone: must not be empty
- Province, City, District: all required
- Address detail: must not be empty
- All validation triggers before submission

**Navigation:**
```
New address:  navigate({ url: '/pages/user/addresses/edit/index' })
Edit address: navigate({ url: '/pages/user/addresses/edit/index?id=<addressId>' })

On save:      navigateBack()
On cancel:    navigateBack()
```

### 3. Address Selection Page (During Checkout)
**Path:** `/pages/orders/address-select/index`

**Purpose:** Allow users to select a shipping address during order checkout

**Features:**
- Display list of user's existing addresses
- Radio-button single selection (default: first or default address)
- Quick "Add new address" button
- Complete order creation and payment workflow
- Loading, error, and empty states
- Pull-to-refresh support

**Workflow:**
1. Page loads with product info from route params: `productId`, `quantity`
2. Fetch and display user's addresses
3. User selects address or adds new
4. Click "Confirm" to:
   - Create order with selected address via `createSaleOrder()`
   - Create payment record via `createOrderPayment()`
   - Invoke WeChat payment UI
   - Poll order status until payment confirmed
   - Navigate to orders list on success

**Route Parameters:**
```
?productId=<id>&quantity=<number>
```

**Navigation:**
```
From: Product detail page "Place order" button
      navigate({ url: '/pages/orders/address-select/index?productId=X&quantity=Y' })

Add address: navigate({ url: '/pages/user/addresses/edit/index' })
            → Returns to this page on navigateBack()

On confirm: reLaunch({ url: '/pages/orders/index' }) after payment success
```

## User Flows

### Flow 1: Manage Addresses (from User Page)
```
User Page
  ↓ Click "地址管理"
Address List Page
  ↓
  ├─ Click "+ 新增地址"      → Address Edit Page (empty form)
  ├─ Click "编辑" on address → Address Edit Page (with data)
  └─ Click "删除" on address → Confirm → Delete
       ↓
    Address Edit Page
      ↓
      ├─ Fill form + Click "新增地址" or "更新地址" → Save to backend
      │   ↓
      │   Show success toast → navigateBack()
      └─ Click "取消" → navigateBack() without saving
```

### Flow 2: Complete an Order (with Address)
```
Product Detail Page
  ↓ Click "立即下单"
Address Selection Page (NEW FLOW)
  ↓ Load user's addresses
  ├─ Select existing address
  │   ├─ Click "+ 添加新地址" → Address Edit Page (empty form)
  │   │   ↓ (Fill form, save, auto return)
  │   │
  │   └─ Click "确认选择"
  │       ↓
  │       Create order with selected address
  │       Invoke WeChat payment
  │       Poll payment status
  │       ↓
  │       Success → Navigate to Orders List
  │
  └─ Empty (no addresses)
      ↓
      Click "添加地址" → Address Edit Page
         ↓ (Save address, auto return)
         Select address → Confirm → Payment
```

## Error Handling

### Address Operations

**Load address list:**
- Network error: Show error message + retry button
- Server error (5xx): Generic error message
- Auth error (401): User redirected to login
- Parse error: Generic error message

**Save address:**
- Validation errors: Prevent submission, show field error
- Network error: Toast error message, allow retry
- Server error: Toast error message
- Success: Toast success, auto-close, navigate back

### Order Creation with Address

**Address selection:**
- No addresses: Prompt to add address first
- Load timeout: Retry button available
- Selection required: Disable confirm button until selected

**Order creation:**
- Validation error from backend: Show error toast
- Network error during order creation: Show error toast
- Payment invocation error: Show error toast, keep order intact
- Payment timeout: Show pending confirmation toast, allow retry

## State Management

### Address List Page
```javascript
{
  addresses: ref([]),           // Array of address records
  isLoading: ref(true),         // Initial load
  isFetching: ref(false),       // Subsequent fetches
  loadError: ref(null),         // Error details
}
```

### Address Edit Page
```javascript
{
  form: ref({                   // Form data
    contact_name: '',
    contact_phone: '',
    province: '',
    city: '',
    district: '',
    address_detail: '',
    postal_code: '',
    is_default: false
  }),
  addressId: ref(null),         // null = new, string = edit
  isLoading: ref(false),        // Loading existing address data
  isSubmitting: ref(false),     // Submitting form
}
```

### Address Selection Page
```javascript
{
  addresses: ref([]),           // Available addresses
  selectedAddressId: ref(null), // Currently selected
  isLoading: ref(true),         // Initial load
  isFetching: ref(false),       // Subsequent fetches
  isSubmitting: ref(false),     // Creating order + payment
  loadError: ref(null),         // Error details
  pageParams: ref({             // From route params
    productId: '',
    quantity: 1
  })
}
```

## Frontend Implementation Details

### File Structure
```
src/
├── api/
│   └── user-addresses.js           # API wrappers
├── pages/
│   ├── user/
│   │   ├── addresses/
│   │   │   ├── index.vue           # Address list
│   │   │   ├── index.config.js
│   │   │   ├── index.scss
│   │   │   └── edit/
│   │   │       ├── index.vue       # Address form
│   │   │       ├── index.config.js
│   │   │       └── index.scss
│   │   └── index.vue               # User panel
│   └── orders/
│       ├── address-select/
│       │   ├── index.vue           # Address selection
│       │   ├── index.config.js
│       │   └── index.scss
│       └── index.vue               # Orders list
```

### Styling Approach

All address-related pages follow the consistent design system:
- **Colors:** Warm gradient backgrounds (#f8f3ea → #efe6d6)
- **Accents:** Golden buttons (#ffca4c, #f4b834)
- **Cards:** Semi-transparent white backgrounds with subtle shadows
- **Glow effects:** Smooth blur effects for visual depth
- **Typography:** Clear hierarchy with proper font sizes

### API Layer Integration

The `src/api/user-addresses.js` module:
1. Uses centralized `request` utility from `src/utils/request.js`
2. Implements consistent error extraction and throwing
3. Provides high-level functions matching backend endpoints
4. Used by all three address-related pages

## Component Communication

### Navigation Flow
```
User Page
  ↓
Address List Page ← ← ← ← ← ← ←
  ↓ (add/edit)         (navigateBack on save)
Address Edit Page
  ↓
(Save or Cancel)


Product Detail Page → Address Selection Page → Address Edit Page
  ↓ (navigate)            ↓ (navigate)             ↓ (navigateBack)
                       Orders List Page ← ← ← ← ← ← ← (on success)
```

### Data Flow
```
Address Selection Page              Address Management Page
        ↓                                   ↓
    listUserAddresses()          listUserAddresses()
        ↓                                   ↓
    Render list                       Render list
        ↓                                   ↓
   User selects                User edits/deletes
        ↓                                   ↓
  Navigate to                 createUserAddress()
  Address Edit                updateUserAddress()
        ↓                      deleteUserAddress()
    Save address                      ↓
        ↓                         Backend updated
   Navigate back                      ↓
        ↓                         Refresh list
   Auto-reload list
```

## Testing Scenarios

### Address Management
- [ ] Load address list successfully
- [ ] Show empty state when no addresses
- [ ] Handle network errors gracefully
- [ ] Add new address with all fields
- [ ] Edit existing address
- [ ] Delete address with confirmation
- [ ] Set address as default
- [ ] Pull-to-refresh functionality

### Address Selection During Checkout
- [ ] Load addresses on page enter
- [ ] Display loaded addresses correctly
- [ ] Select address with visual feedback
- [ ] Disable confirm button when no address selected
- [ ] Add new address from selection page
- [ ] Create order successfully with selected address
- [ ] Invoke WeChat payment correctly
- [ ] Poll and confirm payment status
- [ ] Navigate to orders list on success
- [ ] Handle order creation errors

### Form Validation
- [ ] Prevent submission with empty required fields
- [ ] Show inline validation errors
- [ ] Auto-load existing data in edit mode
- [ ] Handle submission errors gracefully
- [ ] Show success confirmation after save

## Future Enhancements

1. **Region Picker Component**
   - Replace text input for province/city/district with native picker
   - Better UX for location selection

2. **Address Suggestions**
   - Auto-complete for known addresses
   - Reduce typing for repeat customers

3. **Multiple Address Sets**
   - Support multiple address types (home, office, delivery point)
   - Quick switch between different address sets

4. **Address History**
   - Track frequently used addresses
   - Quick shortcuts for common destinations

5. **Batch Operations**
   - Set default address without edit
   - Multi-address delete
