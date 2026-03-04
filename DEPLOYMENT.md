# 部署到 GitHub Pages

本项目可以部署到 GitHub Pages 上，使其成为一个可访问的在线打字练习网站。以下是详细的部署步骤：

## 前提条件

- 项目已上传到 GitHub 仓库：`https://github.com/warma13/typing`
- 您拥有该仓库的访问权限

## 部署步骤

### 步骤 1：登录 GitHub 账户

1. 打开浏览器，访问 [GitHub](https://github.com)
2. 登录您的 GitHub 账户

### 步骤 2：进入仓库设置

1. 访问项目仓库：`https://github.com/warma13/typing`
2. 点击仓库顶部的 **Settings** 选项卡

### 步骤 3：配置 GitHub Pages

1. 在左侧菜单中，找到并点击 **Pages** 选项
2. 在 **Build and deployment** 部分，找到 **Source** 选项
3. 从下拉菜单中选择 **Deploy from a branch**
4. 在 **Branch** 部分，选择您要部署的分支（通常是 `main` 或 `master`）
5. 在 **Folder** 部分，选择部署的文件夹路径：
   - 如果 `index.html` 文件在仓库根目录，选择 `/ (root)`
   - 如果 `index.html` 文件在 `docs` 文件夹中，选择 `/docs`
6. 点击 **Save** 按钮保存设置

### 步骤 4：等待部署完成

- GitHub Pages 会自动开始构建和部署您的网站
- 部署过程可能需要几分钟时间
- 部署完成后，您会在 GitHub Pages 设置页面看到部署状态变为 "Your site is published at https://username.github.io/repository-name"

### 步骤 5：访问部署后的网站

1. 复制并粘贴部署后的网站 URL 到浏览器中
2. 您的打字练习网站应该已经可以正常访问了

## 注意事项

1. **静态网站限制**：GitHub Pages 只支持静态网站，不支持服务器端脚本。本项目是纯前端项目，完全符合这一要求。

2. **文件路径**：确保所有资源文件（CSS、JavaScript、图片等）的路径都是相对路径，这样在部署后才能正确加载。

3. **数据文件**：本项目使用了本地 JSON 文件作为数据源，这些文件会随着部署一起上传到 GitHub Pages，因此网站可以正常访问这些数据。

4. **更新部署**：当您对项目进行更改并推送到 GitHub 仓库后，GitHub Pages 会自动重新构建和部署您的网站，无需手动触发部署过程。

5. **自定义域名**：如果您有自定义域名，可以在 GitHub Pages 设置页面中添加自定义域名，使您的网站通过自定义域名访问。

## 故障排除

### 网站无法访问
- 检查部署状态是否显示 "Your site is published"
- 确认输入的 URL 正确无误
- 等待几分钟后再次尝试访问，部署可能需要一些时间

### 资源文件未加载
- 检查浏览器开发者工具中的控制台错误
- 确保资源文件的路径是相对路径
- 确认资源文件已正确上传到 GitHub 仓库

### 数据文件未加载
- 检查数据文件（如 JSON 文件）的路径是否正确
- 确认数据文件已正确上传到 GitHub 仓库
- 检查浏览器的跨域请求限制（GitHub Pages 应该允许访问同域下的静态文件）

## 部署成功后

部署成功后，您的打字练习网站将可以通过 GitHub Pages 提供的 URL 访问，例如：`https://warma13.github.io/typing`

用户可以在任何设备上通过浏览器访问该网站，进行中文打字练习，无需安装任何软件。