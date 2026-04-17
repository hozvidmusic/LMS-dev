'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const Btn = ({ onClick, active, title, children }) => (
    <button type="button" title={title} onClick={onClick}
      className="px-2 py-1 rounded text-sm transition-all"
      style={{
        background: active ? '#7c6af720' : 'transparent',
        color: active ? '#7c6af7' : '#9090a8',
        border: active ? '1px solid #7c6af740' : '1px solid transparent',
      }}>
      {children}
    </button>
  );

  return (
    <div className="rounded-xl overflow-hidden tiptap-editor"
      style={{ border: '1px solid #333344', background: '#0f0f13' }}>
      <div className="flex flex-wrap gap-1 p-2"
        style={{ borderBottom: '1px solid #2a2a38', background: '#16161d' }}>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><strong>B</strong></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><em>I</em></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><u>U</u></Btn>
        <span style={{ borderLeft: '1px solid #333344', margin: '0 4px' }} />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</Btn>
        <span style={{ borderLeft: '1px solid #333344', margin: '0 4px' }} />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• Lista</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. Lista</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>❝</Btn>
        <span style={{ borderLeft: '1px solid #333344', margin: '0 4px' }} />
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>≡L</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>≡C</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>≡R</Btn>
      </div>
      <EditorContent editor={editor} className="min-h-[200px] text-sm" style={{ color: '#e8e8f0' }} />
    </div>
  );
}
