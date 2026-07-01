"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import YoutubeExt from "@tiptap/extension-youtube";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  Code2,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Image as ImageIcon,
  Youtube,
  Table,
  Loader2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />;
}

function TB({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm transition-colors shrink-0 ${
        active
          ? "bg-[#045830] text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// ─── Dialog wrapper ───────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Editor styles injected once ─────────────────────────────────────────────

const EDITOR_STYLES = `
  .tiptap-pr-editor table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .tiptap-pr-editor th, .tiptap-pr-editor td { border: 1px solid #e5e7eb; padding: 6px 12px; text-align: left; vertical-align: top; }
  .tiptap-pr-editor th { background: #f9fafb; font-weight: 600; }
  .tiptap-pr-editor .selectedCell::after { background: rgba(4,88,48,0.08); content: ""; pointer-events: none; position: absolute; inset: 0; }
  .tiptap-pr-editor .tableWrapper { overflow-x: auto; }
  .tiptap-pr-editor img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0.5em auto; }
  .tiptap-pr-editor iframe { max-width: 100%; aspect-ratio: 16/9; width: 100%; height: auto; display: block; border: none; }
  .tiptap-pr-editor div[data-youtube-video] { margin: 1em 0; }
  .tiptap-pr-editor code { background: #f3f4f6; border-radius: 3px; padding: 0.1em 0.3em; font-size: 0.9em; }
  .tiptap-pr-editor pre { background: #1e1e1e; color: #d4d4d4; border-radius: 6px; padding: 1em; overflow-x: auto; }
  .tiptap-pr-editor pre code { background: none; padding: 0; color: inherit; }
  .tiptap-pr-editor blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; color: #6b7280; font-style: italic; margin: 1em 0; }
  .tiptap-pr-editor hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }
  .tiptap-pr-editor:focus { outline: none; }
`;

// ─── Main component ───────────────────────────────────────────────────────────

export function RichTextEditor({ value, onChange }: Props) {
  const [dialog, setDialog] = useState<null | "link" | "image" | "youtube">(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      TableKit,
      YoutubeExt.configure({
        controls: true,
        HTMLAttributes: { style: "max-width:100%;display:block;margin:0 auto" },
      }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-pr-editor prose prose-sm max-w-none min-h-[400px] px-6 py-5 focus:outline-none",
      },
    },
  });

  // Sync externally-driven content changes (e.g. existing blog loaded, reference template inserted).
  // Compare against the editor's current HTML to avoid an infinite update loop.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value || "");
  }, [editor, value]);

  // ── Heading helpers ────────────────────────────────────────────────────────

  const headingValue = () => {
    if (!editor) return "p";
    for (const l of [1, 2, 3, 4, 5, 6] as const) {
      if (editor.isActive("heading", { level: l })) return String(l);
    }
    return "p";
  };

  const applyHeading = (v: string) => {
    if (!editor) return;
    if (v === "p") editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(v) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  };

  // ── Link ──────────────────────────────────────────────────────────────────

  const openLinkDialog = () => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href || "");
    setDialog("link");
  };

  const applyLink = () => {
    if (!editor) return;
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setDialog(null);
    setLinkUrl("");
  };

  // ── Image ─────────────────────────────────────────────────────────────────

  const insertImageFromUrl = () => {
    if (!editor || !imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setDialog(null);
    setImageUrl("");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      editor.chain().focus().setImage({ src: data.url }).run();
      setDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── YouTube ───────────────────────────────────────────────────────────────

  const insertYoutube = () => {
    if (!editor || !ytUrl.trim()) return;
    editor.chain().focus().setYoutubeVideo({ src: ytUrl.trim() }).run();
    setDialog(null);
    setYtUrl("");
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-lg min-h-[460px] flex items-center justify-center animate-pulse bg-gray-50">
        <span className="text-sm text-gray-400">Loading editor…</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#045830] transition-colors">
      <style>{EDITOR_STYLES}</style>

      {/* ── Toolbar ── */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5 flex flex-wrap items-center gap-0.5">

        {/* Heading */}
        <select
          value={headingValue()}
          onChange={(e) => applyHeading(e.target.value)}
          className="h-7 px-1.5 text-xs border border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:border-[#045830] cursor-pointer mr-0.5"
        >
          <option value="p">Paragraph</option>
          {([1, 2, 3, 4, 5, 6] as const).map((l) => (
            <option key={l} value={String(l)}>
              Heading {l}
            </option>
          ))}
        </select>

        <Sep />

        {/* Text style */}
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <Bold size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <Italic size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={13} />
        </TB>

        <Sep />

        {/* Alignment */}
        <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
          <AlignCenter size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
          <AlignRight size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">
          <AlignJustify size={13} />
        </TB>

        <Sep />

        {/* Lists */}
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered size={13} />
        </TB>

        <Sep />

        {/* Media & inserts */}
        <TB onClick={openLinkDialog} active={editor.isActive("link")} title="Insert / Edit Link">
          <Link2 size={13} />
        </TB>
        <TB onClick={() => setDialog("image")} title="Insert Image">
          <ImageIcon size={13} />
        </TB>
        <TB onClick={() => setDialog("youtube")} title="Insert YouTube Video">
          <Youtube size={13} />
        </TB>
        <TB
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table (3×3)"
        >
          <Table size={13} />
        </TB>

        <Sep />

        {/* Block elements */}
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
          <Code size={13} />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
          <Code2 size={13} />
        </TB>

        <Sep />

        {/* History */}
        <TB
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={13} />
        </TB>
        <TB
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={13} />
        </TB>
      </div>

      {/* ── Content area ── */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* ── Link dialog ── */}
      {dialog === "link" && (
        <Modal title="Insert Link" onClose={() => setDialog(null)}>
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyLink()}
            placeholder="https://example.com"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#045830]"
          />
          <div className="flex gap-2 mt-3">
            {editor.isActive("link") && (
              <button
                type="button"
                onClick={() => { editor.chain().focus().unsetLink().run(); setDialog(null); }}
                className="flex-1 px-3 py-2 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 transition"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={applyLink}
              className="flex-1 px-3 py-2 bg-[#045830] text-white rounded text-sm hover:bg-[#034524] transition"
            >
              Apply
            </button>
          </div>
        </Modal>
      )}

      {/* ── Image dialog ── */}
      {dialog === "image" && (
        <Modal title="Insert Image" onClose={() => setDialog(null)}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
            {uploading ? "Uploading…" : "Upload from device"}
          </button>
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && insertImageFromUrl()}
            placeholder="https://image-url.com/photo.jpg"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#045830]"
          />
          <button
            type="button"
            onClick={insertImageFromUrl}
            disabled={!imageUrl.trim()}
            className="w-full mt-3 px-3 py-2 bg-[#045830] text-white rounded text-sm hover:bg-[#034524] transition disabled:opacity-50"
          >
            Insert Image
          </button>
        </Modal>
      )}

      {/* ── YouTube dialog ── */}
      {dialog === "youtube" && (
        <Modal title="Insert YouTube Video" onClose={() => setDialog(null)}>
          <input
            autoFocus
            type="url"
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && insertYoutube()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#045830]"
          />
          <p className="text-xs text-gray-400 mt-1.5">Also supports youtu.be short links</p>
          <button
            type="button"
            onClick={insertYoutube}
            disabled={!ytUrl.trim()}
            className="w-full mt-3 px-3 py-2 bg-[#045830] text-white rounded text-sm hover:bg-[#034524] transition disabled:opacity-50"
          >
            Insert Video
          </button>
        </Modal>
      )}
    </div>
  );
}
