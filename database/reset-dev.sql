-- 开发阶段整库重置:清空所有数据,只保留由 schema.sql 重建的结构。
-- 生产环境请勿运行 —— 会删除全部数据。
--
-- 用法(在服务器上,按顺序):
--   psql "$DATABASE_URL" -f database/reset-dev.sql
--   psql "$DATABASE_URL" -f database/schema.sql      # 建表 + 加 property_id 列(空表可加 NOT NULL)
--   psql "$DATABASE_URL" -f database/seed-admin.sql   # 重建管理员账号
--
-- 说明:先 TRUNCATE 清空,保证随后 schema.sql 的 `ADD COLUMN ... NOT NULL` 能在空表上成功。
-- 若某张表还不存在(全新库),对应 TRUNCATE 会报错,可忽略,直接跑 schema.sql 即可。

TRUNCATE TABLE
  publish_records,
  draft_images,
  drafts,
  material_tags,
  material_files,
  materials,
  config_node_modes,
  config_nodes,
  notes,
  strategy_heat_rows,
  strategy_keywords,
  property_channels,
  properties,
  auth_sessions,
  console_users
RESTART IDENTITY CASCADE;
