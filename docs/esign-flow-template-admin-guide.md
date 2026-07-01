# e签宝流程模板 Admin 操作手册

> 面向对象：后台工作人员，以及辅助工作人员操作的 AI agent。  
> 目标：让工作人员可以在 Django admin 中创建、切换、同步和排查业务员/商户电子签署流程模板，而不需要手写复杂 JSON。  
> 更新时间：2026-07-01

---

## 1. 重要结论

本系统已经支持两类独立签署场景：

| 场景 | 用户类型 | Django admin 模板场景 | API 入口 | 状态写入 |
|------|----------|------------------------|----------|----------|
| 业务员合作协议 | `agent` | `agent_cooperation` | `/api/v1/esign/agent-cooperation/*` | `AgentProfile.esign_*` |
| 商户合作协议 | `customer` | `merchant_cooperation` | `/api/v1/esign/merchant-cooperation/*` | `CustomerProfile.esign_*` |

两类签署互相隔离：

- 业务员模板不会被商户 API 使用。
- 商户模板不会被业务员 API 使用。
- 业务员签署完成只更新 `AgentProfile`。
- 商户签署完成只更新 `CustomerProfile`。
- e签宝 webhook 共用同一个入口，但后端会按本地签署任务的 `business_scene` 分流。

工作人员日常只需要维护 `e签宝流程模板` 这张 admin 表，并在更换模板后执行同步 action。

---

## 2. 后台入口

常用 admin 模块：

| Admin 模块 | 用途 |
|-----------|------|
| `e签宝流程模板` / `EsignFlowTemplate` | 维护流程模板 ID、业务场景、参与方/控件映射 |
| `e签宝签署任务` / `EsignSignFlow` | 查看签署任务状态、已签文件、撤销/本地终止异常任务 |
| `客户Profile` / `CustomerProfile` | 查看/重置商户 e签宝签署状态 |
| `业务员Profile` / `AgentProfile` | 查看/重置业务员 e签宝签署状态 |
| `e签宝回调审计` / `EsignNotifyAudit` | 查看 e签宝 webhook 原始回调和处理状态 |

---

## 3. 核心概念

### 3.1 流程模板 ID

`sign_template_id` 是 e签宝后台创建的流程模板 ID。

每个业务场景都可以有自己的流程模板。例如：

- 业务员合作协议模板 A
- 商户合作协议模板 B
- 未来其它合同模板 C

这些模板不能只靠名称区分，必须在 admin 中选择正确的 `business_scene`。

### 3.2 参与方 ID

`participantId` 是 e签宝流程模板内部的参与方槽位 ID，不是某个人或某个公司的全局账号 ID。

因此：

- 换流程模板后，`participantId` 可能变化。
- 在 e签宝后台重建参与方后，`participantId` 也可能变化。
- 不能把旧模板的 `participantId` 复制到新模板使用。
- 正确做法是使用 admin action 自动读取模板详情并同步。

### 3.3 控件 ID

`componentId` 是 e签宝流程模板内部的控件 ID。

同样：

- 换模板后，控件 ID 可能变化。
- 修改模板控件后，控件 ID 可能变化。
- 不建议工作人员手写控件 JSON。
- 正确做法是使用 admin action 自动同步。

### 3.4 签署日期和签名控件

签署日期控件、签名控件不是普通文本填充控件。

后端不会把签署日期作为 `components[].componentValue` 传给 e签宝。  
签署日期应由 e签宝模板/签署行为自动处理。

如果把签署日期当作填充控件提交，e签宝可能返回：

```text
is not a fillField
```

现在 admin action 会自动排除签署日期和签名控件。

---

## 4. 新建或切换业务员流程模板

适用场景：业务员合作协议。

### 4.1 在 e签宝后台准备模板

由模板维护人员在 e签宝后台创建或修改流程模板。

建议模板结构：

- 可以是单参与方：只让业务员/乙方签署。
- 也可以是双参与方：甲方 + 业务员/乙方。
- 合同正文中的甲方固定内容建议由模板维护。
- 签署区和签署日期由模板维护。
- 业务员未知字段，例如身份证号、省市区，可以让签署人在 e签宝拟定页面填写。

### 4.2 在 Django admin 创建流程模板记录

进入 `e签宝流程模板`，新建一条记录。

字段填写：

| 字段 | 填写方式 |
------|----------|
| `account` | 选择当前 e签宝账号，沙箱通常是 `esign-sandbox-main` |
| `name` | 便于识别的名称，例如 `业务员合作协议 v3` |
| `slug` | 便于识别的唯一标识，例如 `agent-cooperation-flow-v3` |
| `business_scene` | 必须选择 `agent_cooperation` |
| `version` | 内部版本号，例如 `v3.0` |
| `sign_template_id` | e签宝流程模板 ID |
| `org_id` | e签宝企业 orgId |
| `is_active` | 是否启用 |
| `participant_schema` | 先留空，后续用 action 自动同步 |
| `component_schema` | 先留空，后续用 action 自动同步 |
| `operator_schema` | 如果模板有甲方企业参与方，则需要填写经办人配置；单乙方模板可为空 |

`operator_schema` 示例：

```json
{
  "org_name": "江门市臻品堂生物科技有限公司",
  "transactor_psn_account": "13702236109",
  "transactor_name": "林健荣"
}
```

### 4.3 同步参与方和控件映射

在 `e签宝流程模板` 列表页：

1. 勾选刚创建/修改的模板记录。
2. 在 action 下拉框中选择：
   `从 e签宝读取模板详情并同步参与方/控件映射`
3. 点击执行。
4. 打开模板记录，确认 `participant_schema` 和 `component_schema` 已自动填入。

业务员模板同步后，常见字段类似：

```json
{
  "participant_schema": {
    "agent": "乙方参与方ID"
  },
  "component_schema": {
    "agent_name": {
      "file_id": "文件ID",
      "component_id": "姓名控件ID",
      "required": false,
      "upstream_required": true,
      "component_name": "姓名1",
      "component_type": 1
    },
    "agent_phone": {
      "file_id": "文件ID",
      "component_id": "电话控件ID",
      "required": false,
      "upstream_required": true,
      "component_name": "电话1",
      "component_type": 2
    }
  }
}
```

说明：

- `required` 是本地是否强制后端必须填值，自动同步时默认 `false`。
- `upstream_required` 表示 e签宝模板中该控件是否必填，仅供参考。
- 如果本地没有身份证号、省市区等数据，保持 `required=false`，让签署人在 e签宝拟定页面填写。

### 4.4 启用模板

同一个 `business_scene=agent_cooperation` 下，建议只启用一个当前要使用的模板。

如果同一业务场景存在多条 active 模板，后端会取最新创建的 active 模板。  
这不会污染商户流程，但可能导致业务员场景内选错模板。

---

## 5. 新建或切换商户流程模板

适用场景：商户合作协议。商户在系统中是 `customer` 用户。

### 5.1 在 e签宝后台准备模板

建议模板结构：

- 通常是单参与方：商户/乙方签署。
- 合同正文中的平台方/甲方信息建议由模板固定。
- 签署区和签署日期由模板维护。
- 商户未知字段，例如身份证号、省市区，可以让签署人在 e签宝拟定页面填写。

### 5.2 在 Django admin 创建流程模板记录

进入 `e签宝流程模板`，新建一条记录。

字段填写：

| 字段 | 填写方式 |
------|----------|
| `account` | 选择当前 e签宝账号 |
| `name` | 例如 `商户合作协议 v1` |
| `slug` | 例如 `merchant-cooperation-flow-v1` |
| `business_scene` | 必须选择 `merchant_cooperation` |
| `version` | 例如 `v1.0` |
| `sign_template_id` | e签宝商户流程模板 ID |
| `org_id` | e签宝企业 orgId |
| `is_active` | 是否启用 |
| `participant_schema` | 先留空，后续用 action 自动同步 |
| `component_schema` | 先留空，后续用 action 自动同步 |
| `operator_schema` | 单乙方模板通常可为空；若模板含甲方企业参与方才填写 |

### 5.3 同步参与方和控件映射

在 `e签宝流程模板` 列表页：

1. 勾选商户模板记录。
2. 执行 action：
   `从 e签宝读取模板详情并同步参与方/控件映射`
3. 打开模板记录检查映射。

商户模板同步后，常见字段类似：

```json
{
  "participant_schema": {
    "agent": "商户签署方参与方ID"
  },
  "component_schema": {
    "customer_name": {
      "file_id": "文件ID",
      "component_id": "姓名控件ID",
      "required": false,
      "upstream_required": true,
      "component_name": "姓名1",
      "component_type": 1
    },
    "customer_phone": {
      "file_id": "文件ID",
      "component_id": "电话控件ID",
      "required": false,
      "upstream_required": true,
      "component_name": "电话1",
      "component_type": 2
    }
  }
}
```

注意：

- 商户场景会自动生成 `customer_*` 控件 key。
- 不应手动复制业务员模板的 `agent_*` 映射到商户模板。
- `participant_schema` 中仍可能使用内部角色键 `"agent"`，它在当前代码中代表“个人签署方槽位”。这是技术内部命名，不表示业务员。

### 5.4 启用模板

同一个 `business_scene=merchant_cooperation` 下，建议只启用一个当前要使用的模板。

业务员和商户是不同 business scene，可以各自有一条 active 模板，不会互相污染。

---

## 6. 如何发起签署测试

### 6.1 业务员签署 API

前端或测试工具调用：

```text
POST /api/v1/esign/agent-cooperation/start/
```

要求：

- 当前登录用户 `user_type=agent`。
- 当前用户没有进行中的旧业务员签署流程。
- `agent_cooperation` 下存在 active 流程模板。

查询状态：

```text
GET /api/v1/esign/agent-cooperation/status/
```

取消进行中流程：

```text
POST /api/v1/esign/agent-cooperation/cancel/
```

### 6.2 商户签署 API

前端或测试工具调用：

```text
POST /api/v1/esign/merchant-cooperation/start/
```

要求：

- 当前登录用户 `user_type=customer`。
- 当前用户没有进行中的旧商户签署流程。
- `merchant_cooperation` 下存在 active 流程模板。

查询状态：

```text
GET /api/v1/esign/merchant-cooperation/status/
```

取消进行中流程：

```text
POST /api/v1/esign/merchant-cooperation/cancel/
```

---

## 7. 重签和重置状态

### 7.1 业务员要求重签

进入 `业务员Profile`：

1. 勾选对应业务员 profile。
2. 执行 action：
   `重置e签宝状态（允许重新签约）`
3. 该 profile 的：
   - `esign_verified=false`
   - `esign_cooperation_signed=false`
4. 业务员再次调用 start API 时，会创建新的签署流程。

### 7.2 商户要求重签

进入 `客户Profile`：

1. 勾选对应商户 profile。
2. 执行 action：
   `重置e签宝状态（允许重新签约）`
3. 该 profile 的：
   - `esign_verified=false`
   - `esign_cooperation_signed=false`
4. 商户再次调用 merchant start API 时，会创建新的签署流程。

### 7.3 进行中流程卡住

进入 `e签宝签署任务`：

1. 找到对应签署任务。
2. 如果状态是进行中，可执行 action：
   `撤销/本地终止进行中的签署任务`
3. 系统会优先调用 e签宝撤销接口。
4. 如果 e签宝说流程不存在，本地会标记 failed，用于解除用户再次 start 的阻塞。

---

## 8. 常见错误与处理

### 8.1 指定参与方不存在

错误类似：

```text
使用模板指定参与方不存在, participantId: xxx
```

原因：

- 更换了流程模板，但本地还在使用旧模板的 `participantId`。
- 或者 e签宝后台重建了参与方，导致 ID 变化。

处理：

1. 打开对应 `e签宝流程模板`。
2. 确认 `business_scene` 是否正确。
3. 勾选该模板，执行：
   `从 e签宝读取模板详情并同步参与方/控件映射`
4. 再次发起签署。

### 8.2 is not a fillField

错误类似：

```text
contentFileId: xxx is not a fillField
```

原因：

- 把签名控件或签署日期控件当成普通文本控件填充。

处理：

1. 重新执行模板同步 action。
2. 检查 `component_schema` 中是否包含签署日期或签名控件。
3. 正常情况下 action 会自动排除它们。

### 8.3 start 返回已有旧流程

现象：

- 用户点击重新签署，但返回的是旧的 `signflow_id` 或旧链接。

原因：

- 该用户存在进行中的签署任务。

处理：

1. 到 `e签宝签署任务` 找到该用户最新进行中任务。
2. 执行：
   `撤销/本地终止进行中的签署任务`
3. 再让用户重新发起 start。

### 8.4 模板场景选错

现象：

- 业务员使用了商户模板。
- 商户使用了业务员模板。
- 或 start API 报无 active template。

原因：

- `business_scene` 选错。
- 或目标场景没有 active 模板。

处理：

1. 业务员模板必须是 `agent_cooperation`。
2. 商户模板必须是 `merchant_cooperation`。
3. 每个场景建议只保留一个当前 active 模板。

### 8.5 签署完成但状态没更新

检查顺序：

1. `e签宝签署任务` 中对应任务是否为 `completed`。
2. `e签宝回调审计` 是否收到 `SIGN_FLOW_COMPLETE`。
3. 回调审计 `process_status` 是否为 `done`。
4. 对应 profile 是否更新：
   - 业务员：`AgentProfile.esign_verified/esign_cooperation_signed`
   - 商户：`CustomerProfile.esign_verified/esign_cooperation_signed`
5. 如果签署任务已 completed，但 profile 没更新，需要查看日志或让开发人员检查 webhook handler。

---

## 9. 给 AI agent 的辅助判断规则

AI agent 在协助工作人员时，应优先判断以下问题。

### 9.1 工作人员说“换了模板后报参与方不存在”

回答方向：

- 解释 `participantId` 是模板内部槽位 ID，不是全局身份。
- 指导执行 `从 e签宝读取模板详情并同步参与方/控件映射`。
- 确认模板 `business_scene` 是否正确。

不要建议手写 JSON，除非工作人员明确要求，并且已经知道具体 ID。

### 9.2 工作人员说“模板里只有一个参与方”

回答方向：

- 这是允许的。
- 单参与方通常就是个人签署方。
- 对业务员/商户单参与方模板，后端只提交个人签署方。
- 合同正文中的平台方/甲方可以由模板固定内容承载。

### 9.3 工作人员说“签署日期没有填”

回答方向：

- 签署日期不是后端填充字段。
- 应检查 e签宝模板中的签署日期控件是否正确绑定签署区/签署行为。
- 不要把签署日期控件录入为普通 component 填充值。

### 9.4 工作人员说“商户模板会不会影响业务员”

回答方向：

- 不会，只要 `business_scene` 选对。
- 业务员使用 `agent_cooperation`。
- 商户使用 `merchant_cooperation`。
- webhook 也会按本地签署任务的 `business_scene` 更新不同 profile。

### 9.5 工作人员要创建多个模板

回答方向：

- 可以创建多条模板记录。
- 但同一个 business scene 建议只启用当前要使用的一条。
- 历史签署任务不会丢失，因为每条签署任务保存了当时的 `signTemplateId`、参与方和控件快照。

---

## 10. 操作前检查清单

创建或切换模板前：

- [ ] 确认这是业务员模板还是商户模板。
- [ ] 选择正确的 `business_scene`。
- [ ] 填入正确的 `sign_template_id`。
- [ ] 填入正确的 `org_id`。
- [ ] 保存模板记录。
- [ ] 执行同步 action。
- [ ] 检查 `participant_schema` 已生成。
- [ ] 检查 `component_schema` 没有签名/签署日期控件。
- [ ] 确认同一业务场景下只有目标模板 active。

发起测试前：

- [ ] 测试用户类型正确。
- [ ] 测试用户没有进行中的旧签署任务。
- [ ] 测试用户 profile 有手机号。
- [ ] e签宝 webhook 地址可用。

签署完成后：

- [ ] `e签宝签署任务.status=completed`。
- [ ] 已签文件 URL 已回填。
- [ ] profile 的 `esign_verified=true`。
- [ ] profile 的 `esign_cooperation_signed=true`。

