const mlService = require('../services/mlService');
const HttpError = require('../utils/HttpError');

















async function getPricePrediction(req, res) {
  const { category, original_price: originalPrice, condition, months_used: monthsUsed, demand_score: demandScoreRaw } = req.body || {};

  if (category === undefined || originalPrice === undefined || condition === undefined || monthsUsed === undefined) {
    throw new HttpError(422, [{ msg: 'category, original_price, condition and months_used are required' }]);
  }

  const demandScore = demandScoreRaw !== undefined ? demandScoreRaw : 0.5;

  if (condition < 1 || condition > 5) {
    throw new HttpError(400, 'Condition must be between 1 and 5');
  }
  if (originalPrice <= 0) {
    throw new HttpError(400, 'Original price must be greater than 0');
  }
  if (monthsUsed < 0) {
    throw new HttpError(400, 'Months used cannot be negative');
  }

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
    price_range: `₹${result.lower_bound.toLocaleString('en-US')} — ₹${result.upper_bound.toLocaleString('en-US')}`,
    chart: result.chart,
  });
}

module.exports = { getPricePrediction };
