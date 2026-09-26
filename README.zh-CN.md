# X Bookmark Shelf

[日本語](README.md) | [English](README.en.md)

这是一款 Safari Web Extension，可读取 X 书签和点赞，并分别保存在 Mac 本地。支持浏览、搜索、按发帖日期筛选以及导出 JSON。不使用 X 官方 API 或 X 的私有 Web API。

## 下载和安装

1. 下载并解压[最新版本](https://github.com/yoshimana/Saved-Shelf-X/releases/latest/download/X-Bookmark-Shelf-macos.zip)，然后将 `X Bookmark Shelf.app` 移到“应用程序”文件夹。
2. 打开应用。如果 macOS 阻止运行，请前往“系统设置”→“隐私与安全性”，对该应用点按“仍要打开”，然后再次打开应用。
3. 在 Safari 中打开“设置”→“开发”，启用“允许未签名的扩展”。如果没有“开发”标签页，请先在“设置”→“高级”中启用 Web 开发者功能。
4. 在“Safari → 设置 → 扩展”中启用 **X Bookmark Shelf**，并允许其访问 `x.com`。

此版本未经 Developer ID 签名和公证。退出 Safari 后，“允许未签名的扩展”设置会重置，因此每次重新启动 Safari 后都需要再次启用。若希望使用开发签名的扩展，请在 Xcode 中从源码构建，并为应用和扩展目标选择自己的签名 Team。若没有签名身份进行构建，仍需启用 Safari 的未签名扩展设置。

## 从源码构建

所需环境：macOS 12 或更高版本、Safari 15.4 或更高版本、Xcode、Node.js 22.18 或更高版本以及 npm。

1. 在仓库目录中运行 `npm ci --cache ./work/npm-cache`、`npm run check` 和 `npm run xcode:sync`。
2. 使用 Xcode 打开 `Xcode/X Bookmark Shelf/X Bookmark Shelf.xcodeproj`。
3. 在 **Signing & Capabilities** 中为应用和扩展两个目标选择自己的 Team。如果没有签名证书，请将两个目标的 **Signing Certificate** 设为 **Sign to Run Locally**，并使用上面的 Safari 未签名扩展设置。
4. 选择 **X Bookmark Shelf** Scheme 和 **My Mac**，然后点按 **Run**。

如果 Bundle Identifier 无法用于你的 Team，请更改应用和扩展的标识符，并同步修改 `X Bookmark Shelf/ViewController.swift` 中的 `extensionBundleIdentifier`，使其与扩展标识符一致。

## 使用方法

1. 在 Safari 中打开 `https://x.com/i/history`（书签）或 `https://x.com/i/history/likes`（点赞）。旧地址 `/i/bookmarks` 会跳转到历史页面。
2. 在扩展中选择“书签”或“点赞”。可以设置导入数量上限和按月计算的时间范围；留空表示不限制数量和时间。
3. 首次导入会扫描列表。之后遇到已保存的帖子时会停止，只添加新帖子。
4. 可搜索已保存的帖子、按发帖日期筛选，并切换最新优先或最早优先。JSON 只导出当前选中的类别。
5. 选择“在新标签页打开列表”，即可在普通 Safari 标签页中浏览。删除操作只影响当前选中的类别。

可在右上角选择日语、英语或简体中文。首次启动时会使用 Safari 的首选语言，并记住之后的语言选择。

## 数据与限制

- 帖子保存在 Safari 扩展的 IndexedDB 中，不会发送到外部服务器。清除 Safari 扩展数据也会删除已保存的帖子；请先导出 JSON 备份。
- 扩展读取 X 页面上已显示的帖子。X 可能会更改页面结构并导致导入失效。本扩展不依赖私有 Web API。
- 页面尚未加载的帖子、已删除的帖子、引用帖正文和媒体文件不会被保存。时间范围依据发帖时间，而非收藏或点赞时间。
- 增量导入假定 X 按最新优先排列。如果 X 更改排序，可能会漏掉较新的帖子。
- X Bookmark Shelf 与 X Corp. 无关联，也未获得其认可。

## 许可证

MIT License。详情请参见 [LICENSE](LICENSE)。
