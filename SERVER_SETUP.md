# 腾讯云服务器环境搭建手册

这份文档用于在新买的腾讯云服务器上手动搭建项目运行环境。

目标架构：

```text
浏览器 / 小程序
    ↓ HTTPS
Nginx
    ↓ 反向代理到本机 3000
Next.js 项目，由 PM2 守护
    ↓ localhost
PostgreSQL 本机数据库
    ↓
腾讯云 COS 存图片文件
```

适用服务器：

```text
系统镜像：Ubuntu Server 22.04 LTS
推荐规格：2核 4GB / 6M / 70GB SSD
数据库：先自建 PostgreSQL，后续可迁移到托管数据库
```

## 0. 需要先替换的内容

执行命令前，先把下面这些值准备好。文档里出现这些占位符时，都要替换成你自己的真实值。

| 占位符 | 含义 | 示例 |
|---|---|---|
| `<你的Git仓库地址>` | 项目 Git 仓库地址 | `git@github.com:yourname/content-publisher-console.git` |
| `<你的域名>` | 绑定服务器的主域名 | `example.com` |
| `<你的www域名>` | 带 www 的域名，不需要可删掉 | `www.example.com` |
| `<数据库密码>` | PostgreSQL 用户密码 | 使用强密码，不要用示例 |
| `<服务器用户名>` | 当前登录服务器的 Linux 用户名 | 本项目计划使用 `zyh` |
| `<管理员手机号>` | 后台第一个管理员登录手机号 | 11 位手机号 |
| `<管理员登录密码>` | 后台第一个管理员登录密码 | 至少 8 位，使用强密码 |
| `<管理员姓名>` | 后台第一个管理员显示名 | `管理员` |
| `<管理员默认项目>` | 管理员默认有权限的项目名 | 没有项目时可先填 `-` |

如果你的域名暂时没有备案或没有解析到服务器，可以先跳过 HTTPS 部分，先用服务器公网 IP 测试项目。

查看当前服务器用户名：

```bash
whoami
```

查看服务器公网 IP：

```bash
curl ifconfig.me
```

## 1. 登录服务器

在你自己的电脑上执行，替换 `<服务器公网IP>`：

```bash
ssh root@<服务器公网IP>
```

如果你已经创建并启用了 `zyh` 用户，则使用：

```bash
ssh zyh@<服务器公网IP>
```

登录后先确认系统版本：

```bash
lsb_release -a
uname -a
```

## 2. 基础系统更新

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git unzip vim ca-certificates gnupg lsb-release software-properties-common build-essential
```

设置时区为中国时间：

```bash
sudo timedatectl set-timezone Asia/Shanghai
timedatectl
```

验证点：

```text
timedatectl 输出里 Time zone 应该是 Asia/Shanghai
```

## 3. 创建项目目录

项目统一放在 `/var/zyh/content-publisher-console`。

```bash
sudo mkdir -p /var/zyh
sudo chown -R zyh:zyh /var/zyh
cd /var/zyh
```

验证权限：

```bash
ls -ld /var/zyh
```

注意：后续 `pnpm install`、`pnpm build`、`pm2` 等项目命令尽量都使用 `zyh` 用户执行，不要用 `root` 执行，避免 `node_modules`、`.next` 目录权限混乱。

## 4. 安装 Node.js 22

项目当前使用 Next.js 16 / React 19，建议服务器使用 Node.js 22。

安装 nvm：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

让 nvm 立即生效：

```bash
source ~/.bashrc
```

如果上面命令后 `nvm` 仍不可用，重新登录 SSH 后再继续。

安装 Node.js 22：

```bash
nvm install 22
nvm use 22
nvm alias default 22
```

验证：

```bash
node -v
npm -v
```

期望：

```text
node -v 输出 v22.x.x
```

## 5. 安装 pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

如果访问 npm 官方源很慢，可以切到国内源：

```bash
pnpm config set registry https://registry.npmmirror.com
```

后续如果要切回官方源：

```bash
pnpm config set registry https://registry.npmjs.org
```

## 6. 安装 PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

进入 PostgreSQL 管理终端：

```bash
sudo -u postgres psql
```

进入后执行下面 SQL。必须替换 `<数据库密码>`：

```sql
CREATE USER content_app WITH PASSWORD '<数据库密码>';
CREATE DATABASE content_publisher OWNER content_app;
GRANT ALL PRIVILEGES ON DATABASE content_publisher TO content_app;
\q
```

测试连接。必须替换 `<数据库密码>`：

```bash
psql "postgresql://content_app:<数据库密码>@localhost:5432/content_publisher"
```

进入数据库后执行：

```sql
SELECT now();
\q
```

说明：

```text
数据库名：content_publisher
数据库用户：content_app
数据库地址：localhost
数据库端口：5432
```

这里只是创建数据库和账号。具体业务表结构在项目里的 `database/schema.sql`，等第 9 步拉取项目代码后再执行。

安全要求：

```text
不要在腾讯云安全组里开放 5432。
不要让 PostgreSQL 监听公网。
项目和数据库在同一台服务器时，只用 localhost 连接。
```

## 7. 安装 PM2

PM2 用来守护 Next.js 进程，避免 SSH 断开后项目停止。

```bash
npm install -g pm2
pm2 -v
```

设置 PM2 开机自启：

```bash
pm2 startup systemd
```

执行后，PM2 会输出一条类似下面的命令：

```bash
sudo env PATH=... pm2 startup systemd -u zyh --hp /home/zyh
```

复制 PM2 实际输出的那一整行，再执行一次。

## 8. 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

配置服务器防火墙：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

腾讯云控制台的防火墙/安全组也要放行：

```text
22    SSH
80    HTTP
443   HTTPS
```

不要放行：

```text
5432  PostgreSQL
3000  Next.js
```

原因：外部只应该访问 Nginx 的 80/443，Next.js 3000 和 PostgreSQL 5432 都只在服务器内部访问。

## 9. 拉取项目代码

进入项目目录：

```bash
cd /var/zyh
```

拉取代码。必须替换 `<你的Git仓库地址>`：

```bash
git clone <你的Git仓库地址> content-publisher-console
cd /var/zyh/content-publisher-console
```

如果你还没有 Git 仓库，也可以先用 `scp` 上传项目压缩包，但长期建议用 Git 部署。

安装依赖：

```bash
pnpm install --frozen-lockfile
```

如果提示 lockfile 不匹配，可以临时使用：

```bash
pnpm install
```

但正式部署最好保证本地和服务器使用同一份 `pnpm-lock.yaml`。

## 10. 初始化数据库表结构

项目内已经准备了 PostgreSQL 建表脚本：

```text
database/schema.sql
```

在项目根目录执行。必须替换 `<数据库密码>`：

```bash
cd /var/zyh/content-publisher-console
PGPASSWORD="<数据库密码>" psql -h localhost -U content_app -d content_publisher -f database/schema.sql
```

验证表是否创建成功：

```bash
PGPASSWORD="<数据库密码>" psql -h localhost -U content_app -d content_publisher -c "\dt"
```

正常应该能看到这些表：

```text
materials
material_tags
config_nodes
config_node_modes
notes
strategy_heat_rows
strategy_keywords
properties
property_channels
console_users
auth_sessions
drafts
draft_images
```

说明：

```text
这个脚本只建表和补充缺失字段，不会清空已有数据。
如果你需要把现有假数据导入数据库，可以后续单独写 seed 脚本。
```

创建第一个后台管理员账号。必须替换 `<数据库密码>`、`<管理员手机号>`、`<管理员登录密码>`、`<管理员姓名>`、`<管理员默认项目>`：

```bash
cd /var/zyh/content-publisher-console
ADMIN_PASSWORD_HASH="$(node scripts/hash-password.mjs '<管理员登录密码>')"
PGPASSWORD="<数据库密码>" psql -h localhost -U content_app -d content_publisher \
  -v admin_phone="<管理员手机号>" \
  -v admin_name="<管理员姓名>" \
  -v admin_property="<管理员默认项目>" \
  -v admin_password_hash="${ADMIN_PASSWORD_HASH}" \
  -f database/seed-admin.sql
```

`database/seed-admin.sql` 使用 `ON CONFLICT (phone) DO UPDATE`，可以重复执行；已存在同手机号管理员时会更新姓名、项目、密码 hash 和状态，不会插入重复账号。

验证管理员账号已写入：

```bash
PGPASSWORD="<数据库密码>" psql -h localhost -U content_app -d content_publisher \
  -c "SELECT name, phone, role, property, status FROM console_users;"
```

## 11. 创建生产环境变量

在项目根目录执行：

```bash
cd /var/zyh/content-publisher-console
vim .env.production
```

写入下面内容。必须替换 `<数据库密码>`，域名相关值按实际情况填写：

```env
NODE_ENV=production
DATABASE_URL="postgresql://content_app:<数据库密码>@localhost:5432/content_publisher"

NEXT_PUBLIC_XHS_MINI_PROGRAM_URL=""
NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL=""
```

说明：

```text
DATABASE_URL 是后端服务连接 PostgreSQL 的地址。
NEXT_PUBLIC_XHS_MINI_PROGRAM_URL 后续填小红书小程序跳转链接模板。
NEXT_PUBLIC_WECHAT_MINI_PROGRAM_URL 后续填微信小程序跳转链接模板。
```

后续接入腾讯云 COS 时，再补充类似下面的变量，具体名称以后按代码实现来定：

```env
TENCENT_COS_SECRET_ID=""
TENCENT_COS_SECRET_KEY=""
TENCENT_COS_BUCKET=""
TENCENT_COS_REGION=""
```

## 12. 构建项目

```bash
cd /var/zyh/content-publisher-console
pnpm build
```

如果构建成功，会生成 `.next` 目录。

验证：

```bash
ls -ld .next
```

如果服务器内存不够，构建时可能会失败。你买的是 2核4G，正常情况下够用。

## 13. 使用 PM2 启动项目

```bash
cd /var/zyh/content-publisher-console
pm2 start pnpm --name content-publisher-console -- start
pm2 save
pm2 status
```

本机测试：

```bash
curl http://127.0.0.1:3000
```

如果返回 HTML 内容，说明 Next.js 服务已启动。

查看日志：

```bash
pm2 logs content-publisher-console
```

常用命令：

```bash
pm2 restart content-publisher-console
pm2 stop content-publisher-console
pm2 delete content-publisher-console
```

## 14. 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo vim /etc/nginx/sites-available/content-publisher-console
```

写入下面内容。必须替换：

```text
<你的域名>
<你的www域名>
```

如果你没有 www 域名，就删掉 `www` 那一段，只保留主域名。

```nginx
server {
    listen 80;
    server_name <你的域名> <你的www域名>;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/content-publisher-console /etc/nginx/sites-enabled/content-publisher-console
sudo nginx -t
sudo systemctl reload nginx
```

如果 `sudo nginx -t` 报错，先不要 reload，按报错行修正配置。

访问测试：

```bash
curl http://<你的域名>
```

没有域名时，可以临时把 Nginx 配置中的 `server_name` 改成：

```nginx
server_name _;
```

然后用服务器公网 IP 访问。

## 15. 配置域名解析

到域名服务商控制台添加解析：

```text
记录类型：A
主机记录：@
记录值：服务器公网 IP
```

如果要使用 `www`：

```text
记录类型：A
主机记录：www
记录值：服务器公网 IP
```

等待解析生效后测试：

```bash
ping <你的域名>
```

## 16. 配置 HTTPS

小程序接口必须使用 HTTPS，所以正式接入小程序前必须完成这一步。

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

签发证书。必须替换 `<你的域名>` 和 `<你的www域名>`：

```bash
sudo certbot --nginx -d <你的域名> -d <你的www域名>
```

如果你没有 www 域名，就只执行：

```bash
sudo certbot --nginx -d <你的域名>
```

测试自动续期：

```bash
sudo certbot renew --dry-run
```

验证 HTTPS：

```bash
curl https://<你的域名>
```

小程序里最终配置的接口域名应该是：

```text
https://<你的域名>
```

## 17. PostgreSQL 自动备份

创建备份目录：

```bash
sudo mkdir -p /var/zyh/backups/postgresql
sudo chown -R zyh:zyh /var/zyh/backups
chmod 700 /var/zyh/backups/postgresql
```

创建备份脚本：

```bash
vim ~/backup-postgres.sh
```

写入下面内容。必须替换 `<数据库密码>`：

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/zyh/backups/postgresql"
DB_NAME="content_publisher"
DB_USER="content_app"
DB_PASSWORD="<数据库密码>"
DATE="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILE}"

find "${BACKUP_DIR}" -type f -name "${DB_NAME}_*.sql.gz" -mtime +14 -delete
```

赋予执行权限：

```bash
chmod +x ~/backup-postgres.sh
```

手动备份一次：

```bash
~/backup-postgres.sh
ls -lh /var/zyh/backups/postgresql
```

恢复备份的基本命令如下。必须替换 `<备份文件>` 和 `<数据库密码>`：

```bash
gunzip -c <备份文件> | PGPASSWORD="<数据库密码>" psql -h localhost -U content_app content_publisher
```

设置每天凌晨 3 点自动备份：

```bash
crontab -e
```

加入下面一行：

```cron
0 3 * * * /home/zyh/backup-postgres.sh >> /home/zyh/backup-postgres.log 2>&1
```

查看定时任务：

```bash
crontab -l
```

建议后续把 `/var/zyh/backups/postgresql` 同步到 COS，避免服务器磁盘损坏时备份一起丢失。

## 18. 项目更新流程

以后每次更新代码：

```bash
cd /var/zyh/content-publisher-console
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 restart content-publisher-console
pm2 save
```

如果只是改了环境变量：

```bash
cd /var/zyh/content-publisher-console
pm2 restart content-publisher-console --update-env
pm2 save
```

## 19. 可选：后续安装 Docker

现在不是必须安装 Docker。等你决定用 Docker 部署时再执行。

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

执行完后退出 SSH，再重新登录：

```bash
docker version
docker compose version
```

## 20. 常用排查命令

查看项目进程：

```bash
pm2 status
pm2 logs content-publisher-console
```

查看 Nginx：

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

查看端口：

```bash
sudo ss -tulpn
```

正常情况下应该看到：

```text
80/443 由 nginx 监听
3000   由 node/next 监听在本机
5432   由 postgresql 监听在本机
```

查看磁盘：

```bash
df -h
du -sh /var/zyh/content-publisher-console
du -sh /var/zyh/backups/postgresql
```

查看内存：

```bash
free -h
```

查看 PostgreSQL：

```bash
sudo systemctl status postgresql
psql "postgresql://content_app:<数据库密码>@localhost:5432/content_publisher"
```

查看系统日志：

```bash
journalctl -xe
```

## 21. 最终检查清单

完成部署后逐项确认：

```text
[ ] node -v 是 v22.x.x
[ ] pnpm -v 正常输出
[ ] PostgreSQL 可以用 content_app 用户连接
[ ] pnpm build 成功
[ ] pm2 status 显示 content-publisher-console online
[ ] curl http://127.0.0.1:3000 有返回
[ ] sudo nginx -t 通过
[ ] http://<你的域名> 可以访问
[ ] https://<你的域名> 可以访问
[ ] crontab -l 能看到 PostgreSQL 备份任务
[ ] 腾讯云安全组只开放 22、80、443
```
