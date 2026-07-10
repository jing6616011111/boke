# 1Panel 反向代理教程

这份教程用于把本博客反向代理到域名访问。博客一键安装后默认通过 systemd 运行，监听：

```bash
http://127.0.0.1:3000
```

后台入口是：

```text
https://你的域名/login
```

## 1. 确认博客服务正常

在 VPS 上执行：

```bash
systemctl status personal-blog
curl http://127.0.0.1:3000
```

如果 `curl` 能返回 HTML，说明博客服务正常。

查看实时日志：

```bash
journalctl -u personal-blog -f
```

## 2. 域名解析

在你的域名服务商处添加 A 记录：

```text
blog.example.com -> 你的 VPS 公网 IP
```

等待解析生效后再继续配置 1Panel。

## 3. 1Panel 创建反向代理网站

推荐直接创建“反向代理”网站：

1. 打开 1Panel
2. 进入 `网站`
3. 点击 `创建网站`
4. 类型选择 `反向代理`
5. 填写域名，例如：

```text
主域名：blog.example.com
```

6. 反向代理配置填写：

```text
代理名称：blog
匹配路径：/
代理地址：http://127.0.0.1:3000
```

7. 保存后重载 OpenResty。

## 4. 已创建静态网站时的配置

如果你已经创建了“静态网站”，也可以在已有网站上添加反向代理：

1. 进入 `网站`
2. 找到你的静态网站
3. 进入 `设置`
4. 找到 `反向代理`
5. 添加一条反向代理：

```text
代理名称：blog
匹配路径：/
代理地址：http://127.0.0.1:3000
```

保存后重载 OpenResty。

如果匹配路径设置为 `/`，这个网站的所有请求都会转发到博客服务，静态目录本身基本不会再被访问。

## 5. 配置 HTTPS

在 1Panel 的网站设置中配置 SSL：

1. 进入网站设置
2. 打开 `HTTPS` 或 `SSL`
3. 选择已有证书，或申请 Let's Encrypt 证书
4. 开启强制 HTTPS

完成后访问：

```text
https://blog.example.com
```

## 6. 502 排查

如果页面出现 502，先在服务器上确认博客服务正常：

```bash
systemctl status personal-blog
curl http://127.0.0.1:3000
```

如果服务器本机能访问，但 1Panel 反代 502，通常是 OpenResty 跑在容器里，`127.0.0.1` 指向的是 OpenResty 容器自己，不是宿主机。

这时把代理地址改成宿主机网关或服务器内网 IP：

```text
http://172.17.0.1:3000
```

或者：

```text
http://你的服务器内网IP:3000
```

然后重载 OpenResty。

## 7. 防火墙建议

如果只通过 1Panel/OpenResty 对外提供访问，公网防火墙可以不开放 `3000` 端口，只开放：

```text
80
443
```

但要确保 OpenResty 容器或宿主机本地能访问 `3000`。

## 8. 常用命令

重启博客：

```bash
systemctl restart personal-blog
```

查看状态：

```bash
systemctl status personal-blog
```

查看日志：

```bash
journalctl -u personal-blog -f
```

修改端口：

```bash
systemctl edit personal-blog
```

写入：

```ini
[Service]
Environment=PORT=4000
```

然后执行：

```bash
systemctl daemon-reload
systemctl restart personal-blog
```

同时把 1Panel 里的代理地址改成：

```text
http://127.0.0.1:4000
```
