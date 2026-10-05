'use client';

import { useId, useState } from 'react';
import { Brain, Check, ChevronDown, CircleAlert, LoaderCircle, Plug, Wrench } from 'lucide-react';

import type { ThinkingStep } from '@/types';
import { useStickToBottom } from '@/hooks/use-stick-to-bottom';

type ToolStep = Extract<ThinkingStep, { kind: 'tool' }>;

type ThinkingPanelProps = {
    steps: ThinkingStep[];
    thinkingMs?: number;
    /** Leo is still reasoning or waiting on a tool. */
    isActive: boolean;
    /** Shown in place of the usual status line while active, such as a rate-limit wait. */
    status?: string;
};

const formatDuration = (ms = 0) => {
    const seconds = Math.max(1, Math.round(ms / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const formatInput = (input: unknown) =>
    typeof input === 'string' ? input : JSON.stringify(input, null, 2) ?? '';

const StatusIcon = ({ status }: { status: ToolStep['status'] }) => {
    if (status === 'running')
        return <LoaderCircle className="w-3.5 h-3.5 animate-spin text-white/50" />;
    if (status === 'error') return <CircleAlert className="w-3.5 h-3.5 text-red-300/80" />;
    return <Check className="w-3.5 h-3.5 text-emerald-300/80" />;
};

const Detail = ({ label, text }: { label: string; text: string }) => (
    <div>
        <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">{label}</div>
        <pre className="max-h-40 overflow-auto overscroll-contain whitespace-pre-wrap break-words rounded-md bg-black/40 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-white/65">
            {text}
        </pre>
    </div>
);

/** One tool call: name, source and status, expanding to its input and result. */
const ToolCallCard = ({ step }: { step: ToolStep }) => {
    const [open, setOpen] = useState(false);
    const detailsId = useId();
    const SourceIcon = step.server ? Plug : Wrench;

    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] text-xs">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={detailsId}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-white/[0.04] transition-colors"
            >
                <SourceIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-white/75">{step.name}</span>
                    <span className="block truncate text-[10px] text-white/35">
                        {step.server ? `MCP · ${step.server}` : 'Built-in tool'}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                    <StatusIcon status={step.status} />
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-white/30 transition-transform ${
                            open ? 'rotate-180' : ''
                        }`}
                    />
                </span>
            </button>

            {open && (
                <div id={detailsId} className="space-y-2 border-t border-white/10 px-2.5 py-2">
                    <Detail label="Input" text={formatInput(step.input)} />
                    {step.output !== undefined && (
                        <Detail
                            label={step.status === 'error' ? 'Error' : 'Result'}
                            text={step.output}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * The reasoning and tool calls behind a reply. While Leo works, the timeline streams in live;
 * once the answer starts it folds away to a one-line summary, and the chevron opens it again.
 * After the reader toggles it themselves, their choice sticks.
 */
const ThinkingPanel = ({ steps, thinkingMs, isActive, status }: ThinkingPanelProps) => {
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const open = userOpen ?? isActive;
    const timelineId = useId();
    const timeline = useStickToBottom<HTMLOListElement>(steps);

    const tools = steps.filter((step): step is ToolStep => step.kind === 'tool');
    const runningTool = tools.findLast((tool) => tool.status === 'running');

    const label = !isActive
        ? `Thought for ${formatDuration(thinkingMs)}`
        : status ??
          (runningTool
              ? `Using ${runningTool.name}${runningTool.server ? ` · ${runningTool.server}` : ''}…`
              : 'Thinking…');

    return (
        <div className="mb-2 last:mb-0">
            <button
                type="button"
                onClick={() => setUserOpen(!open)}
                disabled={!steps.length}
                aria-expanded={open}
                aria-controls={timelineId}
                className="flex max-w-full items-center gap-1.5 text-xs text-white/45 enabled:hover:text-white/80 transition-colors"
            >
                {isActive ? (
                    <LoaderCircle className="w-3.5 h-3.5 shrink-0 animate-spin" />
                ) : (
                    <Brain className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className={`truncate ${isActive ? 'thinking-shimmer' : ''}`}>{label}</span>
                {!isActive && tools.length > 0 && (
                    <span className="shrink-0 text-white/30">
                        · {tools.length} tool{tools.length > 1 ? 's' : ''}
                    </span>
                )}
                {steps.length > 0 && (
                    <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            open ? 'rotate-180' : ''
                        }`}
                    />
                )}
            </button>

            {open && steps.length > 0 && (
                <ol
                    id={timelineId}
                    ref={timeline.ref}
                    onScroll={timeline.onScroll}
                    // Capped while streaming so the live thoughts don't push the chat around.
                    className={`mt-2 ml-1.5 space-y-2.5 border-l border-white/10 pl-3 ${
                        isActive ? 'max-h-56 overflow-y-auto overscroll-contain pr-1' : ''
                    }`}
                >
                    {steps.map((step, index) => (
                        <li key={step.kind === 'tool' ? step.id : `reasoning-${index}`}>
                            {step.kind === 'tool' ? (
                                <ToolCallCard step={step} />
                            ) : (
                                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/50">
                                    {step.text.trim()}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};

export default ThinkingPanel;
