const { query } = require('./db');
const { AppError } = require('../utils/AppError');

async function listFavorites(userId) {
  return query(
    `SELECT f.created_at AS favorited_at,
            s.skill_id, s.title, s.type, s.location_type, s.view_count,
            c.category_id, c.name AS category_name,
            u.user_id, u.username, u.avatar_url
     FROM favorites f
     JOIN skills s ON s.skill_id = f.skill_id
     JOIN skill_categories c ON c.category_id = s.category_id
     JOIN users u ON u.user_id = s.user_id
     WHERE f.user_id = ? AND s.status = 'active'
     ORDER BY f.created_at DESC`,
    [userId],
  );
}

async function addFavorite(userId, skillId) {
  const skills = await query('SELECT skill_id, user_id, title, status FROM skills WHERE skill_id = ?', [skillId]);
  if (!skills.length || skills[0].status !== 'active') {
    throw new AppError(404, 'SKILL_NOT_FOUND', '技能不存在或已下架');
  }
  if (Number(skills[0].user_id) === userId) {
    throw new AppError(400, 'OWN_SKILL_NOT_ALLOWED', '不能收藏自己发布的技能');
  }
  const result = await query('INSERT IGNORE INTO favorites (user_id, skill_id) VALUES (?, ?)', [userId, skillId]);
  return { skillId, title: skills[0].title, added: result.affectedRows === 1 };
}

async function removeFavorite(userId, skillId) {
  const result = await query('DELETE FROM favorites WHERE user_id = ? AND skill_id = ?', [userId, skillId]);
  return { skillId, removed: result.affectedRows === 1 };
}

module.exports = { listFavorites, addFavorite, removeFavorite };
