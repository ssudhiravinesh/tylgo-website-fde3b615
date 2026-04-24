/**
 * Supabase SELECT field constants for quotation queries.
 * 
 * These strings are used across useQuotations (fetch, create, update)
 * to ensure consistent field selection. Previously copy-pasted 4 times.
 */

/** Fields for the main quotation query (without items) */
export const QUOTATION_BASE_SELECT = `
  *,
  customers!quotations_customer_id_fkey (
    id,
    name,
    mobile,
    address,
    area,
    state,
    pincode
  ),
  profiles!quotations_worker_id_fkey (
    id,
    name,
    email
  )
` as const;

/** Fields for quotation items (used in separate item queries) */
export const QUOTATION_ITEMS_SELECT = `
  *,
  tile_id,
  product_id,
  staircase_id,
  quantity,
  tile_type,
  tiles!quotation_items_tile_id_fkey (
    id,
    code,
    size_length,
    size_breadth,
    price_per_box,
    pieces_per_box,
    category
  ),
  products!quotation_items_product_id_fkey (
    id,
    name,
    code,
    price,
    image_url
  ),
  rooms!quotation_items_room_id_fkey (
    id,
    name,
    length,
    width,
    unit,
    room_type,
    wall_length,
    wall_height,
    measurements
  ),
  staircases!quotation_items_staircase_id_fkey (
    id,
    name,
    number_of_steps,
    number_of_risers
  )
` as const;

/** Combined select for fetching a complete quotation with nested items */
export const QUOTATION_FULL_SELECT = `
  *,
  customers!quotations_customer_id_fkey (
    id,
    name,
    mobile,
    address,
    area,
    state,
    pincode
  ),
  profiles!quotations_worker_id_fkey (
    id,
    name,
    email
  ),
  quotation_items!quotation_items_quotation_id_fkey (
    id,
    tile_id,
    room_id,
    staircase_id,
    area,
    price_per_box,
    total_price,
    layer_number,
    custom_boxes,
    quantity,
    tile_type,
    tiles!quotation_items_tile_id_fkey (
      id,
      code,
      size_length,
      size_breadth,
      price_per_box,
      pieces_per_box,
      category
    ),
    rooms!quotation_items_room_id_fkey (
      id,
      name,
      length,
      width,
      unit,
      room_type,
      wall_length,
      wall_height,
      measurements
    ),
    staircases!quotation_items_staircase_id_fkey (
      id,
      name,
      number_of_steps,
      number_of_risers
    ),
    products!quotation_items_product_id_fkey (
      id,
      name,
      code,
      price,
      image_url
    )
  )
` as const;
