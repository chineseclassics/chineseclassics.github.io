---
name: /openspec-apply-app
id: openspec-apply-app
category: OpenSpec (应用感知)
description: 在子应用目录实施 OpenSpec 变更（自动检测当前应用）
---
<!-- OPENSPEC:START -->
**应用感知命令**

此命令会自动检测当前正在编辑的文件属于哪个子应用，然后在对应的应用目录运行 OpenSpec。

**Steps**
1. 检测当前文件路径，确定所属应用（如 `shiwen-baojian/`、`story-vocab/` 等）
2. 如果无法检测，提示用户指定应用名称
3. 切换到应用目录：`cd [应用目录]`
4. 运行 `openspec list` 查看该应用的活跃变更
5. 读取该应用的 `changes/[change-id]/proposal.md`、`design.md`（如存在）、`tasks.md`
6. 按照 `openspec/AGENTS.md` 的规范实施变更
7. 依次完成 `tasks.md` 中的任务，每完成一项标记为 `- [x]`
8. 所有任务完成后，询问用户是否归档

**Reference**
- 应用目录结构遵循 `@.cursor/rules/file-organization.mdc`
- 使用 `openspec show [change-id]` 查看详情
- 使用 `openspec validate [change-id] --strict` 验证
<!-- OPENSPEC:END -->

