# 序时 DAYWEAVE · Netlify 无 Supabase 版（更新安装包）

**建议不要按照旧的 V3 教程操作。** 请直接打开：

**`00_从这里开始_部署指南.md`**

这份部署指南专门修复 Netlify 的 `public does not exist` 提示，并包含 GitHub 目录层级、Netlify 配置、双密钥生成、健康检查、站长初始化、邀请码注册、iOS 安装和故障排查。

本包已经新增 `/.netlify/functions/health` 诊断入口（实际网址为 `/.netlify/functions/health`）。

安全界限：记忆本地优先；Netlify Blobs 适合少量亲友测试，非严格原子的邀请码数据库，无邮件验证/找回密码/正式风控。
