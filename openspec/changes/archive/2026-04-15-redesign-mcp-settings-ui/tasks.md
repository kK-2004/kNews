## 1. 页面布局重构

- [x] 1.1 重构 mcp-settings.vue 模板：移除内联创建 Key 表单区域，改为「账号卡片 + Key 列表 + 创建按钮」三区域布局
- [x] 1.2 添加「+ 创建 Key」按钮到页面标题区右侧，点击时打开创建 Key Modal

## 2. 创建 Key Modal

- [x] 2.1 新建 create-key-modal 内容区域：名称输入、条数设置、模块选择 chip grid（默认全选）、全选/清空快捷按钮、生成 API Key 按钮
- [x] 2.2 通过 CSS 覆盖 base-modal 宽度为 40rem，模块 chip grid 区域设置 max-height + 滚动条

## 3. Key 列表优化

- [x] 3.1 重写 Key 列表为行卡片布局：名称、API Key（可复制）、模块标签小 chip、返回条数上限、调用次数、最后调用时间、删除按钮
- [x] 3.2 当 source_ids 为空时显示「全部板块」标签，有值时以小 chip 形式展示模块名称

## 4. 交互与状态管理

- [x] 4.1 将创建 Key 的表单状态（newKeyName、maxCount、selectedSourceIds）从主页面移入 Modal 作用域
- [x] 4.2 创建成功后关闭创建 Modal，弹出结果 Modal 展示 API Key 值和复制按钮，刷新 Key 列表
- [x] 4.3 未填写名称时显示错误提示，不关闭 Modal
