-- 开发阶段整库重置:删掉所有表,再由 schema.sql 按当前结构重建。
-- 生产环境请勿运行 —— 会删除全部数据与结构。
--
-- 为什么用 DROP 而不是 TRUNCATE:schema.sql 现在是「全新库的权威定义」(纯 CREATE TABLE IF NOT EXISTS,
-- 不再自带 ALTER 迁移)。若只 TRUNCATE 保留旧表结构,再跑 schema.sql 会因 IF NOT EXISTS 跳过、结构不更新。
-- 所以开发重置先 DROP、再由 schema.sql 重建,保证结构永远与 schema.sql 一致。
-- (只想清数据、保留现有结构时,把下面的 DROP TABLE 换成 TRUNCATE ... RESTART IDENTITY CASCADE。)
--
-- 用法(在服务器上,按顺序):
--   psql "$DATABASE_URL" -f database/reset-dev.sql    # 删表
--   psql "$DATABASE_URL" -f database/schema.sql        # 按当前结构重建
--   psql "$DATABASE_URL" -f database/seed-admin.sql    # 重建超级管理员账号
--
-- CASCADE 会处理外键依赖,所以表名顺序无所谓。

DROP TABLE IF EXISTS
  caption_profiles,
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
  user_project_access,
  properties,
  auth_sessions,
  console_users
CASCADE;
