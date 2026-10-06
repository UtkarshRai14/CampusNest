const { CATEGORIES, SCHOOLS, LISTING_TYPES, MAX_SEMESTER } = require('../config/constants');

function getCategories(req, res) {
  res.json({ categories: CATEGORIES });
}

function getSchools(req, res) {
  res.json({ schools: SCHOOLS });
}

function getListingTypes(req, res) {
  res.json({ listing_types: LISTING_TYPES });
}

function getSemesters(req, res) {
  const schoolId = parseInt(req.params.schoolId, 10);
  const school = SCHOOLS.find((s) => s.id === schoolId);
  const count = school ? school.semesters : MAX_SEMESTER;
  return res.json({ semesters: Array.from({ length: count }, (_, i) => i + 1) });
}

module.exports = { getCategories, getSchools, getListingTypes, getSemesters };
