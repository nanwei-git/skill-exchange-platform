DROP DATABASE IF EXISTS skill_exchange;
CREATE DATABASE skill_exchange
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE skill_exchange;

CREATE TABLE users (
  user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户编号',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt密码哈希',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  phone VARCHAR(20) NULL COMMENT '手机号',
  avatar_url VARCHAR(255) NULL COMMENT '头像地址',
  bio VARCHAR(300) NULL COMMENT '个人简介',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active' COMMENT '账号状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT='用户表';

CREATE TABLE skill_categories (
  category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '分类编号',
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '分类名称',
  description VARCHAR(200) NULL COMMENT '分类说明',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) COMMENT='技能分类表';

CREATE TABLE skills (
  skill_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '技能编号',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '发布者编号',
  category_id INT UNSIGNED NOT NULL COMMENT '分类编号',
  type ENUM('offer', 'request') NOT NULL COMMENT 'offer掌握/request想学',
  title VARCHAR(100) NOT NULL COMMENT '技能标题',
  description TEXT NOT NULL COMMENT '技能说明',
  location_type ENUM('online', 'offline', 'both') NOT NULL DEFAULT 'online' COMMENT '交换方式',
  cover_url VARCHAR(255) NULL COMMENT '封面地址',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '上架状态',
  view_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览次数',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  CONSTRAINT fk_skills_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_skills_category FOREIGN KEY (category_id) REFERENCES skill_categories(category_id),
  INDEX idx_skills_list (status, type, category_id, created_at),
  INDEX idx_skills_user (user_id, status)
) COMMENT='技能发布表';

CREATE TABLE exchanges (
  exchange_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '交换编号',
  offer_skill_id BIGINT UNSIGNED NOT NULL COMMENT '申请者提供的技能',
  request_skill_id BIGINT UNSIGNED NOT NULL COMMENT '申请者申请的技能',
  applicant_id BIGINT UNSIGNED NOT NULL COMMENT '申请人',
  target_user_id BIGINT UNSIGNED NOT NULL COMMENT '接收人',
  message VARCHAR(500) NULL COMMENT '申请留言',
  status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending' COMMENT '交换状态',
  applicant_confirmed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '申请人完成确认',
  target_confirmed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '接收人完成确认',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  completed_at DATETIME NULL COMMENT '完成时间',
  CONSTRAINT fk_exchanges_offer_skill FOREIGN KEY (offer_skill_id) REFERENCES skills(skill_id),
  CONSTRAINT fk_exchanges_request_skill FOREIGN KEY (request_skill_id) REFERENCES skills(skill_id),
  CONSTRAINT fk_exchanges_applicant FOREIGN KEY (applicant_id) REFERENCES users(user_id),
  CONSTRAINT fk_exchanges_target FOREIGN KEY (target_user_id) REFERENCES users(user_id),
  CONSTRAINT chk_exchange_users CHECK (applicant_id <> target_user_id),
  UNIQUE KEY uk_exchange_pair (applicant_id, offer_skill_id, request_skill_id),
  INDEX idx_exchanges_applicant (applicant_id, status, created_at),
  INDEX idx_exchanges_target (target_user_id, status, created_at)
) COMMENT='技能交换申请表';

CREATE TABLE reviews (
  review_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '评价编号',
  exchange_id BIGINT UNSIGNED NOT NULL COMMENT '交换编号',
  from_user_id BIGINT UNSIGNED NOT NULL COMMENT '评价人',
  to_user_id BIGINT UNSIGNED NOT NULL COMMENT '被评价人',
  skill_id BIGINT UNSIGNED NOT NULL COMMENT '被评价技能',
  rating TINYINT UNSIGNED NOT NULL COMMENT '1到5分',
  content VARCHAR(500) NOT NULL COMMENT '评价内容',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评价时间',
  CONSTRAINT fk_reviews_exchange FOREIGN KEY (exchange_id) REFERENCES exchanges(exchange_id),
  CONSTRAINT fk_reviews_from_user FOREIGN KEY (from_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_reviews_to_user FOREIGN KEY (to_user_id) REFERENCES users(user_id),
  CONSTRAINT fk_reviews_skill FOREIGN KEY (skill_id) REFERENCES skills(skill_id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_users CHECK (from_user_id <> to_user_id),
  UNIQUE KEY uk_review_once (exchange_id, from_user_id),
  INDEX idx_reviews_user (to_user_id, created_at)
) COMMENT='交换评价表';

CREATE TABLE notifications (
  notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '通知编号',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '接收用户',
  type ENUM('exchange_created', 'exchange_decided', 'exchange_completed', 'review_received', 'system') NOT NULL COMMENT '通知类型',
  content VARCHAR(300) NOT NULL COMMENT '通知内容',
  related_exchange_id BIGINT UNSIGNED NULL COMMENT '关联交换编号',
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '通知时间',
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_notifications_exchange FOREIGN KEY (related_exchange_id) REFERENCES exchanges(exchange_id),
  INDEX idx_notifications_user (user_id, is_read, created_at)
) COMMENT='用户通知表';

CREATE TABLE favorites (
  user_id BIGINT UNSIGNED NOT NULL COMMENT '用户编号',
  skill_id BIGINT UNSIGNED NOT NULL COMMENT '技能编号',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_skill FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE,
  INDEX idx_favorites_skill (skill_id)
) COMMENT='技能收藏表';

-- 6个演示账号的密码均为 123456，仅用于本地课程演示。
INSERT INTO users (username, password_hash, email, phone, avatar_url, bio) VALUES
('linxia', '$2b$10$7LQ4R7NfCfVkv5HbczvGS.L9pg3CgDNlgYRIHNVT7QDx1TEW3hgue', 'linxia@example.com', '13800000001', 'https://api.dicebear.com/9.x/initials/svg?seed=LX', '喜欢编程，也想学习摄影。'),
('zhouyu', '$2b$10$MU/Ph.jFrUpXnkKIjlvRjuk1N3N7onlT1zxG1RZcb2XrEVfvVPSMm', 'zhouyu@example.com', '13800000002', 'https://api.dicebear.com/9.x/initials/svg?seed=ZY', '英语学习伙伴，正在补充技术技能。'),
('chenmo', '$2b$10$o61z67a9vhtMFU/r6JKIy.fu29n/JT.7wwk8gK9IKFqcT5hbZRLH6', 'chenmo@example.com', '13800000003', 'https://api.dicebear.com/9.x/initials/svg?seed=CM', '吉他爱好者，乐于分享入门技巧。'),
('sunan', '$2b$10$WK1g3ULd4GD4jTCuuP3Z0eXnysW/dUnTOAnAKQo8Z3jper9vY5MVa', 'sunan@example.com', '13800000004', 'https://api.dicebear.com/9.x/initials/svg?seed=SN', '校园摄影爱好者。'),
('tangguo', '$2b$10$8hTb3tpsnftUWjS5NuwNpeHqDs9WvevE02I5Cs4nYik.vmgmtyjnO', 'tangguo@example.com', '13800000005', 'https://api.dicebear.com/9.x/initials/svg?seed=TG', '视觉设计与排版学习中。'),
('jianghe', '$2b$10$jagqAQECxHouYN4SmJoemeCw/AwHN8t2qTa93WmFz/oZn/whTxh.u', 'jianghe@example.com', '13800000006', 'https://api.dicebear.com/9.x/initials/svg?seed=JH', '喜欢做饭，希望认识更多技能伙伴。');

INSERT INTO skill_categories (name, description) VALUES
('编程开发', '编程语言、网站开发与软件工具'),
('外语学习', '英语、日语等语言交流'),
('音乐艺术', '乐器、声乐与艺术表达'),
('摄影摄像', '摄影基础、后期与视频制作'),
('设计创意', '平面设计、排版与创意表达'),
('生活技能', '烹饪、整理与实用生活技能');

INSERT INTO skills (user_id, category_id, type, title, description, location_type, cover_url, view_count) VALUES
(1, 1, 'offer', 'Python 零基础入门', '通过三个小练习掌握变量、循环、函数与文件处理，适合第一次接触编程的同学。', 'online', NULL, 28),
(1, 4, 'request', '想学习校园人像摄影', '希望学习构图、自然光使用和基础修图，可以在周末线下练习。', 'offline', NULL, 16),
(2, 2, 'offer', '英语口语陪练', '围绕校园生活和求职话题进行一对一口语练习，并帮助纠正常见表达。', 'online', NULL, 31),
(2, 1, 'request', '想学习前端基础', '希望理解 HTML、CSS 和 JavaScript 的基础用法并完成一个小网页。', 'online', NULL, 21),
(3, 3, 'offer', '民谣吉他入门', '从持琴姿势、和弦切换到简单弹唱，适合没有基础的学习者。', 'both', NULL, 35),
(3, 2, 'request', '想提升英语听力', '希望获得适合大学生的听力训练方法和材料推荐。', 'online', NULL, 13),
(4, 4, 'offer', '手机摄影与构图', '使用手机完成校园风景和人像拍摄，讲解三分法、引导线和后期调整。', 'offline', NULL, 42),
(4, 3, 'request', '想学一首吉他弹唱', '想用两到三次练习学会一首简单的流行歌曲。', 'offline', NULL, 18),
(5, 5, 'offer', 'Photoshop 海报排版', '讲解图层、蒙版、文字层级和配色，完成一张校园活动海报。', 'online', NULL, 27),
(5, 6, 'request', '想学习家常菜', '希望学会两道容易复现的家常菜，重点了解调味和火候。', 'offline', NULL, 12),
(6, 6, 'offer', '三道快手家常菜', '分享番茄炒蛋、可乐鸡翅和炒青菜的准备流程与火候控制。', 'offline', NULL, 33),
(6, 5, 'request', '想学习简历排版', '希望改善简历的信息层级、字体和版面，让内容更清晰。', 'online', NULL, 15);

INSERT INTO exchanges (offer_skill_id, request_skill_id, applicant_id, target_user_id, message, status, applicant_confirmed, target_confirmed, completed_at) VALUES
(3, 1, 2, 1, '我可以陪你练英语，希望交换 Python 入门指导。', 'completed', 1, 1, '2026-07-03 18:30:00'),
(5, 3, 3, 2, '我可以教吉他，希望一起练习英语口语。', 'completed', 1, 1, '2026-07-05 20:00:00'),
(7, 5, 4, 3, '我提供手机摄影教学，希望学习吉他弹唱。', 'completed', 1, 1, '2026-07-07 16:00:00'),
(9, 7, 5, 4, '可以交换海报排版和摄影构图经验。', 'accepted', 0, 0, NULL),
(11, 9, 6, 5, '我教家常菜，希望学习 Photoshop。', 'pending', 0, 0, NULL),
(1, 11, 1, 6, '我可以教 Python，希望学习家常菜。', 'rejected', 0, 0, NULL);

INSERT INTO reviews (exchange_id, from_user_id, to_user_id, skill_id, rating, content) VALUES
(1, 2, 1, 1, 5, '讲解清楚，练习安排很适合零基础。'),
(1, 1, 2, 3, 5, '口语陪练氛围轻松，纠正很耐心。'),
(2, 3, 2, 3, 4, '话题准备充分，学到了实用表达。'),
(2, 2, 3, 5, 5, '和弦讲解细致，很快完成了第一段弹唱。'),
(3, 4, 3, 5, 5, '步骤清晰，第一次练习就能顺利切换和弦。'),
(3, 3, 4, 7, 4, '构图案例直观，课后练习也很有帮助。');

INSERT INTO notifications (user_id, type, content, related_exchange_id, is_read) VALUES
(1, 'exchange_created', '周雨向你的 Python 零基础入门发起了交换申请。', 1, 1),
(2, 'exchange_decided', '林夏接受了你的技能交换申请。', 1, 1),
(1, 'exchange_completed', '交换已由双方确认完成，现在可以互相评价。', 1, 1),
(2, 'review_received', '你收到了一条新的技能交换评价。', 1, 0),
(2, 'exchange_created', '陈墨向你的英语口语陪练发起了交换申请。', 2, 1),
(3, 'exchange_completed', '交换已完成，感谢你的分享。', 2, 0),
(3, 'exchange_created', '苏南向你的民谣吉他入门发起了交换申请。', 3, 1),
(4, 'exchange_completed', '交换已完成，现在可以发布评价。', 3, 0),
(4, 'exchange_created', '唐果向你的手机摄影与构图发起了交换申请。', 4, 0),
(5, 'exchange_decided', '苏南接受了你的技能交换申请。', 4, 0),
(5, 'exchange_created', '江河向你的 Photoshop 海报排版发起了交换申请。', 5, 0),
(6, 'system', '欢迎使用个人技能交换平台。', NULL, 0);

INSERT INTO favorites (user_id, skill_id) VALUES
(1, 3), (1, 5), (2, 7), (2, 9),
(3, 1), (4, 3), (5, 11), (6, 9);
