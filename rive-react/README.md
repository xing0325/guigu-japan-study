# 小龟 · Rive React 演示

Rive CLI 1.5.1 + React 19.3.0 + @rive-app/react-webgl2 4.36.0。实际运行 `public/guigu.riv`，角色动作由 Rive 内部时间轴和状态机驱动。

## 启动

```sh
pnpm install --frozen-lockfile
pnpm dev --port 5178
```

打开 http://127.0.0.1:5178。`pnpm build` 生成静态站点 `dist/`。WASM 已保存在 `public/rive.wasm`，不依赖 Rive CDN；字体不可用时回退系统字体。

## 三状态与接入

`src/Character.jsx` 是可复用组件：`<Character mode={0} />`。

| mode | 动画 | 行为 |
| --- | --- | --- |
| 0 | Idle | 呼吸、眨眼 |
| 1 | Thinking | 歪头、浮动思考气泡 |
| 2 | Speaking | 张嘴、摆动手臂 |

Artboard：`Guigu`；State machine：`Character`；View model：`CharacterModel`；number property：`mode`。六条有条件的双向切换，混合时间 180ms。Speaking 是循环口型演示，未接音频或语音同步。

界面下方状态读数来自 runtime 的状态变化事件，便于验证。该观察事件在当前运行时仍可用，但已标记 deprecated；角色控制本身使用推荐的 View Model data binding。

## 修改与重建

修改 `../rive-character/scene.rml` 后执行 `pnpm rive:build`，会 verify、inspect、编译并复制到 React public。`rive ../rive-character` 打开原生实时预览。

## 已有 .rev 的官方转换路径

官方文档明确支持以下操作，不是改扩展名：

```sh
rive create imported-character --from-rev=/absolute/path/character.rev
rive imported-character --verify
rive inspect imported-character --summary
rive imported-character --once
```

导入会生成 RML、脚本及素材。目的目录必须为空或不存在。生成文件在 `imported-character/build/`。导入和无脚本本地编译不要求登录。

本次没有收到源 `.rev`，工作区也没有找到，因此交付的是新建 RML 乌龟演示；尚未验证用户现有文件的转换或保真度。收到文件后应检查导入问题、素材、动画、状态机和运行时渲染，再接入其真实的状态接口。

若导入的文件包含脚本，网页运行需要 `rive login` 后 `rive imported-character --publish` 签名。导出可在 Editor 打开的 `.rev` 也需要登录。当前演示无脚本，无需签名；未登录、未上传到 Rive 账户、未部署网站。签名发布的水印/套餐条件请查看官方文档。

CLI 导入失败时，可用 Rive Editor 打开源 `.rev` 并导出 runtime `.riv`，或从已登录账户用 `--from-remote-file` 导入项目；具体兼容性需要用源文件实测，不保证所有文件无损往返。

## 验证

原生 verify 与 inspect 均无错误、无警告；CLI 已渲染三个状态并读取 mode 数据；React 生产构建通过。

`pnpm test` 需要上述 5178 服务运行，并使用本机 Google Chrome。测试遍历 Thinking → Speaking → Idle → Speaking → Thinking → Idle，等待运行时状态事件，检查浏览器异常和手机横向溢出。截图位于 `../rive-character/build/`。

## 官方参考

- https://rive.app/docs/cli/getting-started
- https://rive.app/docs/cli/reference/commands
- https://rive.app/docs/runtimes/react/data-binding
