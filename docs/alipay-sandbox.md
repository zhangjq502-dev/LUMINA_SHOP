# 支付宝官方沙箱：只使用测试账号和虚拟资金

项目将网关固定为 `https://openapi-sandbox.dl.alipaydev.com/gateway.do`，没有正式支付宝网关选项。未配置时保留 `PAYMENT_MODE=demo` 的本地模拟付款；它与官方沙箱不同。

## 第一步：登录沙箱后台

本人打开 https://open.alipay.com/develop/sandbox/app 并登录。扫码、账户密码及平台协议由本人操作。页面名称可能随平台调整，以当前控制台为准。

找到沙箱应用 APPID 和沙箱商家账号 UID，填入本地 `.env` 的 ALIPAY_APP_ID、ALIPAY_SELLER_ID。使用沙箱资料，不能使用正式商户资料。

## 第二步：设置应用公钥

在项目根目录执行 `npm run alipay:keys`。

- 应用私钥自动写入本地 .env，不显示在终端、不上传 Git。
- 将 `backend/.payment-keys/app-public-upload.txt` 内的应用公钥复制到支付宝沙箱应用的 RSA2 接口加签配置。
- 配置方式选择公钥模式；本项目生成的是 RSA 2048、PKCS8 应用私钥。
- 然后从支付宝控制台复制“支付宝公钥”，填到 ALIPAY_PUBLIC_KEY。

注意：应用公钥与支付宝公钥是两个不同的值；应用私钥只保存在后端。已有私钥时脚本不会覆盖。

## 第三步：准备通知地址

ALIPAY_NOTIFY_URL 必须是公网可访问的 HTTPS 地址，并以 `/api/payments/alipay/notify` 结尾，例如 `https://你的测试域名/api/payments/alipay/notify`。localhost 只在本机有效，支付宝服务器无法访问。

可使用已部署的测试后端；若使用开发隧道，需由本人选择服务并确认开放范围。不要把数据库端口或其他本地管理界面暴露出去。代码不会自动创建公网隧道。

返回地址由 FRONTEND_ORIGIN 自动生成，本地可以继续使用 http://localhost:5173。

## 第四步：检查并开启

运行 `npm run payment:check`。它只显示缺少哪些配置及格式是否正确，不打印密钥，也不向支付宝发请求。

检查完成后，将本地 .env 中 PAYMENT_MODE 改为 alipay，重启后端：`npm run dev:api`。打开订单会出现“前往支付宝沙箱付款”。使用沙箱后台提供的买家测试账号；不要使用真实账号密码。根据后台指引选择测试钱包或沙箱收银台提供的登录方式。

## 第五步：联调验收

- 从商品页加购并提交订单，确认金额、订单号。
- 跳转官方沙箱收银台，用测试账号付款。
- 回到商城后由后端主动查单；异步通知也会更新同一订单。
- 如果状态尚未更新，点击“刷新支付结果”；不要仅凭返回网址认定已付款。
- 重复通知不重复入账；金额、应用、商户或支付方式不匹配会被拒绝。
- 支付链接使用明确的支付截止时间，比库存预留截止提前一分钟。取消订单时会先确认远端付款或关闭状态。尚未创建交易且链接仍有效时，取消会提示等待；不会提前释放库存。远端不可用时保留库存并由定时任务重试。

配置缺失、凭据不匹配、外网回调不通都需要在真实沙箱联调中排查。自动化仅验证 SDK 请求、签名、金额和订单边界，不代表已完成外部平台支付验收。

接口：POST /api/payments/:id/alipay、POST /api/payments/:id/sync（都要求订单所属身份）；POST /api/payments/alipay/notify（不要求浏览器 Cookie，但必须验签和检查应用、商户、金额）。

官方参考：https://open.alipay.com/support/supportCenter.htm 、https://github.com/alipay/alipay-sdk-nodejs-all
