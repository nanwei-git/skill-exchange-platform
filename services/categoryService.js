const { query } = require('./db');

async function listCategories() {
  return query(
    `SELECT c.category_id, c.name, c.description,
            COUNT(CASE WHEN s.status = 'active' THEN 1 END) AS skill_count
     FROM skill_categories c
     LEFT JOIN skills s ON s.category_id = c.category_id
     GROUP BY c.category_id
     ORDER BY c.category_id`,
  );
}

module.exports = { listCategories };
