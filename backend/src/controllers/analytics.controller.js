const listingModel = require('../models/listing.model');
const userModel = require('../models/user.model');
const recommenderService = require('../services/recommender.service');
const svgChart = require('../utils/svgChart');


async function getTrending(req, res) {
  const results = await listingModel.countByCategory();
  if (results.length === 0) {
    return res.json({ message: 'No data yet', chart: null, data: [] });
  }

  const categories = results.map((r) => r.category);
  const counts = results.map((r) => r.count);

  return res.json({
    data: results.map((r) => ({ category: r.category, count: r.count })),
    chart: svgChart.generateTrendingChart(categories, counts),
  });
}


async function getDemand(req, res) {
  const results = await listingModel.countByDepartment();
  if (results.length === 0) {
    return res.json({ message: 'No data yet', chart: null, data: [] });
  }

  const departments = results.map((r) => r.department_tag);
  const counts = results.map((r) => r.count);

  return res.json({
    data: results.map((r) => ({ department: r.department_tag, count: r.count })),
    chart: svgChart.generateDemandChart(departments, counts),
  });
}


async function getSummary(req, res) {
  const [totalListings, totalUsers, totalCategories, avgPrice] = await Promise.all([
    listingModel.countAll(),
    userModel.countAll(),
    listingModel.countDistinctCategories(),
    listingModel.averagePrice(),
  ]);

  return res.json({
    total_listings: totalListings || 0,
    total_users: totalUsers || 0,
    total_categories: totalCategories || 0,
    average_price: avgPrice ? Math.round(avgPrice * 100) / 100 : 0,
  });
}


async function getUserRecommendations(req, res) {
  const userId = parseInt(req.params.userId, 10);
  const recommendations = await recommenderService.getRecommendations(userId);
  return res.json({
    user_id: userId,
    recommendations,
    count: recommendations.length,
  });
}

module.exports = { getTrending, getDemand, getSummary, getUserRecommendations };
