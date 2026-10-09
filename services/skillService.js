const { query } = require('./db');
const { AppError } = require('../utils/AppError');

const skillSelect = `
  SELECT s.skill_id, s.user_id, s.category_id, s.type, s.title, s.description,
         s.location_type, s.cover_url, s.status, s.view_count, s.created_at, s.updated_at,
         u.username, u.avatar_url, c.name AS category_name,
         COUNT(DISTINCT f.user_id) AS favorite_count,
         COALESCE(ROUND(AVG(r.rating), 1), 0) AS owner_rating
  FROM skills s
  JOIN users u ON u.user_id = s.user_id
  JOIN skill_categories c ON c.category_id = s.category_id
  LEFT JOIN favorites f ON f.skill_id = s.skill_id
  LEFT JOIN reviews r ON r.to_user_id = s.user_id
`;

async function listSkills(filters, pagination) {
  const where = ["s.status = 'active'"];
  const params = [];
  if (filters.keyword) {
    where.push('(s.title LIKE ? OR s.description LIKE ? OR u.username LIKE ?)');
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword, keyword);
  }
  if (filters.categoryId) {
    where.push('s.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.type) {
    where.push('s.type = ?');
    params.push(filters.type);
  }
  if (filters.locationType) {
    where.push('s.location_type = ?');
    params.push(filters.locationType);
  }

  const orderMap = {
    newest: 's.created_at DESC',
    popular: 's.view_count DESC, s.created_at DESC',
    favorites: 'favorite_count DESC, s.created_at DESC',
  };
  const orderBy = orderMap[filters.sort] || orderMap.newest;
  const whereSql = where.join(' AND ');
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM skills s JOIN users u ON u.user_id = s.user_id
     WHERE ${whereSql}`,
    params,
  );
  const items = await query(
    `${skillSelect}
     WHERE ${whereSql}
     GROUP BY s.skill_id
     ORDER BY ${orderBy}
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    params,
  );
  const total = Number(countRows[0].total);
  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    },
  };
}

async function getSkill(skillId) {
  await query('UPDATE skills SET view_count = view_count + 1 WHERE skill_id = ? AND status = ?', [skillId, 'active']);
  const skills = await query(
    `${skillSelect}
     WHERE s.skill_id = ? AND s.status = 'active'
     GROUP BY s.skill_id`,
    [skillId],
  );
  if (!skills.length) throw new AppError(404, 'SKILL_NOT_FOUND', '技能不存在或已下架');
  const related = await query(
    `SELECT skill_id, title, type, location_type, view_count
     FROM skills
     WHERE category_id = ? AND skill_id <> ? AND status = 'active'
     ORDER BY view_count DESC LIMIT 4`,
    [skills[0].category_id, skillId],
  );
  return { ...skills[0], related };
}

async function listMine(userId) {
  return query(
    `SELECT s.skill_id, s.category_id, c.name AS category_name, s.type, s.title,
            s.description, s.location_type, s.cover_url, s.status, s.view_count,
            s.created_at, s.updated_at,
            COUNT(DISTINCT f.user_id) AS favorite_count
     FROM skills s
     JOIN skill_categories c ON c.category_id = s.category_id
     LEFT JOIN favorites f ON f.skill_id = s.skill_id
     WHERE s.user_id = ?
     GROUP BY s.skill_id
     ORDER BY s.created_at DESC`,
    [userId],
  );
}

async function listRecommended(userId) {
  return query(
    `SELECT s.skill_id, s.title, s.type, s.location_type, s.view_count,
            s.category_id, c.name AS category_name,
            u.user_id, u.username, u.avatar_url,
            CASE WHEN s.category_id IN (
              SELECT DISTINCT source.category_id FROM (
                SELECT s1.category_id
                FROM favorites f1 JOIN skills s1 ON s1.skill_id = f1.skill_id
                WHERE f1.user_id = ?
                UNION
                SELECT s2.category_id FROM skills s2
                WHERE s2.user_id = ? AND s2.type = 'request'
              ) source
            ) THEN 1 ELSE 0 END AS preference_match
     FROM skills s
     JOIN users u ON u.user_id = s.user_id
     JOIN skill_categories c ON c.category_id = s.category_id
     WHERE s.status = 'active' AND s.type = 'offer' AND s.user_id <> ?
     ORDER BY preference_match DESC, s.view_count DESC, s.created_at DESC
     LIMIT 8`,
    [userId, userId, userId],
  );
}

async function createSkill(userId, payload) {
  const result = await query(
    `INSERT INTO skills
       (user_id, category_id, type, title, description, location_type, cover_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, payload.categoryId, payload.type, payload.title, payload.description, payload.locationType, payload.coverUrl],
  );
  return getOwnedSkill(result.insertId, userId);
}

async function getOwnedSkill(skillId, userId) {
  const skills = await query(
    `SELECT skill_id, user_id, category_id, type, title, description,
            location_type, cover_url, status, view_count, created_at, updated_at
     FROM skills WHERE skill_id = ? AND user_id = ?`,
    [skillId, userId],
  );
  if (!skills.length) throw new AppError(404, 'SKILL_NOT_FOUND', '技能不存在或无权操作');
  return skills[0];
}

async function updateSkill(skillId, userId, changes) {
  await getOwnedSkill(skillId, userId);
  const mapping = {
    categoryId: 'category_id',
    type: 'type',
    title: 'title',
    description: 'description',
    locationType: 'location_type',
    coverUrl: 'cover_url',
    status: 'status',
  };
  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(mapping)) {
    if (changes[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(changes[key]);
    }
  }
  if (!fields.length) throw new AppError(400, 'NO_CHANGES', '没有需要修改的技能信息');
  params.push(skillId, userId);
  await query(`UPDATE skills SET ${fields.join(', ')} WHERE skill_id = ? AND user_id = ?`, params);
  return getOwnedSkill(skillId, userId);
}

async function deactivateSkill(skillId, userId) {
  const skill = await getOwnedSkill(skillId, userId);
  if (skill.status === 'inactive') return skill;
  const activeExchanges = await query(
    `SELECT COUNT(*) AS count FROM exchanges
     WHERE (offer_skill_id = ? OR request_skill_id = ?) AND status IN ('pending', 'accepted')`,
    [skillId, skillId],
  );
  if (Number(activeExchanges[0].count) > 0) {
    throw new AppError(409, 'ACTIVE_EXCHANGE_EXISTS', '该技能存在进行中的交换，暂时不能下架');
  }
  await query("UPDATE skills SET status = 'inactive' WHERE skill_id = ? AND user_id = ?", [skillId, userId]);
  return getOwnedSkill(skillId, userId);
}

module.exports = {
  listSkills,
  getSkill,
  listMine,
  listRecommended,
  createSkill,
  updateSkill,
  deactivateSkill,
};
