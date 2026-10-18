# 🌸 序时 DAYWEAVE V3.2 · Netlify 无 Supabase 部署版

> **先打开 `00_从这里开始_部署指南.md`。** 这个仓库无需本地安装 Node.js，也不需要 Supabase 来管理邀请码。

## GitHub 上传成功后，这一页必须直接看到

- `public` 文件夹（打开后应该看到 `index.html`）
- `netlify` 文件夹（打开后应该看到 `functions` 和 `lib`）
- `netlify.toml` 文件
- `package.json` 文件
- `.nvmrc` 文件（GitHub 隐藏点文件也要上传）

**不能**是 `序时安装包/public`、`dayweave-v3/public` 等二级目录。

Netlify 设置：Base directory **留空**、Build command **留空**、Publish directory 填 `public`。

首次部署后打开 `https://你的站点.netlify.app/.netlify/functions/health` 查看是否输出 `"ok":true`。

密钥请通过 `docs/SETUP_SECRET_生成加密口令.html` 生成并配置在 Netlify 环境变量中；**不要提交任何真实密钥**。

记忆与聊天默认仅在每位用户的浏览器本地，换设备不自动同步。仅在用户选择个人云盘备份时才会上传。

本包的账号和邀请码采用 Netlify Functions + Blobs，适合亲友测试。Netlify Blobs 不保证邀请码并发事务；尚无邮箱验证、找回密码和限流风控，暂不适合面向陌生人开放注册。
