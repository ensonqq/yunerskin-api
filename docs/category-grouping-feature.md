# Category Grouping & Menu Order Feature

## Overview

Categories can now belong to a **group** (e.g. "Group A") or be **ungrouped** (displayed individually in the menu). The menu order — including the position of groups and standalone categories — is controlled by a single `MenuOrder` document. Each category has a unique `slug` used for frontend routing.

---

## Data Models

### Category (updated)
```
{
  _id         : ObjectId
  name        : { zh: string, en: string }
  slug        : string          // unique, URL-safe, auto-generated from name.en
                                // e.g. "BBQ Chicken" → "bbq-chicken"
  group       : ObjectId | null // ref → CategoryGroup. null = ungrouped
  sortOrder   : number          // order within its group (default 0, lower = first)
  images      : ObjectId[]
  slogan      : { zh: string, en: string }
  publish     : boolean
  buyXGetYFree           : [{ x, y }]
  buyXGetYFreeEnabled    : boolean
}
```

### CategoryGroup (new)
```
{
  _id  : ObjectId
  name : { zh: string, en: string }
}
```

### MenuOrder (new — single document, always one record in DB)
```
{
  items: [
    { type: "group",    refId: ObjectId },  // points to a CategoryGroup
    { type: "category", refId: ObjectId },  // points to an ungrouped Category
    ...
  ]
}
```

> **Important:** Only **ungrouped** categories (`group: null`) appear directly in `MenuOrder.items`. Grouped categories are ordered by their `sortOrder` field within their group.

---

## API Endpoints

Base path: `/v1/categories`

### Menu (read)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/categories/menu` | Public | Returns the ordered menu (published only) |
| `GET` | `/categories/menu/admin` | Admin | Returns the full ordered menu (including unpublished) |

#### `GET /categories/menu` response shape
```json
[
  {
    "type": "group",
    "_id": "664a...",
    "name": { "zh": "A組", "en": "Group A" },
    "categories": [
      { "_id": "...", "slug": "category-1", "name": { "zh": "分類1", "en": "Category 1" }, "sortOrder": 0, ... },
      { "_id": "...", "slug": "category-2", "name": { "zh": "分類2", "en": "Category 2" }, "sortOrder": 1, ... }
    ]
  },
  {
    "type": "category",
    "_id": "664b...",
    "slug": "category-5",
    "name": { "zh": "分類5", "en": "Category 5" },
    ...
  },
  {
    "type": "group",
    "_id": "664c...",
    "name": { "zh": "B組", "en": "Group B" },
    "categories": [...]
  }
]
```

---

### Menu Order (write)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/categories/menu-order` | Admin | Replace the full top-level menu order |

#### `PUT /categories/menu-order` request body
```json
{
  "items": [
    { "type": "group",    "refId": "664a..." },
    { "type": "category", "refId": "664b..." },
    { "type": "group",    "refId": "664c..." }
  ]
}
```
Send the **complete** ordered array. This is a full replacement — used after drag-and-drop reordering in the admin UI.

---

### Category Groups CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/categories/groups` | Public | List all groups |
| `POST` | `/categories/groups` | Admin | Create a group |
| `PATCH` | `/categories/groups/:groupId` | Admin | Update group name |
| `DELETE` | `/categories/groups/:groupId` | Admin | Delete group (its categories become ungrouped) |

#### `POST /categories/groups` request body
```json
{
  "name": { "zh": "A組", "en": "Group A" }
}
```

#### `PATCH /categories/groups/:groupId` request body
```json
{
  "name": { "zh": "新名稱", "en": "New Name" }
}
```

#### `DELETE /categories/groups/:groupId` behaviour
- The group is removed.
- All categories that belonged to it have `group` set to `null` (ungrouped).
- Their entries are **spliced into `MenuOrder`** at the position the group occupied, preserving relative order.
- No categories are lost.

---

### Categories CRUD (updated fields)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/categories` | Public | Paginated flat list |
| `POST` | `/categories` | Admin | Create a category |
| `GET` | `/categories/:categoryId` | Public | Get single category |
| `PATCH` | `/categories/:categoryId` | Admin | Update category |
| `DELETE` | `/categories/:categoryId` | Admin | Delete category |

#### `POST /categories` — new optional fields
```json
{
  "name":      { "zh": "分類名", "en": "Category Name" },
  "slug":      "custom-slug",     // optional, auto-generated from name.en if omitted
  "group":     "664a...",         // optional ObjectId of a CategoryGroup, null = ungrouped
  "sortOrder": 0,                 // optional, controls order within the group
  ...
}
```

#### `PATCH /categories/:categoryId` — new optional fields
```json
{
  "group":     "664a...",   // move to a different group, or null to ungroup
  "sortOrder": 2,           // change position within the group
  "slug":      "new-slug"   // change the URL slug
}
```

> **Auto-append behaviour:** When a new **ungrouped** category is created, it is automatically appended to the end of `MenuOrder`. Grouped categories do NOT appear in `MenuOrder` directly — they are shown under their group entry.

---

## Admin Portal Implementation Guide

### 1. Category Group Management page

- **List groups:** `GET /categories/groups` → display group names with Edit / Delete buttons.
- **Create group:** Form with `name.zh` + `name.en` → `POST /categories/groups`.
- **Edit group:** Inline edit or modal → `PATCH /categories/groups/:groupId`.
- **Delete group:** Confirm dialog warning that categories will be ungrouped → `DELETE /categories/groups/:groupId`.

---

### 2. Menu Order page (Drag-and-Drop)

Fetch the current order from `GET /categories/menu/admin`, then render a **two-level sortable list**:

```
[drag] ▦ Group A             ← type: "group"
         [drag] Category 1   ← sorted by category.sortOrder
         [drag] Category 2
[drag] ▦ Category 5          ← type: "category" (ungrouped)
[drag] ▦ Group B             ← type: "group"
         [drag] Category 3
         [drag] Category 4
```

#### Top-level reorder (groups ↕ ungrouped categories)
After dragging a group or ungrouped category to a new position:
```js
// Collect the new top-level order
const items = orderedList.map(item => ({
  type:  item.type,           // "group" or "category"
  refId: item._id,
}));

await fetch('/v1/categories/menu-order', {
  method: 'PUT',
  body: JSON.stringify({ items }),
});
```

#### Within-group reorder (categories within a group)
After dragging categories within a group, send individual PATCH requests with the new `sortOrder` values:
```js
// newOrder = array of categories in their new order within the group
await Promise.all(
  newOrder.map((cat, index) =>
    fetch(`/v1/categories/${cat._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ sortOrder: index }),
    })
  )
);
```

---

### 3. Category Create / Edit form (updated)

Add these fields to the existing category form:

| Field | Input type | Notes |
|-------|-----------|-------|
| **Group** | Dropdown (or "None") | Populated from `GET /categories/groups`. Setting to "None" sends `group: null` → category becomes ungrouped and appears directly in the menu. |
| **Sort Order** | Number input | Controls position within the selected group. Lower = higher up. |
| **Slug** | Text input | Pre-filled with auto-generated value. Editable for SEO. Must be unique. |

---

### 4. Frontend (storefront) routing

Each category now has a unique `slug`. Use it for URL routing instead of the category name:

```
/[slug]   →  look up category by slug
```

The `GET /categories/menu` response includes `slug` on every category object (both inside groups and ungrouped). Use that slug to build navigation links:

```js
// Inside a group
group.categories.forEach(cat => {
  // href = `/${cat.slug}`
});

// Ungrouped (top-level item with type === "category")
// href = `/${item.slug}`
```

This guarantees no URL collisions even if two categories share the same display name.

---

## Behaviour Summary

| Scenario | Result |
|----------|--------|
| Create category with `group: groupId` | Category sorted within group by `sortOrder`. NOT added to `MenuOrder` top-level. |
| Create category with `group: null` | Category auto-appended to end of `MenuOrder` as `{ type: "category", refId }`. |
| Delete a group | Its categories become ungrouped. Their `MenuOrder` entries are inserted at the group's former position. |
| Delete an ungrouped category | Its `MenuOrder` entry is removed automatically. |
| Reorder top level | `PUT /categories/menu-order` with full new items array. |
| Reorder within a group | `PATCH /categories/:id` with new `sortOrder` for each affected category. |

