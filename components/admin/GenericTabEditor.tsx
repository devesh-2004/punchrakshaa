"use client";
import InlineImage from "@/components/ui/InlineImage";

export type TabItem = {
  text: string;   // supports HTML: <b>, <i>, <span style="color:red"> etc.
  image: string;  // base64 or URL — if present shows photo circle, else shows green checkmark
  label: string;  // bold prefix shown before the text
  altText?: string;
};

export type TabData = {
  name: string;
  title: string;   // custom title — auto-generated on website if left blank
  items: TabItem[];
  note: string;    // bottom note — supports HTML
};

type Props = {
  data: TabData;
  onChange: (data: TabData) => void;
  // Only used for the Guidelines tab
  importantNotes?: string;
  onImportantNotesChange?: (val: string) => void;
};

export function GenericTabEditor({ data, onChange, importantNotes, onImportantNotesChange }: Props) {
  const update = (patch: Partial<TabData>) => onChange({ ...data, ...patch });

  const addItem = () =>
    update({ items: [...data.items, { text: "", image: "", label: "", altText: "" }] });

  const removeItem = (idx: number) =>
    update({ items: data.items.filter((_, i) => i !== idx) });

  const updateItem = (idx: number, field: string, val: string) =>
    update({ items: data.items.map((item, i) => i === idx ? { ...item, [field]: val } : item) });

  const moveItem = (idx: number, dir: "up" | "down") => {
    const next = [...data.items];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ items: next });
  };

  const handleImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (event) => {
        const svgText = event.target?.result as string;
        // Extract embedded base64 PNG from SVG pattern (common in Figma/Illustrator exports)
        const match = svgText.match(/xlink:href="(data:image\/[^;]+;base64,[^"]+)"/);
        if (match) {
          updateItem(idx, "image", match[1]);
        } else {
          // No embedded raster — store as inline SVG data URL so InlineImage can render it
          const encoded = btoa(unescape(encodeURIComponent(svgText)));
          updateItem(idx, "image", `data:image/svg+xml;base64,${encoded}`);
        }
      };
      return;
    }

    // Raster images — existing canvas path
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
        }
        updateItem(idx, "image", canvas.toDataURL("image/jpeg", 0.75));
      };
    };
  };

  const handleImageUrl = (idx: number, raw: string) => {
    const m = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const url = m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : raw;
    updateItem(idx, "image", url);
  };

  return (
    <div className="space-y-6">
      {/* Hint */}
      <div className="bg-[#f0faf5] border border-[#c5e8d4] rounded-lg px-4 py-3 text-sm text-[#045830]">
        <b>{data.name}</b> tab on the product page. Hidden on website until you add at least one item.
        <span className="block mt-1 text-[#4a9a6a] text-xs">HTML supported in text & note fields: <code className="bg-[#e0f5ea] px-1 rounded">&lt;b&gt;bold&lt;/b&gt;</code> <code className="bg-[#e0f5ea] px-1 rounded">&lt;i&gt;italic&lt;/i&gt;</code> <code className="bg-[#e0f5ea] px-1 rounded">&lt;span style=&quot;color:red&quot;&gt;color&lt;/span&gt;</code></span>
      </div>

      {/* Custom title */}
      <div>
        <label className="field-label">Custom Tab Title <span className="text-gray-400 font-normal text-xs normal-case">(optional — auto-generated if blank)</span></label>
        <input
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={`e.g. Key Features of Your Product Name`}
          className="field-input text-sm"
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="field-label mb-0">Items</label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620] transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {data.items.map((item, idx) => (
            <div key={idx} className="border rounded-xl bg-gray-50/60 group overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item {idx + 1}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {idx > 0 && (
                    <button type="button" onClick={() => moveItem(idx, "up")} className="text-[10px] text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100">↑</button>
                  )}
                  {idx < data.items.length - 1 && (
                    <button type="button" onClick={() => moveItem(idx, "down")} className="text-[10px] text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100">↓</button>
                  )}
                  <button type="button" onClick={() => removeItem(idx)} className="text-[10px] text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 ml-1">✕ Remove</button>
                </div>
              </div>

              <div className="p-4 flex gap-4 items-start">
                {/* Photo upload */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-[#045830] transition-colors">
                    {item.image ? (
                      <InlineImage src={item.image} alt={item.altText || item.label || ""} className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span className="text-[9px] font-medium">Photo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(idx, e)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  {item.image && (
                    <button
                      type="button"
                      onClick={() => updateItem(idx, "image", "")}
                      className="text-[10px] text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                  {!item.image && (
                    <span className="text-[9px] text-gray-400 text-center leading-tight">No photo = checkmark</span>
                  )}
                  {/* URL paste */}
                  <input
                    type="text"
                    placeholder="or paste URL"
                    onBlur={(e) => { if (e.target.value.trim()) { handleImageUrl(idx, e.target.value.trim()); e.target.value = ""; } }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { handleImageUrl(idx, v); (e.target as HTMLInputElement).value = ""; } } }}
                    className="w-[60px] text-[8px] border rounded px-1 py-0.5 text-gray-500 placeholder-gray-300 outline-none focus:border-[#045830]"
                  />
                </div>

                {/* Text fields */}
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Bold Label <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                    <input
                      value={item.label}
                      onChange={(e) => updateItem(idx, "label", e.target.value)}
                      placeholder="e.g. Best Timing – or Sendha Namak"
                      className="w-full text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  {item.image && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Image Alt Text <span className="font-normal normal-case text-gray-400">(SEO)</span></label>
                      <input
                        value={item.altText || ""}
                        onChange={(e) => updateItem(idx, "altText", e.target.value)}
                        placeholder="e.g. timing icon for safed musli"
                        className="w-full text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">
                      Text <span className="font-normal normal-case text-gray-400">(HTML supported — <b>bold</b>, <i>italic</i>, highlights)</span>
                    </label>
                    <textarea
                      value={item.text}
                      onChange={(e) => updateItem(idx, "text", e.target.value)}
                      placeholder={`Description text... e.g. Helps reduce <b>swelling</b> and <i>inflammation</i>.`}
                      className="w-full text-sm border rounded-lg px-3 py-2 h-16 resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Preview row */}
              <div className="px-4 pb-3 flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Preview:</span>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  {item.image ? (
                    <InlineImage src={item.image} alt={item.altText || item.label || ""} className="w-5 h-5 rounded overflow-hidden border border-gray-200" />
                  ) : (
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  )}
                  {item.label && <b className="text-xs">{item.label}</b>}
                  <span className="text-xs text-gray-500 truncate max-w-[300px]" dangerouslySetInnerHTML={{ __html: item.text || "<em>no text yet</em>" }} />
                </div>
              </div>
            </div>
          ))}

          {data.items.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-xl bg-gray-50/50">
              <p className="text-sm text-gray-400 italic">No items yet. Click &quot;Add Item&quot; to start.</p>
              <p className="text-xs text-gray-400 mt-1">No photo added = green checkmark shown. Add a photo for circular image icon.</p>
            </div>
          )}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="field-label">Bottom Note <span className="text-gray-400 font-normal text-xs normal-case">(optional — shown below the list with a divider. HTML supported.)</span></label>
        <textarea
          value={data.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder={`*Recommended: e.g. <b>*Recommended:</b> Since constipation is a major root cause...`}
          className="field-input text-sm h-20 resize-none"
        />
      </div>

      {/* Important Notes — only for Guidelines tab */}
      {data.name === "Guidelines" && onImportantNotesChange !== undefined && (
        <div className="border-t pt-5">
          <label className="field-label">*Important Information Notes <span className="text-gray-400 font-normal text-xs normal-case">(one per line — shown at the bottom of Guidelines tab under a special header)</span></label>
          <textarea
            value={importantNotes || ""}
            onChange={(e) => onImportantNotesChange(e.target.value)}
            placeholder={"Do not exceed the recommended daily dosage.\nNot recommended during pregnancy."}
            className="field-input text-sm h-24"
          />
        </div>
      )}
    </div>
  );
}
