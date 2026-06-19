"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from "./ProductForm";

interface SortableImageProps {
  id: string;
  img: { url: string; altText: string };
  idx: number;
  total: number;
  onUpdateAlt: (idx: number, alt: string) => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onRemove: (idx: number) => void;
}

export function SortableImage({
  id,
  img,
  idx,
  total,
  onUpdateAlt,
  onMove,
  onRemove,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 p-3 border rounded-xl bg-gray-50/30 group relative transition-all ${
        isDragging ? "shadow-2xl ring-2 ring-primary border-transparent scale-105" : "hover:border-gray-300"
      }`}
    >
      <div className="flex gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-move self-stretch flex items-center px-1 text-gray-300 hover:text-gray-500 transition-colors"
          title="Drag to reorder"
        >
          <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
            <circle cx="2" cy="2" r="2" />
            <circle cx="2" cy="10" r="2" />
            <circle cx="2" cy="18" r="2" />
            <circle cx="10" cy="2" r="2" />
            <circle cx="10" cy="10" r="2" />
            <circle cx="10" cy="18" r="2" />
          </svg>
        </div>

        <div className="relative h-20 w-20 shrink-0 rounded-lg border overflow-hidden bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.altText || `Preview ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-[#045830] uppercase tracking-wider mb-1">
            Image {idx + 1} {idx === 0 && <span className="ml-2 text-[9px] bg-[#e4f5e8] px-1.5 py-0.5 rounded text-[#045830] border border-[#d1ebd8]">COVER</span>}
          </p>
          <input
            type="text"
            value={img.altText}
            onChange={(e) => onUpdateAlt(idx, e.target.value)}
            placeholder="Alt text (SEO)"
            className="w-full text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
          {idx > 0 && (
            <button
              type="button"
              onClick={() => onMove(idx, "up")}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title="Move Up"
            >
              <ChevronUpIcon size={14} />
            </button>
          )}
          {idx < total - 1 && (
            <button
              type="button"
              onClick={() => onMove(idx, "down")}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
              title="Move Down"
            >
              <ChevronDownIcon size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove Image"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
