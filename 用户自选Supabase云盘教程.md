# 序时 V3｜让每个人使用自己的 Supabase 存储额度

## 先分清两种 Supabase

- **站长邀请制账号服务（旧 V2 选项）**：站长自己的 Supabase 统一管理注册、邀请码、服务端 API Key 和账号。即使每人独立账号，**存储配额仍算在站长的 Supabase 项目里**。V3 已改为**本地优先、登录不自动上传工作台**，可手动选择共享项目同步。
- **每个人自己的 Supabase Storage（V3 新选项）**：每位用户可以创建一个属于自己的 Supabase 项目，使用该项目的私有 Storage Bucket 备份工作台。这样容量、账单、政策限额归个人项目所有。**完全不需要把用户的 `service_role` key 告诉站长**。这是一种“手动备份与恢复”，不是实时多端合并。

实际免费额度以 Supabase 官方控制台显示为准；我无法在本安装包中保证未来政策或价格。

## 创建个人云盘（一次性）

1. 用户用自己的邮箱登录 https://supabase.com/dashboard ，创建新项目。记下 **Project URL** 与 **anon/public/publishable key**。绝不可把 `service_role`、`secret` key 填进序时网页。
2. 在 Supabase → **Storage** 新建 Bucket，**名称必须是 `dayweave-backups`**，关闭 Public（使用私有桶）。文件大小可以保持默认；本项目上传 `workspace.json`，过大的教材可能需要拆分。
3. 在 **Authentication → Users** 中创建一个自己的登录用户（或开启邮件注册流程并完成邮箱验证）。这个邮箱和密码只用于本人自己的 Supabase Auth，网页不会将密码写入状态备份。
4. 在该项目的 **SQL Editor** 运行下面的策略。执行前确认 Bucket 已创建：

```sql
-- Supabase Storage 建议使用私有 bucket。folder 的第一段必须是当前用户的 uid。
create policy "dayweave_read_own"
on storage.objects for select to authenticated
using (bucket_id = 'dayweave-backups'
  and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dayweave_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id = 'dayweave-backups'
  and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dayweave_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'dayweave-backups'
  and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'dayweave-backups'
  and (storage.foldername(name))[1] = auth.uid()::text);
```

这些是给新个人项目运行的示例策略；如果重复执行 SQL 报 “policy already exists”，不要反复添加同名策略，先检查权限配置。不要把私有 Bucket 改公开来绕过 403。

5. 打开序时 → **云端与设置** → **使用我自己的 Supabase 免费额度**，填入 Project URL、anon/public key、个人 Auth 邮箱与密码，点「连接我的云盘」。
6. 首次成功后点 **手动上传备份**。看到成功提示后，可以在 Supabase Storage 里检查路径 `dayweave-backups/<你登录用户的 UID>/workspace.json`。
7. 在另一台设备用同样的项目配置和 Auth 用户登录，点 **从个人云盘恢复**。**这会覆盖当前设备工作台**；先导出本机 JSON 备份。

## 安全与常见问题

- 默认不上云：只连接账号、仅填配置都不会上传记忆。上传需要用户点击、确认；恢复也需确认。
- Bucket 保持私有，RLS 限定 UID。请在上线时实际用两个测试用户验证彼此无法读写对方路径。
- Supabase Auth access/refresh token 暂存浏览器当前会话（`sessionStorage`），账号密码没有写进备份。公开 anon key 保存在个人的本地设置中；它不是高权限密钥。
- 个人项目管理员仍能访问自己项目中的备份，因此这里是**私有云备份，而非端到端加密**。需要更强隐私时，可以先导出 JSON，在本机加密后自行保存到云盘。
- 自己的 Supabase 项目可能休眠、停止服务或超额，定期保留至少一份本地离线备份。
- 如果出现 `401`，通常是个人 Auth 密码/会话问题；`403` 检查 Bucket 隐私、RLS、登录 UID；`404` 检查 Bucket 名或是否曾上传过备份。
- `CORS` 错误与 API 网络不可达有关，不要为了解决 CORS 把 secret key 暴露在前端。
- 当前是整份 JSON 手动覆盖备份，不具备冲突自动合并、文件级增量同步、多人同写功能。

## 邀请码还要部署吗？

- **独自使用 + 自己 Supabase 备份**：不需要邀请码后端，也不需要站长共享 Supabase。
- **几十个朋友通过邀请码注册账号**：仍需一个轻量集中式邀请验证服务（当前工程沿用 V2 Netlify + Supabase Auth）。**用户账号、个人存储项目是两套独立功能**，邀请码并不会自动给用户开一个免费的 Supabase 项目。
- 站长可先仅共享静态 PWA，用户匿名本地使用；但这种模式没有真正的邀请访问控制，不能宣传为受保护的注册制。
