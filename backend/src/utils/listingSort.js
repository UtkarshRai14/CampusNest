const LISTING_SORTS = Object.freeze({
  newest: 'l.created_at DESC, l.id DESC',
  price_low: 'l.price ASC, l.id ASC',
  price_high: 'l.price DESC, l.id DESC',
  condition: 'l.condition DESC, l.created_at DESC, l.id DESC',
});

function getListingSortSql(sort) {
  return LISTING_SORTS[sort] || null;
}

module.exports = { LISTING_SORTS, getListingSortSql };
