/**
 * Order to doorstep, in business days — the range the product page's FAQ
 * promises. The product schema tells Google the same range, so the two are
 * read from here and cannot drift apart.
 */
export const delivery = {
  days: { min: 12, max: 26 },
};
