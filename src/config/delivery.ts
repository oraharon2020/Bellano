/**
 * Order to doorstep, in business days: the one place the storefront states it.
 * The product page's FAQ, the product schema Google reads, the homepage FAQ and
 * the /faq page all read it from here. Until 20/11/2026 /faq had its own "14 ל-21"
 * typed in while everything else said 12-26 (the owner ruled 12-26).
 *
 * WordPress states the same range in its own content: the `standard` product FAQ
 * template (option bellano_faq_templates) and the shipping method's title at
 * checkout. Change both sides together.
 */
export const delivery = {
  days: { min: 12, max: 26 },
};
