---
name: /openspec-show-app
id: openspec-show-app
category: OpenSpec (应用感知)
description: 显示子应用的 OpenSpec 变更详情（自动检测当前应用）
---
<!-- OPENSPEC:START -->
**应用感知命令**

此命令会自动检测当前正在编辑的文件属于哪个子应用，然后显示该应用的 OpenSpec 变更。

**Steps**
1. 检测当前文件路径，确定所属应用（如 `shiwen-baojian/`、`story-vocab/` 等）
2. 如果无法检测，提示用户指定应用名称
3. 切换到应用目录：`cd [应用目录]`
4. 运行 `openspec list` 列出所有变更
5. 运行 `openspec show [change-id]` 显示详情
6. 显示 proposal、tasks、spec deltas

**Reference**
- 使用 `openspec list --specs` 查看现有规格
- 使用 `openspec diff [change-id]` 查看差异
<!-- OPENSPEC:END -->

