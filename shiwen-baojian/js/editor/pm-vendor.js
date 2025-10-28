// 單一入口，統一 ProseMirror 版本，避免多版本衝突

export { EditorState, Plugin, PluginKey } from 'https://esm.sh/prosemirror-state@1.4.3?deps=prosemirror-model@1.19.3';
export { EditorView, Decoration, DecorationSet } from 'https://esm.sh/prosemirror-view@1.30.2?deps=prosemirror-model@1.19.3,prosemirror-state@1.4.3';
export { Schema, DOMParser as PMDOMParser } from 'https://esm.sh/prosemirror-model@1.19.3';
export { keymap } from 'https://esm.sh/prosemirror-keymap@1.2.0?deps=prosemirror-state@1.4.3';
export { baseKeymap } from 'https://esm.sh/prosemirror-commands@1.5.0?deps=prosemirror-state@1.4.3,prosemirror-model@1.19.3';
export { history } from 'https://esm.sh/prosemirror-history@1.3.0?deps=prosemirror-state@1.4.3';


