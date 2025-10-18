---
name: /openspec-archive-app
id: openspec-archive-app
category: OpenSpec (应用感知)
description: 归档子应用的已完成变更（自动检测当前应用）
---
<!-- OPENSPEC:START -->
**应用感知命令**

此命令会自动检测当前正在编辑的文件属于哪个子应用，然后归档该应用的已完成变更。

**Steps**
1. 检测当前文件路径，确定所属应用（如 `shiwen-baojian/`、`story-vocab/` 等）
2. 如果无法检测，提示用户指定应用名称
3. 切换到应用目录：`cd [应用目录]`
4. 确认所有任务已完成（所有 tasks 都是 `- [x]`）
5. 运行 `openspec archive [change-id] --yes`
6. 验证归档成功，specs 已更新
7. 运行 `openspec validate --strict` 确认没有问题

**Reference**
- 使用 `openspec show [change-id]` 确认变更状态
- 归档后变更移至 `changes/archive/YYYY-MM-DD-[change-id]/`
<!-- OPENSPEC:END -->

