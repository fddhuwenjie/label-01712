/**
 * 节点类型配置
 */
export const NODE_TYPES = {
    'number-input': {
        name: '数字输入',
        class: 'number',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>',
        defaultData: { value: 0 },
        hasInput: true,
        hasOutput: true
    },
    'text-input': {
        name: '文字输入',
        class: 'text',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
        defaultData: { value: '' },
        hasInput: true,
        hasOutput: true
    },
    'condition': {
        name: '条件判断',
        class: 'condition',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 3l9 9-9 9-9-9 9-9z"/></svg>',
        defaultData: { operator: '>', compareValue: 0 },
        hasInput: true,
        hasOutput: true
    },
    'output': {
        name: '结果输出',
        class: 'output',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>',
        defaultData: { result: '' },
        hasInput: true,
        hasOutput: false
    }
};

export default NODE_TYPES;
