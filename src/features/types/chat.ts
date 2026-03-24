export type ArtifactType =
  | 'CHART'
  | 'CODE'
  | 'CSV'
  | 'CUSTOM'
  | 'DIAGRAM'
  | 'DIR'
  | 'HTML'
  | 'IMAGE'
  | 'JSON'
  | 'KNOWLEDGE'
  | 'LLM_OUTPUT'
  | 'MARKDOWN'
  | 'MCP_CALL'
  | 'PLAYWRIGHT'
  | 'SVG'
  | 'TABLE'
  | 'TEXT'
  | 'TOOL_CALL'
  | 'WEB_PAGES';

export interface KnowledgeFile {
  fileName: string;
  url: string;
  fileType: string;
  description?: string;
  previewType?: string;
  sourcePath?: string;
}

export interface KnowledgeContent {
  answer: string;
  files: KnowledgeFile[];
}

export interface ArtifactInfo {
  artifactId: string;
  artifactType: ArtifactType;
  content: any;
  metadata: Record<string, any>;
}

export interface StepInfo {
  stepId: string;
  stepName: string;
  stepIndex: number;
  status: 'completed' | 'running';
  description: string;
}

export interface ToolCallInfo {
  toolId: string;
  toolName: string;
  arguments: string;
  status: string;
}

export interface ToolResultInfo {
  toolId: string;
  toolName: string;
  result: string;
  success: boolean;
  duration: number;
  artifacts: ArtifactInfo[];
}

export type ChatFileType = 'file' | 'image';

export interface ChatFile {
  fileType?: string;
  fileName?: string;
  filePath: string;
  desc?: string;
}

export interface WsStepMessage {
  type: 'step';
  step: StepInfo;
  sessionId: string;
  timestamp: number;
}

export interface WsToolCallMessage {
  type: 'tool_call';
  toolCall: ToolCallInfo;
  sessionId: string;
  timestamp: number;
}

export interface WsToolResultMessage {
  type: 'tool_result';
  toolResult: ToolResultInfo;
  sessionId: string;
  timestamp: number;
}

export interface WsStreamMessage {
  type: 'stream';
  delta: string;
  sessionId: string;
  timestamp: number;
}

export interface WsDoneMessage {
  type: 'done';
  taskId: string;
  content: string;
  finishReason: string;
  duration: number;
  sessionId: string;
  timestamp: number;
}

export interface WsErrorMessage {
  type: 'error';
  code: string;
  message: string;
  sessionId: string;
  timestamp: number;
}

export interface WsInteractionRequiredMessage {
  type: 'interaction_required';
  sourceType: string;
  question: string;
  message?: string;
  sessionId: string;
  timestamp: number;
}

export interface WsHistoryMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType: string;
  senderId: string;
  senderName: string;
  agentId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: string;
}

export interface WsHistoryMessage {
  type: 'history';
  sessionId: string;
  total: number;
  hasMore: boolean;
  oldestId: string;
  timestamp: number;
  messages: WsHistoryMessageItem[];
}

export interface LoadHistoryRequest {
  type: 'load_history';
  beforeId: string;
  pageSize?: number;
}

export type WsMessage =
  | WsDoneMessage
  | WsErrorMessage
  | WsHistoryMessage
  | WsInteractionRequiredMessage
  | WsStepMessage
  | WsStreamMessage
  | WsToolCallMessage
  | WsToolResultMessage;

export interface Message {
  id?: string;
  channel?: 'web';
  messageType?: 'chat';
  content?: {
    files: ChatFile[];
    text: string;
  };
  useKnowledgeBase?: boolean;
  sender: 'bot' | 'user';
  text?: string;
  type: 'render' | 'text';
  isLoading?: boolean;
  isStreaming?: boolean;
  showLoadingIndicator?: boolean;
  hideActions?: boolean;
  artifacts?: ArtifactInfo[];
  steps?: StepInfo[];
  toolCalls?: ToolCallInfo[];
  isStopped?: boolean;
  interactionQuestion?: string;
  interactionMessage?: string;
  interactionSessionId?: string;
}
