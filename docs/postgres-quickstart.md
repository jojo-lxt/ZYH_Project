# PostgreSQL 快速上手(本项目版)

写给第一次用 PostgreSQL 的人。所有例子都用**本项目真实的库和表**,复制粘贴就能跑。

- 你的库:`content_publisher`,跑在 `10.10.94.63:5432`,登录用户 `lxt_test`。
- 应用通过 `DATABASE_URL`(在 `.env.development` / `.env.production`)连库,用的是 Node 的 `pg` 连接池。
- 你手动操作库,用命令行工具 **`psql`**(下面教怎么装和用)。

> 全文凡是 `<你的密码>` 都换成 `DATABASE_URL` 里 `lxt_test:` 后面那段真实密码。**别把密码写进任何提交的文件里。**

---

## 0. 一分钟连上看看

```bash
# 装客户端(见第 1 节)后,一行连上:
psql "postgresql://lxt_test:<你的密码>@10.10.94.63:5432/content_publisher"
```

连上后提示符变成 `content_publisher=>`。试三条:

```
\dt                              -- 列出所有表(元命令,不加分号)
SELECT name, phone, role FROM console_users;   -- 查用户(SQL,要加分号)
\q                               -- 退出
```

记住这条铁律:**反斜杠 `\` 开头的是 psql 命令,不加分号;其它都是 SQL,必须分号 `;` 结尾。** 90% 的新手卡壳都是忘了分号——不加分号回车,psql 会一直等你继续输入(提示符变成 `content_publisher->`),这时补一个 `;` 回车即可。

---

## 1. 先装个客户端(你本机现在没有)

`psql` 是官方命令行客户端。Ubuntu/Debian:

```bash
sudo apt update && sudo apt install -y postgresql-client
psql --version      # 出版本号就装好了
```

> 装的是 `postgresql-client`(只要客户端),不是 `postgresql`(那是数据库服务本体,你不需要——库在 10.10.94.63 上)。

**嫌命令行头大?先用图形工具(强烈推荐新手)**:装 [DBeaver](https://dbeaver.io/)(免费、跨平台)或 TablePlus / pgAdmin,新建连接填:
- Host `10.10.94.63`,Port `5432`,Database `content_publisher`,User `lxt_test`,Password `<你的密码>`。

图形工具能点着看表结构、双击改数据,和命令行是同一个库,随便用哪个。本文命令行的每条 SQL 在 GUI 的查询窗口里同样能跑。

---

## 2. 连接与断开

两种等价写法:

```bash
# 写法 A:一整串连接串(和 DATABASE_URL 一样的格式)
psql "postgresql://lxt_test:<你的密码>@10.10.94.63:5432/content_publisher"

# 写法 B:分开写参数,密码用环境变量传(避免出现在命令历史里)
PGPASSWORD='<你的密码>' psql -h 10.10.94.63 -p 5432 -U lxt_test -d content_publisher
```

- `-h` host、`-p` 端口、`-U` 用户、`-d` 数据库。
- 连上后:`\conninfo` 看当前连的是谁;`\q` 退出;输错一半想放弃,按 `Ctrl+C` 清空当前输入。

---

## 3. psql 元命令(那些反斜杠命令)

这些是 psql 自己的命令(不是 SQL),**不用分号**。你之前"看不懂"的多半就是这些:

| 命令 | 作用 |
|---|---|
| `\l` | 列出所有数据库 |
| `\dt` | 列出当前库所有表 |
| `\d 表名` | 看某张表的结构:列、类型、索引、外键。**最常用** |
| `\d+ 表名` | 更详细(含默认值、注释、存储信息) |
| `\di` / `\dv` | 列出索引 / 视图 |
| `\du` | 列出数据库角色(登录用户,注意**不是** `console_users` 表里的业务用户) |
| `\dn` | 列出 schema(本项目都在默认的 `public`) |
| `\x` | 切换"竖排显示"。宽表(列很多)横着看串行时,`\x` 打开后每行一条记录竖着列,清楚很多。再敲一次关闭 |
| `\timing` | 打开后每条查询显示耗时 |
| `\i 文件路径` | 执行一个 `.sql` 文件(等价于命令行的 `-f`) |
| `\e` | 打开编辑器写长 SQL,存盘退出后自动执行 |
| `\c 库名` | 切换到另一个数据库 |
| `\conninfo` | 当前连接信息 |
| `\h SQL命令` | 查某条 SQL 的语法,例:`\h UPDATE` |
| `\?` | 所有元命令的帮助 |
| `\q` | 退出 |

例:看 `console_users` 长什么样(列、约束、外键一目了然):

```
\d console_users
```

---

## 4. SQL 基础:查 / 增 / 改 / 删

用本项目真实的表。**每条都要分号结尾。字符串用单引号 `'...'`,注释用 `--`。**

### 查(SELECT)—— 最常用、最安全

```sql
-- 查所有用户的几列
SELECT name, phone, role, status FROM console_users;

-- 加条件(WHERE)、排序(ORDER BY)、只看前 10 条(LIMIT)
SELECT name, phone, role
FROM console_users
WHERE role = '管理员'
ORDER BY created_at DESC
LIMIT 10;

-- 计数
SELECT COUNT(*) FROM materials;

-- 分组统计:每个项目有多少素材
SELECT property_id, COUNT(*) AS 素材数
FROM materials
GROUP BY property_id
ORDER BY 素材数 DESC;

-- 模糊匹配:名字含"金茂"的项目(ILIKE 忽略大小写)
SELECT id, name, developer FROM properties WHERE name ILIKE '%金茂%';
```

### 增(INSERT)

```sql
INSERT INTO strategy_keywords (property_id, label, count, sort_order)
VALUES ('<项目id>', '学区房', 12, 1);
```

### 改(UPDATE)—— ⚠️ 一定要带 WHERE

```sql
-- 把某个用户设成管理员
UPDATE console_users SET role = '管理员' WHERE phone = '13800000000';
```

> **不带 `WHERE` 的 `UPDATE`/`DELETE` 会作用到整张表!** 改之前先用同样的 `WHERE` 跑一条 `SELECT`,确认命中的正是你想改的那几行:
> ```sql
> SELECT id, name, role FROM console_users WHERE phone = '13800000000';
> ```

### 删(DELETE)—— ⚠️ 同样要带 WHERE

```sql
DELETE FROM strategy_keywords WHERE id = 5;
```

执行后 psql 会回一句 `UPDATE 1` / `DELETE 1`,数字是**影响的行数**——如果不是你预期的数字,说明 WHERE 写错了(还好可以用事务兜底,见第 6 节)。

---

## 5. 本项目实战片段(直接抄）

```sql
-- 看所有用户 + 所属管理员 + 有几个项目授权
SELECT u.name, u.phone, u.role, m.name AS 所属管理员,
       COUNT(upa.property_id) AS 项目数
FROM console_users u
LEFT JOIN console_users m   ON m.id = u.manager_id
LEFT JOIN user_project_access upa ON upa.user_id = u.id
GROUP BY u.id, m.name
ORDER BY u.created_at DESC;

-- 看每个项目属于谁
SELECT p.name AS 项目, p.developer AS 开发商, o.name AS 归属人
FROM properties p JOIN console_users o ON o.id = p.owner_id;

-- 给某员工分配一个项目权限
INSERT INTO user_project_access (user_id, property_id)
VALUES ('<员工id>', '<项目id>') ON CONFLICT DO NOTHING;

-- 看某项目最近发布记录
SELECT title, publisher, channel, created_at
FROM publish_records WHERE property_id = '<项目id>'
ORDER BY created_at DESC LIMIT 20;
```

### 跑 `.sql` 文件(建表 / 种子 / 重置)

项目的 `database/` 目录里有三个脚本,用 `-f` 执行(在项目根目录):

```bash
# 建表 / 结构(全新库直接跑这个)
psql "postgresql://lxt_test:<你的密码>@10.10.94.63:5432/content_publisher" -f database/schema.sql

# 开发阶段整库重置:先删表,再重建,再种管理员(会清空全部数据!)
psql "<连接串>" -f database/reset-dev.sql
psql "<连接串>" -f database/schema.sql
psql "<连接串>" -f database/seed-admin.sql
```

`seed-admin.sql` 需要几个变量,用 `-v` 传(`ADMIN_PASSWORD_HASH` 先用项目脚本生成),完整命令见 `SERVER_SETUP.md`「初始化数据库表结构」一节。文案风格档案 `caption_profiles` 的写入 SQL 也在那份文档里。

---

## 6. 事务:改数据的"安全网"(新手必学)

手动改库最怕改错。把改动包在事务里,确认无误再 `COMMIT`,发现不对就 `ROLLBACK` 一键撤销:

```sql
BEGIN;                                              -- 开启事务
UPDATE console_users SET status = 'disabled' WHERE phone = '13800000000';
SELECT name, status FROM console_users WHERE phone = '13800000000';  -- 先看看对不对
-- 对了就:
COMMIT;
-- 不对就(撤销上面所有改动,像没发生过):
-- ROLLBACK;
```

> 养成习惯:**任何 UPDATE/DELETE 前先 `BEGIN`**,验证后再 `COMMIT`。手滑也不怕。

---

## 7. 本项目的几种"特殊字段"怎么查

这几种类型新手容易懵,但本项目用得到:

### 数组 `text[]` / `integer[]`(如 `materials.platforms`、`publish_records.material_ids`)

```sql
-- platforms 里包含"小红书"的素材(@> 是"包含")
SELECT id, title FROM materials WHERE platforms @> ARRAY['小红书'];

-- platforms 里含"小红书"或"微信"(= ANY)
SELECT id, title FROM materials WHERE '小红书' = ANY(platforms);

-- 数组长度
SELECT id, array_length(material_ids, 1) AS 图片数 FROM publish_records;
```

### JSON `jsonb`(如 `caption_profiles.examples`、`constraints`)

```sql
-- examples 是一个 JSON 数组,取第 1 条范例的 title
--   ->  取出还是 JSON(带引号)   ->>  取出为纯文本
SELECT property_id, examples -> 0 ->> 'title' AS 首条标题
FROM caption_profiles;

-- 看某项目的风格 spec 全文
SELECT style_spec FROM caption_profiles WHERE property_id = '<项目id>';
```

### 时间 `timestamptz`(如 `created_at`)

```sql
SELECT name, created_at FROM console_users
WHERE created_at > now() - interval '7 days';    -- 最近 7 天创建的
```

---

## 8. 新手最常踩的坑

- **忘了分号**:SQL 不加 `;` 回车,psql 会一直等(提示符变 `->`)。补个 `;` 回车即可,或按 `Ctrl+C` 放弃。
- **元命令别加分号**:`\dt;` 是错的,写 `\dt`。
- **单引号 vs 双引号**:值(字符串)用**单引号** `'超级管理员'`;双引号 `"..."` 是给"列名/表名"用的,平时用不到。写成双引号包字符串会报错。
- **中文照样用单引号**:`WHERE role = '员工'`。
- **UPDATE/DELETE 一定带 WHERE**,并且改前先 SELECT、或用事务(第 6 节)。
- **大小写**:表名/列名默认不区分大小写(其实都存成小写);但**字符串值区分大小写**,`'员工'` ≠ `'员 工'`。忽略大小写匹配用 `ILIKE`。
- **看不清宽表**:`\x` 打开竖排显示。
- **只想看、不想改**:多用 `SELECT`;`\dt`、`\d 表名` 是只读的,随便敲。

---

## 9. 一页速查小抄

```
连接      psql "postgresql://lxt_test:<密码>@10.10.94.63:5432/content_publisher"
退出      \q            取消当前输入  Ctrl+C

看结构    \dt           所有表
          \d 表名        某表的列/索引/外键
          \x            竖排显示开关

查        SELECT 列 FROM 表 WHERE 条件 ORDER BY 列 LIMIT 10;
计数      SELECT COUNT(*) FROM 表;
改        UPDATE 表 SET 列=值 WHERE 条件;      -- 必带 WHERE
删        DELETE FROM 表 WHERE 条件;           -- 必带 WHERE
增        INSERT INTO 表 (列...) VALUES (值...);

安全网    BEGIN; ...改动...; SELECT 确认; COMMIT;   -- 或 ROLLBACK 撤销

跑文件    psql "<连接串>" -f database/schema.sql

数组      WHERE platforms @> ARRAY['小红书']
JSON      examples -> 0 ->> 'title'
时间      WHERE created_at > now() - interval '7 days'

铁律      \命令 不加分号;SQL 必须分号 ; 结尾;字符串用单引号 '...'
```

---

需要更系统的官方文档:<https://www.postgresql.org/docs/current/>(psql 手册 `man psql`,或库里 `\?` / `\h`)。本项目的库表结构以 `database/schema.sql` 为权威定义,部署/迁移见 `SERVER_SETUP.md`。
