const CATEGORIES = [
  { id: 1, name: 'Books', icon: '📚', description: 'Textbooks, novels, reference books' },
  { id: 2, name: 'Laptop', icon: '💻', description: 'Laptops and accessories' },
  { id: 3, name: 'Calculator', icon: '🔢', description: 'Scientific and graphing calculators' },
  { id: 4, name: 'Drawing Instruments', icon: '📐', description: 'Drafters, T-squares, compasses' },
  { id: 5, name: 'Stationery', icon: '✏️', description: 'Pens, notebooks, folders' },
  { id: 6, name: 'Fan', icon: '🌀', description: 'Table fans, ceiling fans' },
  { id: 7, name: 'Cooler', icon: '❄️', description: 'Air coolers for hostel rooms' },
  { id: 8, name: 'Hostel Items', icon: '🏠', description: 'Bedding, utensils, storage' },
  { id: 9, name: 'Electronics', icon: '🔌', description: 'Headphones, chargers, gadgets' },
  { id: 10, name: 'Other', icon: '📦', description: 'Everything else' },
];

const SCHOOLS = [
  {
    id: 1,
    name: 'IIIT Sonepat',
    departments: [
      'B.Tech Computer Science and Engineering',
      'B.Tech CSE (Data Science and Analytics)',
      'B.Tech Information Technology',
      'Ph.D',
    ],
    semesters: 8,
  },
];

const LISTING_TYPES = [
  { id: 'sell', label: 'Sell', description: 'Permanently sell your item' },
  { id: 'rent', label: 'Rent', description: 'Rent your item for a period' },
  { id: 'borrow', label: 'Borrow', description: 'Lend your item temporarily' },
  { id: 'swap', label: 'Skill Swap', description: 'Exchange for a skill or service' },
];

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
  if (!school) {
    return res.json({ semesters: Array.from({ length: 8 }, (_, i) => i + 1) });
  }
  return res.json({ semesters: Array.from({ length: school.semesters }, (_, i) => i + 1) });
}

module.exports = { getCategories, getSchools, getListingTypes, getSemesters };
