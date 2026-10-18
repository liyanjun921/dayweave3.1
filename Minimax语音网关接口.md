# 语言口语｜Minimax 等语音服务接入接口

V3 已有的功能：浏览器支持时使用 Web Speech API **语音听写和朗读**；另有 MediaRecorder 录音，用户可以回听再点击提交到自己配置的语音转写网关。

**Minimax 的实际模型、语音识别产品与 API 路径会随服务商变化。本工程没有使用未经验证的 Minimax 接口地址冒充真实已接通服务。** 如选择 Minimax，需要由部署者按当前服务商文档编写一个 HTTPS 适配网关并实测。

## 适配网关的统一协议（网页已实现客户端）

在「云端与设置 → 口语服务接口」填写 `https://你的安全网关/api/speech/transcribe`。网页录音后按用户点击「转写刚才录音」发送：

```http
POST /api/speech/transcribe
Authorization: Bearer <可选、只存在当前会话的网关令牌>
Content-Type: multipart/form-data

file field name: audio   (practice.webm 或 practice.m4a)
string field: language   (例如 en-US / ja-JP / it-IT)
```

网关必须返回 JSON：

```json
{"text":"I would like a cappuccino, please."}
```

网关职责：验证用户身份和文件大小、将 webm/m4a 转成语音服务商当前支持的格式、在**服务器端**调用 MiniMax 或其他 STT 服务，提取识别文字，返回上述 JSON。**服务商 Secret Key 不得写入 public/、浏览器脚本或共享快捷指令。** 网关应设置严格用户权限、频率限制、费用限额、CORS 允许域和录音保留策略。

客户端转写结果会先填回语言陪练输入框，让用户核对识别错误，然后点击发送给 AI 进行逐句纠错。这不是已实现的端到端实时流式语音通话；如需低延迟双向对讲/自然语音回放，还需要接入实时 ASR、TTS 或语音对话服务，当前仅预留接口。

如果不接网关，文字陪练、普通浏览器听写、浏览器朗读和知识点复习仍然能使用（取决于浏览器具体支持情况）。
