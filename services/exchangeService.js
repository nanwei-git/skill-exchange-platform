const { query, transaction } = require('./db');
const { AppError } = require('../utils/AppError');

const detailSql = `
  SELECT e.exchange_id, e.offer_skill_id, e.request_skill_id,
         e.applicant_id, applicant.username AS applicant_username,
         e.target_user_id, target_user.username AS target_username,
         e.message, e.status, e.applicant_confirmed, e.target_confirmed,
         e.created_at, e.updated_at, e.completed_at,
         offer_skill.title AS offer_skill_title,
         request_skill.title AS request_skill_title,
         offer_category.name AS offer_category_name,
         request_category.name AS request_category_name
  FROM exchanges e
  JOIN users applicant ON applicant.user_id = e.applicant_id
  JOIN users target_user ON target_user.user_id = e.target_user_id
  JOIN skills offer_skill ON offer_skill.skill_id = e.offer_skill_id
  JOIN skills request_skill ON request_skill.skill_id = e.request_skill_id
  JOIN skill_categories offer_category ON offer_category.category_id = offer_skill.category_id
  JOIN skill_categories request_category ON request_category.category_id = request_skill.category_id
`;

async function createExchange(userId, payload) {
  return transaction(async (connection) => {
    const [skills] = await connection.execute(
      `SELECT skill_id, user_id, type, title, status
       FROM skills WHERE skill_id IN (?, ?) FOR UPDATE`,
      [payload.offerSkillId, payload.requestSkillId],
    );
    const offerSkill = skills.find((skill) => Number(skill.skill_id) === payload.offerSkillId);
    const requestSkill = skills.find((skill) => Number(skill.skill_id) === payload.requestSkillId);
    if (!offerSkill || !requestSkill) {
      throw new AppError(404, 'SKILL_NOT_FOUND', '用于交换的技能不存在');
    }
    if (Number(offerSkill.user_id) !== userId) {
      throw new AppError(403, 'INVALID_OFFER_SKILL', '只能使用自己发布的技能进行交换');
    }
    if (Number(requestSkill.user_id) === userId) {
      throw new AppError(400, 'SELF_EXCHANGE_NOT_ALLOWED', '不能申请自己的技能');
    }
    if (offerSkill.type !== 'offer' || requestSkill.type !== 'offer') {
      throw new AppError(400, 'SKILL_TYPE_NOT_ALLOWED', '交换双方必须选择“我掌握”的技能');
    }
    if (offerSkill.status !== 'active' || requestSkill.status !== 'active') {
      throw new AppError(409, 'SKILL_INACTIVE', '技能已下架，不能发起交换');
    }

    const [result] = await connection.execute(
      `INSERT INTO exchanges
         (offer_skill_id, request_skill_id, applicant_id, target_user_id, message)
       VALUES (?, ?, ?, ?, ?)`,
      [payload.offerSkillId, payload.requestSkillId, userId, requestSkill.user_id, payload.message],
    );
    await connection.execute(
      `INSERT INTO notifications (user_id, type, content, related_exchange_id)
       VALUES (?, 'exchange_created', ?, ?)`,
      [requestSkill.user_id, `有人希望用“${offerSkill.title}”交换你的“${requestSkill.title}”。`, result.insertId],
    );
    const [rows] = await connection.execute(`${detailSql} WHERE e.exchange_id = ?`, [result.insertId]);
    return rows[0];
  });
}

async function listExchanges(userId, filters) {
  const where = [];
  const params = [];
  if (filters.role === 'sent') {
    where.push('e.applicant_id = ?');
    params.push(userId);
  } else if (filters.role === 'received') {
    where.push('e.target_user_id = ?');
    params.push(userId);
  } else {
    where.push('(e.applicant_id = ? OR e.target_user_id = ?)');
    params.push(userId, userId);
  }
  if (filters.status) {
    where.push('e.status = ?');
    params.push(filters.status);
  }
  return query(
    `${detailSql}
     WHERE ${where.join(' AND ')}
     ORDER BY e.created_at DESC`,
    params,
  );
}

async function getExchange(exchangeId, userId) {
  const rows = await query(
    `${detailSql}
     WHERE e.exchange_id = ? AND (e.applicant_id = ? OR e.target_user_id = ?)`,
    [exchangeId, userId, userId],
  );
  if (!rows.length) throw new AppError(404, 'EXCHANGE_NOT_FOUND', '交换申请不存在或无权查看');
  const reviews = await query(
    `SELECT review_id, from_user_id, to_user_id, skill_id, rating, content, created_at
     FROM reviews WHERE exchange_id = ? ORDER BY created_at`,
    [exchangeId],
  );
  return { ...rows[0], reviews };
}

async function decideExchange(exchangeId, userId, decision) {
  return transaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM exchanges WHERE exchange_id = ? FOR UPDATE', [exchangeId]);
    if (!rows.length) throw new AppError(404, 'EXCHANGE_NOT_FOUND', '交换申请不存在');
    const exchange = rows[0];
    if (Number(exchange.target_user_id) !== userId) {
      throw new AppError(403, 'FORBIDDEN', '只有技能发布者可以审核申请');
    }
    if (exchange.status !== 'pending') {
      throw new AppError(409, 'INVALID_EXCHANGE_STATE', '只有待处理申请可以接受或拒绝');
    }
    const status = decision === 'accept' ? 'accepted' : 'rejected';
    await connection.execute('UPDATE exchanges SET status = ? WHERE exchange_id = ?', [status, exchangeId]);
    await connection.execute(
      `INSERT INTO notifications (user_id, type, content, related_exchange_id)
       VALUES (?, 'exchange_decided', ?, ?)`,
      [exchange.applicant_id, status === 'accepted' ? '你的技能交换申请已被接受。' : '你的技能交换申请已被拒绝。', exchangeId],
    );
    const [updated] = await connection.execute(`${detailSql} WHERE e.exchange_id = ?`, [exchangeId]);
    return updated[0];
  });
}

async function confirmExchange(exchangeId, userId) {
  return transaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM exchanges WHERE exchange_id = ? FOR UPDATE', [exchangeId]);
    if (!rows.length) throw new AppError(404, 'EXCHANGE_NOT_FOUND', '交换申请不存在');
    const exchange = rows[0];
    const isApplicant = Number(exchange.applicant_id) === userId;
    const isTarget = Number(exchange.target_user_id) === userId;
    if (!isApplicant && !isTarget) throw new AppError(403, 'FORBIDDEN', '你不是该交换的参与者');
    if (exchange.status === 'completed') {
      const [completed] = await connection.execute(`${detailSql} WHERE e.exchange_id = ?`, [exchangeId]);
      return completed[0];
    }
    if (exchange.status !== 'accepted') {
      throw new AppError(409, 'INVALID_EXCHANGE_STATE', '只有已接受的交换可以确认完成');
    }

    const applicantConfirmed = Boolean(exchange.applicant_confirmed) || isApplicant;
    const targetConfirmed = Boolean(exchange.target_confirmed) || isTarget;
    const completed = applicantConfirmed && targetConfirmed;
    await connection.execute(
      `UPDATE exchanges
       SET applicant_confirmed = ?, target_confirmed = ?,
           status = ?, completed_at = CASE WHEN ? THEN NOW() ELSE completed_at END
       WHERE exchange_id = ?`,
      [applicantConfirmed ? 1 : 0, targetConfirmed ? 1 : 0, completed ? 'completed' : 'accepted', completed ? 1 : 0, exchangeId],
    );
    if (completed) {
      await connection.execute(
        `INSERT INTO notifications (user_id, type, content, related_exchange_id) VALUES
         (?, 'exchange_completed', '交换已由双方确认完成，现在可以互相评价。', ?),
         (?, 'exchange_completed', '交换已由双方确认完成，现在可以互相评价。', ?)`,
        [exchange.applicant_id, exchangeId, exchange.target_user_id, exchangeId],
      );
    }
    const [updated] = await connection.execute(`${detailSql} WHERE e.exchange_id = ?`, [exchangeId]);
    return updated[0];
  });
}

async function cancelExchange(exchangeId, userId) {
  return transaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM exchanges WHERE exchange_id = ? FOR UPDATE', [exchangeId]);
    if (!rows.length) throw new AppError(404, 'EXCHANGE_NOT_FOUND', '交换申请不存在');
    const exchange = rows[0];
    if (Number(exchange.applicant_id) !== userId) {
      throw new AppError(403, 'FORBIDDEN', '只有申请人可以撤销申请');
    }
    if (exchange.status !== 'pending') {
      throw new AppError(409, 'INVALID_EXCHANGE_STATE', '只有待处理申请可以撤销');
    }
    await connection.execute("UPDATE exchanges SET status = 'cancelled' WHERE exchange_id = ?", [exchangeId]);
    const [updated] = await connection.execute(`${detailSql} WHERE e.exchange_id = ?`, [exchangeId]);
    return updated[0];
  });
}

module.exports = {
  createExchange,
  listExchanges,
  getExchange,
  decideExchange,
  confirmExchange,
  cancelExchange,
};
