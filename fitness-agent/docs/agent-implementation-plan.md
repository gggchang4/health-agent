# Agent 写库与计划执行架构方案

## 1. 目标

### 1.1 文档目的

本文档定义 `fitness-agent` 第一版可执行 Agent 的正式落地方案，用于指导后续前端、Agent、Backend、数据库四层协同开发。目标不是一次性引入重型多智能体平台，而是在当前仓库基础上，以最小架构跃迁完成：

- 基于 LLM 的自然语言理解与计划生成
- 结构化提案生成与用户确认
- 通过后端命令安全写库
- 执行后自动刷新计划、Todo、日志等页面数据
- 为后续引入更复杂的 planning / memory / multi-step tool use 保留扩展面

### 1.2 一期范围

第一版 Agent 允许通过“提案 -> 用户确认 -> 后端执行”的方式处理以下写操作：

- 训练计划生成与重排
- 当前 active `WorkoutPlan` / `WorkoutPlanDay` 的增删改
- Todo 完成状态切换
- 体重等身体指标日志录入
- 每日打卡录入
- 训练日志录入

第一版暂不开放 Agent 直接写入以下对象：

- `User`
- `HealthProfile`
- `DietRecommendationSnapshot`
- `Exercise` / `ExerciseVariant`
- 任何系统配置或全局运营数据

### 1.3 核心原则

第一版必须坚持以下边界：

1. 数据库只允许 Backend 写入。
2. Agent 永远不直接连接 Prisma 或 PostgreSQL。
3. LLM 只负责理解、规划、生成结构化提案，不直接执行高风险写操作。
4. 所有写操作默认先提案、后确认。
5. Backend 是业务规则、审计与幂等控制的唯一可信边界。
6. Agent 会话、提案、执行过程需要持久化，不能继续只依赖内存态。

### 1.4 为什么选择这条路线

当前仓库已经具备完整的应用基本面：

- 前端：Next.js + React
- 后端：NestJS + Prisma + PostgreSQL
- Agent：FastAPI + 工具网关 + OpenAI-compatible LLM

从成本与演进速度看，第一版最适合采用“单运行时 orchestrator agent + 结构化提案 + 后端命令执行”的方案，而不是直接引入重型编排框架。这样可以：

- 保持当前技术栈连续性
- 最大化复用现有前后端接口与数据库模型
- 把复杂度集中到状态管理、确认流和命令边界
- 避免过早引入多进程多 Agent 协调成本

### 1.5 参考思路

本方案在设计思路上吸收以下主流 Agent 实践，但不将其作为第一版运行时硬依赖：

- LangGraph：显式状态机、节点编排、可恢复执行流
- OpenAI Agents SDK：结构化工具调用、工具边界清晰、结果回注
- AutoGen：planner / executor / critic 的逻辑分层

第一版只借鉴其设计思想：

- 显式状态而不是隐式 if/else
- 结构化提案而不是自由文本动作
- Agent 负责编排，Backend 负责执行

## 2. 当前现状与架构总览

### 2.1 当前代码现状

截至当前仓库，Agent 路径已经存在，但仍然偏“对话助手”而不是“可执行智能体”：

- `agent/app/main.py`
  - 提供 FastAPI 入口
  - 负责线程创建、消息发送、run stream、feedback
- `agent/app/agents.py`
  - 当前 `HealthAgentRuntime` 仍是单运行时
  - 已有意图分类、工具调用、LLM 渲染
  - 但尚无 proposal / approval / execution 状态机
- `agent/app/session_store.py`
  - 仍使用内存态线程和运行记录
- `agent/app/tool_gateway.py`
  - 目前主要是只读工具
  - 负责从 Backend 拉 profile / logs / plans 等上下文
- `backend/prisma/schema.prisma`
  - 已经存在 `AgentThread / AgentMessage / AgentRun / AgentRunStep`
  - 但 Agent 服务目前没有真正落到数据库

也就是说，数据库层已经预留了部分 Agent 结构，但运行时仍然没有进入“持久化 + 可确认执行”的阶段。

### 2.2 总体架构结论

第一版采用三层 Agent 架构：

1. Conversation / Orchestration Layer
2. Tool & Command Layer
3. Backend Domain Layer

关系如下：

```text
Frontend Chat
  -> FastAPI Agent Runtime
    -> Read Tools (Backend APIs)
    -> LLM reasoning / proposal generation
    -> Proposal persistence
    -> Approval waiting
    -> Command adapter
      -> Backend Command API
        -> Domain Service
          -> Prisma
            -> PostgreSQL
```

### 2.3 分层职责

#### Conversation / Orchestration Layer

保留 `agent/app` 为单运行时入口，但让内部变成显式状态机。它负责：

- 解析用户请求
- 识别是否涉及写操作
- 拉取上下文
- 组织 prompt 与结构化输出
- 生成 proposal
- 等待前端确认
- 调用后端命令执行
- 整理执行结果并回传给前端

#### Tool & Command Layer

这一层是 Agent 与业务系统之间的边界层，分成两组能力：

- `read_tools`
  - 只读取用户上下文
- `command_adapters`
  - 把 proposal 转换成后端命令调用

LLM 永远不应自己构造任意 HTTP 写请求。它只产出结构化提案，具体执行由命令适配器承担。

#### Backend Domain Layer

所有持久化仍由 NestJS Backend 负责。它承担：

- 鉴权
- 参数校验
- 业务约束
- 幂等保护
- 审计记录
- 数据一致性与事务边界

这一层是唯一允许写数据库的层。

## 3. 数据流

### 3.1 纯问答流程

当用户只是咨询，不涉及任何写库意图时，走只读流程：

```text
用户提问
  -> Agent classify_intent
  -> Agent load_context
  -> Agent generate_answer
  -> 前端渲染普通消息卡片
```

特点：

- 不生成 proposal
- 不产生确认动作
- 不触发后端写命令

### 3.2 写操作流程

当用户输入包含“帮我修改计划”“帮我记录今天体重”“把周五改成恢复训练”等写意图时，走提案确认流：

```text
用户发消息
  -> Agent 识别写意图
  -> 读取当前上下文
  -> LLM 生成结构化 proposal
  -> 本地 validator 校验
  -> proposal 落库，状态 pending
  -> 前端渲染 action proposal card
  -> 用户确认
  -> Agent 调用 backend command
  -> Backend 执行业务写入
  -> Agent 刷新上下文
  -> 前端渲染 action result card
  -> 页面相关数据刷新
```

### 3.3 核心前后端刷新链路

写操作成功后，前端需要刷新相关资源，而不是依赖聊天消息猜测页面状态：

- `plans/current`
- `dashboard`
- `logs`
- `profile` 中受影响的摘要

这样可以保证：

- 聊天区和页面区状态一致
- 用户刷新页面后仍看到数据库真实状态
- Todo 与当前 plan day 的映射保持稳定

### 3.4 Todo 在体系中的定位

本项目的 Todo 不应独立于计划系统存在。它应该继续绑定：

- 当前 active `WorkoutPlan`
- `WorkoutPlanDay.isCompleted`
- `WorkoutPlanDay.sortOrder`

因此，Agent 对 Todo 的修改本质上就是对当前 active 计划项的修改。

这有两个好处：

- 避免重复建模
- 保持“训练计划”和“待执行清单”是同一份事实来源

## 4. 接口与数据模型

### 4.1 Agent 内部核心对象

第一版建议引入统一的结构化提案模型。

#### ActionProposalEnvelope

Agent 对前端的结构化响应建议包含：

- `assistantMessage`
- `reasoningSummary`
- `proposals[]`
- `nextActions[]`

#### ActionProposal

每个可执行动作都应是一条独立 proposal，至少包括：

- `proposalId`
- `actionType`
- `entityType`
- `entityId?`
- `title`
- `summary`
- `riskLevel`
- `requiresConfirmation`
- `preview`
- `payload`
- `validationWarnings[]`

### 4.2 actionType 枚举

一期建议固定为白名单枚举：

- `generate_plan`
- `adjust_plan`
- `create_plan_day`
- `update_plan_day`
- `delete_plan_day`
- `complete_plan_day`
- `create_body_metric`
- `create_daily_checkin`
- `create_workout_log`

后续新增动作时，必须同步更新：

- Agent validator
- Backend command handler
- 前端卡片渲染
- 测试用例

### 4.3 preview 与 payload 的分工

#### preview

给前端展示“确认前会发生什么变化”，应该适合人阅读，例如：

- 原计划 vs 新计划
- 删除的是哪一条计划项
- 今天将记录的睡眠、步数、体重是多少

#### payload

给程序执行的机器输入，不能依赖用户读懂。它应足够精确，例如：

- `planId`
- `dayId`
- `sortOrder`
- `duration`
- `exercises`
- `recordedAt`

### 4.4 数据库模型建议

当前 Prisma 中已存在：

- `AgentThread`
- `AgentMessage`
- `AgentRun`
- `AgentRunStep`

这些对象建议真正启用，而不是继续只存在 schema 中。

此外，需要新增提案与执行记录表：

#### AgentActionProposal

建议字段：

- `id`
- `runId`
- `threadId`
- `userId`
- `status`
- `actionType`
- `title`
- `summary`
- `payload` JSON
- `preview` JSON
- `riskLevel`
- `requiresConfirmation`
- `expiresAt`
- `createdAt`
- `updatedAt`

其中 `status` 枚举建议为：

- `pending`
- `approved`
- `rejected`
- `expired`
- `executed`
- `failed`

#### AgentActionExecution

建议字段：

- `id`
- `proposalId`
- `userId`
- `status`
- `requestPayload` JSON
- `resultPayload` JSON
- `errorMessage`
- `idempotencyKey`
- `createdAt`

其中 `status` 枚举建议为：

- `started`
- `succeeded`
- `failed`
- `rolled_back`

### 4.5 为什么不直接把提案塞进 AgentMessage

虽然可以把 proposal JSON 存进 `AgentMessage.reasoning` 或 `content`，但不建议这么做。独立 proposal 表的价值在于：

- 状态流更清晰
- 审批与执行生命周期可单独管理
- 前端刷新后可直接恢复待审批状态
- 更容易做 TTL、幂等、审计、失败重试

### 4.6 前端卡片模型

前端聊天消息需要新增两类渲染类型：

- `action_proposal_card`
- `action_result_card`

Proposal card 至少展示：

- 标题
- 操作摘要
- 风险等级
- 影响对象
- 前后变化预览
- 确认按钮
- 拒绝按钮

Result card 至少展示：

- 执行结果
- 成功或失败状态
- 改动摘要
- 刷新建议或后续动作

### 4.7 Backend 命令接口策略

Agent 不应复用零散的普通页面 API 去拼装复杂写操作。推荐为 Agent 单独设计命令式写接口。

有两种可行方式：

#### 方案 A：统一命令入口

`POST /agent/commands/execute`

输入：

- `proposalId`
- `actionType`
- `payload`
- `idempotencyKey`

优点：

- 单入口，便于统一鉴权与审计

缺点：

- 内部 dispatch 逻辑会逐渐复杂

#### 方案 B：按业务拆命令接口

- `POST /agent/commands/generate-plan`
- `POST /agent/commands/update-plan-day`
- `POST /agent/commands/delete-plan-day`
- `POST /agent/commands/create-body-metric`
- `POST /agent/commands/create-daily-checkin`
- `POST /agent/commands/create-workout-log`

第一版更推荐方案 B，因为：

- 接口语义清晰
- 权限边界更容易理解
- DTO 更稳定
- 后续排查问题更简单

### 4.8 命令接口执行前必须校验

Backend 执行命令前必须重新验证：

- `proposalId` 是否存在
- proposal 是否属于当前用户
- proposal 是否仍在有效期内
- 目标实体是否仍存在
- 当前状态是否允许执行
- `idempotencyKey` 是否已经执行过

这一步是避免 stale proposal 和重复点击造成脏写的关键。

## 5. 状态机

### 5.1 为什么要显式状态机

当前 `HealthAgentRuntime` 的核心流程是：

- 识别意图
- 调工具
- 拼响应

这适合问答型 Agent，但不适合可执行写操作。一旦引入：

- 用户确认
- proposal 过期
- 执行失败
- 执行后刷新

如果仍靠散落的 if/else 处理，很快会变得难维护、难测试、难排查。

因此，第一版应将运行流显式拆成可观察状态机。

### 5.2 推荐状态节点

建议一条消息的执行流包含以下状态：

1. `classify_intent`
2. `load_context`
3. `decide_actionability`
4. `generate_structured_output`
5. `validate_proposal`
6. `persist_proposal`
7. `await_frontend_approval`
8. `execute_command`
9. `refresh_context`
10. `summarize_result`

### 5.3 各状态职责

#### classify_intent

识别这是：

- 纯问答
- 写操作请求
- 高风险越界请求

输出至少包括：

- `intent`
- `riskLevel`
- `needsProposal`

#### load_context

拉取本次决策所需上下文，例如：

- 用户 profile
- 当前计划
- 最近 check-in
- 最近训练日志
- 线程历史消息

这一步只读，不得执行写操作。

#### decide_actionability

判断：

- 能否直接回答
- 还是需要生成 proposal
- 有没有缺少关键上下文

如果缺少必要信息，应优先追问而不是盲写。

#### generate_structured_output

调用 LLM 生成：

- 普通回答
- 或结构化 proposal envelope

这一阶段只产出候选结构化结果，不直接进入执行。

#### validate_proposal

本地 validator 校验 proposal：

- `actionType` 是否在白名单
- payload 字段是否完整
- 风险级别是否合理
- 是否企图越权修改不允许的实体

任何非法 proposal 都必须在这里被拦截。

#### persist_proposal

将合法 proposal 写入数据库，状态为 `pending`。

#### await_frontend_approval

这一状态不由 Agent 继续“空跑”，而是转入等待前端交互。前端负责展示行动卡，并触发：

- approve
- reject

#### execute_command

只有收到 approve 后才进入此阶段。Agent 把 proposal 交给 command adapter，再由 Backend 完成真实写入。

#### refresh_context

执行完成后，Agent 重新拉当前计划、日志等摘要，确保返回的是数据库最新状态而不是旧缓存。

#### summarize_result

向用户生成最终说明：

- 执行了什么
- 哪些数据变了
- 现在页面上应该看到什么结果

### 5.4 run 与 proposal 的关系

建议一条用户消息对应一条 `AgentRun`。在该 run 内：

- 可能没有 proposal
- 也可能产生一条或多条 proposal

proposal 与 run 的关系应是一对多。这样可以支持未来一条复杂请求拆成多个子动作。

## 6. 安全与风控

### 6.1 最重要的安全边界

第一版必须保证：

1. Agent 不直接写数据库。
2. Agent 不直接调用任意写接口。
3. LLM 不允许自由拼接 SQL、HTTP endpoint 或 Prisma 参数。
4. 所有高风险动作都必须用户确认。
5. 执行时必须再次校验实体归属和有效性。

### 6.2 白名单机制

Agent 可执行动作只能来自固定白名单 `actionType`。如果 LLM 返回未知动作：

- 不落库
- 不进入确认流
- 记录日志并返回安全错误

### 6.3 风险分级

建议采用三档风险：

#### low

- 标记计划完成
- 追加单条 todo
- 新增单条日志

#### medium

- 修改单个计划项
- 调整某一天 focus / duration / recoveryTip

#### high

- 生成整周新计划
- 批量重排当前计划
- 删除已有计划项

高风险动作默认必须强确认，未来可以考虑增加二次确认或撤销窗。

### 6.4 proposal TTL

每条 proposal 应设置过期时间 `expiresAt`。推荐：

- low：10 到 30 分钟
- medium：30 分钟到 2 小时
- high：30 分钟到 24 小时，视产品体验而定

过期 proposal 必须不可执行，以避免用户在长时间后批准一个已经陈旧的改动。

### 6.5 幂等控制

所有写命令都应带 `idempotencyKey`。典型场景：

- 用户连续点击两次确认
- 前端网络超时后重试
- Agent 与 Backend 之间发生重复请求

Backend 应保证同一个 `idempotencyKey` 只落一次有效写入。

### 6.6 stale proposal 保护

执行前要重新检查目标是否仍处于预期状态。例如：

- 待删除的 plan day 已被别的地方删掉
- 当前 active plan 已切换
- 目标日志已被用户手动修改

如果状态变化，Backend 应返回明确的 stale 错误，前端提示用户刷新上下文后重试。

### 6.7 Prompt 注入与越权

Agent 在系统 prompt 和 validator 中都应明确禁止：

- 修改不在白名单内的数据
- 伪造用户身份
- 替其他用户执行命令
- 跳过确认直接执行
- 构造未定义命令

最终安全仍依赖 Backend 校验，而不是只依赖 prompt。

## 7. 测试

### 7.1 Agent 编排测试

核心场景：

- 纯问答请求不生成 proposal
- 修改计划请求能生成 `update_plan_day` proposal
- 日志录入请求能生成对应 proposal
- 非法 proposal 被 validator 拦截
- proposal 过期后不可执行
- proposal 被拒绝后不可再次执行

### 7.2 Backend 命令测试

每个 command handler 至少覆盖：

- 正常执行成功
- 目标实体不存在
- proposal 不属于当前用户
- `idempotencyKey` 重复提交
- stale proposal
- 数据库异常或事务失败

### 7.3 前端交互测试

前端至少需要验证：

- proposal card 正常渲染
- 点击确认后展示 loading / success / failure
- 点击拒绝后状态更新
- 刷新页面后待处理 proposal 仍能恢复
- 执行成功后相关页面数据刷新

### 7.4 端到端场景

建议优先覆盖以下高价值场景：

1. 用户说“帮我把周五训练改成恢复走路 40 分钟”
2. Agent 产出 proposal
3. 用户确认
4. Backend 更新 `WorkoutPlanDay`
5. `plans/current` 与 Todo 同步变化

再覆盖：

1. 用户说“记录我今天睡了 6.5 小时，走了 7000 步”
2. Agent 产出 `create_daily_checkin` proposal
3. 用户确认后成功落库
4. dashboard 与 logs 可看到新增记录

### 7.5 异常场景测试

必须覆盖：

- 目标计划项已被删除
- Backend 执行失败
- Agent 与 Backend 通信异常
- LLM 返回不合法 JSON
- proposal 已过期
- 用户切换账号后 proposal 越权访问

## 8. 与当前代码的映射建议

### 8.1 FastAPI Agent

建议保留以下模块，但升级职责：

- `agent/app/main.py`
  - 保留 API 入口
  - 增加 proposal approve / reject / list 接口
- `agent/app/agents.py`
  - 从当前“按意图分支处理”升级为显式状态机 runtime
- `agent/app/models.py`
  - 增加 proposal、result card、execution result 等结构
- `agent/app/tool_gateway.py`
  - 保留只读工具
  - 新增 command adapter 调用能力
- `agent/app/session_store.py`
  - 第一阶段可保留作为 fallback
  - 目标是逐步迁移到数据库持久化 store

### 8.2 Backend

建议新增：

- agent command controller
- proposal / execution 的 service 层
- DTO 校验
- 幂等执行记录

现有普通 controller 可继续服务页面，但不要让 Agent 用多个零散 endpoint 手工拼装复杂事务。

### 8.3 Database / Prisma

建议以 Prisma migration 方式完成：

- `AgentActionProposal`
- `AgentActionExecution`
- 必要索引
- 与 `AgentRun / AgentThread / User` 的关联

### 8.4 Frontend

主要落点：

- `frontend/app/chat/page.tsx`
  - 渲染 proposal card / result card
- `frontend/lib/api.ts`
  - 新增 agent approve / reject / list proposals 请求
- `frontend/lib/types.ts`
  - 新增 proposal card types
- 需要在 chat 与相关页面之间做好数据刷新协作

## 9. 实施路线

### Phase 1：文档与模型对齐

目标：

- 完成本文档
- 确认一期 actionType 范围
- 确认 proposal / execution schema
- 确认前端交互样式

产出：

- 设计文档
- DTO 草案
- Prisma 变更草案

### Phase 2：数据库持久化基础

目标：

- 让 `AgentThread / AgentMessage / AgentRun / AgentRunStep` 真正落库
- 新增 `AgentActionProposal / AgentActionExecution`

产出：

- Prisma migration
- Backend / Agent store 适配

### Phase 3：proposal 流

目标：

- Agent 能生成 proposal 并落库
- 前端能展示 proposal card
- 用户可 approve / reject

产出：

- 新 API
- 新前端卡片
- proposal validator

### Phase 4：命令执行流

目标：

- Backend 命令接口就位
- Agent 在确认后可执行计划与日志写入
- 执行后自动刷新上下文

产出：

- command handlers
- result card
- 页面刷新联动

### Phase 5：可观测性与稳定性

目标：

- run / proposal / execution 全链路日志
- 更完善的失败处理与重试
- 端到端回归测试

产出：

- 结构化日志
- 测试集
- 运维排查手册

## 10. 观察性与维护性要求

### 10.1 全链路标识

Agent 与 Backend 日志都应携带以下标识：

- `userId`
- `threadId`
- `runId`
- `proposalId`
- `executionId`

这样才能从前端一次点击追踪到后端一次写库。

### 10.2 关键日志事件

建议记录以下结构化事件：

- intent classified
- tools loaded
- proposal created
- proposal validated
- approval received
- execution started
- execution succeeded / failed
- context refreshed
- final summary returned

### 10.3 为后续扩展留出的能力

该架构天然支持后续演进：

- 多 proposal 单 run
- 计划生成前引入 planner / critic 逻辑分层
- 自动补全缺失上下文
- 可撤销命令
- 执行策略分流
- 更复杂的 agent memory

第一版先把“安全写库 + 可确认 + 可追踪”做扎实，后续扩展成本会显著降低。

## 11. 结论

`fitness-agent` 的 Agent 第一版不应直接演化成自由写库的自治智能体，而应实现为：

- 单运行时 orchestrator
- 结构化 proposal 生成器
- 用户确认驱动的命令执行器
- Backend 作为唯一持久化和规则边界

这是当前仓库最稳妥、最易维护、最适合增量落地的方案。

一句话总结：

> 让 Agent 负责“理解与提案”，让 Backend 负责“校验与执行”，让前端负责“确认与反馈”，让数据库只保存被正式批准的真实动作。
