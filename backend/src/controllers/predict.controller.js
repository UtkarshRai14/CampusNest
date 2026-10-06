const mlService = require('../services/mlService');
const { parseNumber, parseCondition, parseText, isMissing } = require('../utils/validators');

const formatRupees = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

async function getPricePrediction(req, res) {
  const body = req.body || {};

  const category = parseText(body.category, 'Category', { max: 100 });
  const originalPrice = parseNumber(body.original_price, 'Original price', { positive: true });
  const condition = parseCondition(body.condition);
  const monthsUsed = parseNumber(body.months_used, 'Months used', { integer: true, min: 0 });
  const demandScore = isMissing(body.demand_score)
    ? 0.5
    : parseNumber(body.demand_score, 'Demand score', { min: 0, max: 1 });

  const result = await mlService.predictPrice({
    category, originalPrice, condition, monthsUsed, demandScore,
  });

  return res.json({
    category,
    original_price: originalPrice,
    condition,
    months_used: monthsUsed,
    predicted_price: result.predicted_price,
    lower_bound: result.lower_bound,
    upper_bound: result.upper_bound,
    price_range: `${formatRupees(result.lower_bound)} — ${formatRupees(result.upper_bound)}`,
    chart: result.chart,
  });
}

module.exports = { getPricePrediction };
