








const pool = require('./pool');
const { initDb } = require('./init');
const { hashPassword } = require('../services/auth.service');

const demoUsers = [
  { name: 'Arjun Sharma', email: 'arjun@iiitsonepat.ac.in', department: 'B.Tech Computer Science and Engineering', school: 'IIIT Sonepat', semester: 5 },
  { name: 'Priya Verma', email: 'priya@iiitsonepat.ac.in', department: 'B.Tech Computer Science and Engineering', school: 'IIIT Sonepat', semester: 3 },
  { name: 'Rahul Patel', email: 'rahul@iiitsonepat.ac.in', department: 'B.Tech Information Technology', school: 'IIIT Sonepat', semester: 7 },
  { name: 'Kavya Singh', email: 'kavya@iiitsonepat.ac.in', department: 'B.Tech CSE (Data Science and Analytics)', school: 'IIIT Sonepat', semester: 4 },
  { name: 'Mohit Gupta', email: 'mohit@iiitsonepat.ac.in', department: 'B.Tech Information Technology', school: 'IIIT Sonepat', semester: 6 },
  { name: 'Ananya Joshi', email: 'ananya@iiitsonepat.ac.in', department: 'Ph.D', school: 'IIIT Sonepat', semester: 2 },
  { name: 'Vikram Yadav', email: 'vikram@iiitsonepat.ac.in', department: 'B.Tech Computer Science and Engineering', school: 'IIIT Sonepat', semester: 5 },
  { name: 'Sneha Mishra', email: 'sneha2@iiitsonepat.ac.in', department: 'B.Tech Information Technology', school: 'IIIT Sonepat', semester: 3 },
];

const listingsData = [
  { title: 'Electric Iron — 750W Heavy Duty Press', description: 'Accurate 750W heavy duty electric iron. Perfect for pressing uniforms and formals before college and viva. Heats up quickly. No leakage. Selling as buying a steam iron.', price: 400, condition: 4, category: 'Hostel Items', listing_type: 'sell', seller_idx: 2, image_url: 'https://5.imimg.com/data5/SELLER/Default/2021/11/TT/XZ/XM/5847953/accurate-heavy-weight-iron-press-750-watt.jpg' },
  { title: 'Metal Punching Machine — 2 Hole', description: 'Heavy duty 2-hole metal punching machine. Punches upto 20 sheets cleanly. Essential for lab files, practical records, and project reports. Barely used. Must have for every semester.', price: 70, condition: 5, category: 'Stationery', listing_type: 'sell', seller_idx: 3, image_url: 'https://m.media-amazon.com/images/I/61Cmsb8fEbL._AC_UF1000,1000_QL80_.jpg' },
  { title: 'Matka — Clay Water Pot with Tap & Stand', description: 'Traditional clay matka with brass tap and stand. Keeps water naturally cool without electricity. Perfect for Sonepat summers. Eco-friendly and healthy. Selling as shifting hostel.', price: 100, condition: 5, category: 'Hostel Items', listing_type: 'sell', seller_idx: 5, image_url: 'https://m.media-amazon.com/images/I/41bX2nr2-cL.jpg' },
  { title: 'GATE Mathematics & CS — Previous Year Papers', description: 'GATE preparation book for Mathematics and CS stream. Previous year solved papers with detailed explanations. Must have for GATE aspirants. Light use, all pages intact.', price: 400, condition: 4, category: 'Books', listing_type: 'sell', seller_idx: 4, image_url: 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTKQ09AtRM-Mudduz_vA2H6cEAlIpqP-f6bV5xCoAQbxWelT9zlhCaRqrGS1EaORl1SAdG7BqaxTki8cm8MnJCkxwI4ch4-kaxJ9XVeCP9MogrHRv1vfSq4&usqp=CAc' },
  { title: 'Engineering Mathematics — B.S. Grewal', description: 'Engineering Mathematics by B.S. Grewal. Covers the full B.Tech syllabus for Sem 1 and 2. Some chapters have highlighted text. Great condition overall. Best book for engineering maths.', price: 130, condition: 4, category: 'Books', listing_type: 'sell', seller_idx: 0, image_url: 'https://easy2learning.in/static/uploads/books/WhatsApp_Image_2025-06-12_at_15.56.26.jpeg' },
  { title: 'Foldable Clothes Drying Stand with Wheels', description: 'Premium foldable clothes drying stand with wheels. Multiple bars, foldable wings. Easy to move and store. Holds 15-20 clothes. Perfect for hostel room. Selling as going home.', price: 300, condition: 4, category: 'Hostel Items', listing_type: 'sell', seller_idx: 7, image_url: 'https://rukminim2.flixcart.com/image/480/640/xif0q/cloth-dryer-stand/h/b/a/15-premium-clothes-stand-for-drying-with-wheels-foldable-wings-original-imagwyhfkpthhfps.jpeg?q=20' },
  { title: 'Sandwich Maker — 2 Slice Non Stick Grill', description: 'Non-stick sandwich maker, makes 2 sandwiches at once. Ready in 3 minutes. Perfect for hostel breakfast. No oil needed. Clean and working perfectly. Selling as going home for vacation.', price: 450, condition: 4, category: 'Hostel Items', listing_type: 'sell', seller_idx: 5, image_url: 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcRKJ1kw6iOtC83VnupGVm71bCvJzlOtTHmr2i0PR1bYt4ovzgm8xh9fDQb0DWYa6JF9JdYUtosePPjhmdWw8sjDIgzbPtUiD56UAQ5a77Icouwbs8nb_nqd7p2Y96Of-CYUxvUrkA&usqp=CAc' },
  { title: 'Casio fx-991ES PLUS — Borrow for Exam (₹600/day)', description: 'Borrow my Casio fx-991ES PLUS scientific calculator for ₹600/day. All 417 functions working. Exam-hall approved. ⚠️ Terms: Any damage or loss during borrowing must be repaired or compensated fully by the borrower.', price: 100, condition: 5, category: 'Calculator', listing_type: 'borrow', seller_idx: 2, image_url: 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcR0OAdNkqt0-lIXvcsnPpfF1J03WNZbTgejCXsKj1xjK4oZvZ9EJ17-neuqV3U_YIM5rKDJpvYQ9aRtiGKTR65hBrLSzqWsMkMLsvVmrhYxHXR_DgmtDfWcTh8VysonrToS-e5QxvcQsh4&usqp=CAc' },
  { title: 'Complete Drafter Set — Mini Drafter + Instruments', description: 'Full engineering drawing set with mini drafter, compass, set squares, protractor and scales. Used for 1 semester. All pieces intact. Useful for engineering drawing coursework and project diagrams.', price: 500, condition: 4, category: 'Drawing Instruments', listing_type: 'sell', seller_idx: 6, image_url: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQx5PH4_GkSrzWySAhiIyjQsw_ti7xqt60Hdm3byXgc00WPY1RflIr9z62teAUvUHa4xXlmXa2b-BNsdQVZAA8XsQYgWI7jLRLwimf2VOfbUzZiaiCNw6dwJaEgJrsPCiCAJqXR1PxfDZI&usqp=CAc' },
  { title: 'C-Type to USB-A Cable — 1 Metre Fast Charge', description: '1 metre USB-C to USB-A braided cable. Supports fast charging upto 18W. Compatible with all Android phones. No fraying. Selling as I bought a wireless charger.', price: 300, condition: 5, category: 'Electronics', listing_type: 'sell', seller_idx: 3, image_url: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcSpU-BdgYDUKBk19Bs4JiD8_RgJIGEvhehaq42fC_jma1Sbj-GsiroNjwqdY3ImYMOewocSLTwqG_8RSTPuBqPLpg6swsHEMCPF_5Yz2FY_&usqp=CAc' },
  { title: 'Laptop — Borrow for Project or Presentation (₹200/day)', description: 'Borrow my laptop for ₹200/day. Windows 11, i5, 8GB RAM, SSD. Perfect for project demos, presentations, or when your laptop is under repair. ⚠️ Terms & Conditions: Any damage or hardware issue caused during borrowing period must be fully repaired by the borrower at their own expense.', price: 200, condition: 5, category: 'Laptop', listing_type: 'borrow', seller_idx: 0, image_url: 'https://i5.walmartimages.com/seo/HP-15-6-Ryzen-5-8GB-256GB-Laptop-Rose-Gold_36809cf3-480b-47a5-94f0-e1d5e70c58c0_3.fcc0d6494b0e279a13c32c80c28abfa3.jpeg' },
  { title: 'Old JEE Mains Notes — Handwritten Complete Set', description: 'Complete handwritten JEE Mains notes. Physics, Chemistry, Mathematics all covered topic-wise. Very detailed and well organized. Made by a serious JEE aspirant. Price negotiable — serious buyers contact only.', price: 1, condition: 3, category: 'Books', listing_type: 'sell', seller_idx: 1, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQs4aOTqb7eTdMQlu4K_rESRdTn-VUjJz-zdQ&s' },
  { title: 'Table Fan — 3 Speed Oscillating 12 inch', description: '12-inch table fan with 3 speed settings and 90 degree oscillation. Works silently. Perfect for study desk. Selling as hostel installed ceiling fans in all rooms now.', price: 600, condition: 4, category: 'Fan', listing_type: 'sell', seller_idx: 7, image_url: 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcReR4cUUfxSJI0hrrzGnXAUNIZAKdqIz9TpDyaJYIRUhhS5X5X1zEuhDKWOR-qMO8xjWfyIfYmPoQmYJjy9eXIFwH52sNzotRZ1TH7B_Im6gLj55qOMGtl0Qg&usqp=CAc' },
  { title: 'LED Study Table Lamp — Flexible Neck 3 Brightness', description: 'LED study lamp with flexible neck and 3 brightness levels. Eye care warm light. USB powered. Perfect for late night studies. Selling as shifting to new room with better lighting.', price: 230, condition: 5, category: 'Hostel Items', listing_type: 'sell', seller_idx: 4, image_url: 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRjZTvm5wkY-glIvD5cuRnT8Y_qechjGQYSfB31C66oAOato3vke2EfmyxOutWjvyJ2WvG4RzTCWcnBp7PPLAFJ5I9rPQKgofiUUDvH4wc&usqp=CAc' },
  { title: 'Steel Almirah — 2 Door with Lock & Key', description: 'Heavy steel almirah with 2 doors, multiple shelves and hanging rod. Comes with lock and 2 keys. Secure for valuables, clothes and documents. Used for 2 years. Structurally solid.', price: 2400, condition: 3, category: 'Hostel Items', listing_type: 'sell', seller_idx: 2, image_url: 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSnp4j56dbWE-EIejCNCLX5VA9A49HqihTnl47LhJiGY4_aCok-9_i1mRKWzGd4HojcVBu7ZdD4e9DHk0KPT2neRC5yawqp6wqJLWYGpsKW2rXBYC3WQfRkhw&usqp=CAc' },
  { title: 'Folding Bed — Single with Foam Mattress', description: 'Foldable single bed with foam mattress. Easy to fold and store. Perfect for small hostel rooms. Strong steel frame. Used for 1 year, clean mattress. Selling as going home permanently.', price: 1500, condition: 4, category: 'Hostel Items', listing_type: 'sell', seller_idx: 6, image_url: 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQUpTSzSb-Md2G2KeQyhKKihAXQbLCe4GIQNYptvq5Z3UUlbkwbzSzcEt3ZO0rlDD9IvmCrTdIG5kgogV2QyV08J96rd_vn1JyYJ-W3m-iPzbEVsB1zvcT1za3y7G-n9muoQudqdZcjFss&usqp=CAc' },
  { title: 'Foldable Study Table for Bed — Laptop Desk', description: 'Portable foldable laptop table for use on bed. Adjustable angle. Perfect for studying in bed or watching lectures. Lightweight and easy to carry. Selling as I prefer sitting at desk now.', price: 125, condition: 4, category: 'Hostel Items', listing_type: 'sell', seller_idx: 1, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFsDWm_yuwOp3zJ0QE6wO58Z1BX14p79_17g&s' },
  { title: 'Stapler — Heavy Duty with 500 Staples', description: 'Heavy duty stapler with 500 staples included. Staples upto 25 pages at once. Essential for project reports, assignments and practical files. Good working condition.', price: 100, condition: 4, category: 'Stationery', listing_type: 'sell', seller_idx: 7, image_url: 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTeUWcuMOWw8gjRYFRtzliuy1UqDjPQmNGsRQt7xAuci8G3dCQzUg5iroIHVIbheonZAURQeVyDAWdnKt9BRWpT36pFdNNYwR-cYOQZp_o2CHe-XwcNMN1I5Ldcg0-MP_BgVWX7JpU0sU0&usqp=CAc' },
  { title: 'Immersion Water Heater Rod — 500W', description: '500W immersion water heater rod. Heats a bucket of water in 10 minutes. Essential for cold hostel winters! Safe with insulated handle. Selling as my room got a geyser installed.', price: 230, condition: 4, category: 'Hostel Items', listing_type: 'sell', seller_idx: 3, image_url: 'https://5.imimg.com/data5/SELLER/Default/2022/7/IN/MT/SO/110052248/immersion-rod-heater-500x500.jpg' },
];

async function seed() {
  await initDb();

  await pool.query('DELETE FROM listings');
  console.log('🗑️ Cleared old listings');

  const createdUsers = [];
  for (const u of demoUsers) {
    const { rows: existingRows } = await pool.query('SELECT * FROM users WHERE email = $1', [u.email]);
    if (existingRows.length > 0) {
      createdUsers.push(existingRows[0]);
      continue;
    }
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, department, school, semester)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [u.name, u.email, hashPassword('demo1234'), u.department, u.school, u.semester]
    );
    createdUsers.push(rows[0]);
  }
  console.log(`✅ ${createdUsers.length} demo users ready`);

  let count = 0;
  for (const l of listingsData) {
    const seller = createdUsers[l.seller_idx];
    await pool.query(
      `INSERT INTO listings
        (title, description, price, condition, category, listing_type,
         department_tag, semester_tag, image_url, seller_id, is_active, is_flagged)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,TRUE,FALSE)`,
      [l.title, l.description, l.price, l.condition, l.category, l.listing_type,
        seller.department, l.image_url, seller.id]
    );
    count += 1;
  }
  console.log(`✅ ${count} real listings created with your images!`);
  console.log('🔑 Demo user password: demo1234');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
