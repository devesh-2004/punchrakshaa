"use client";

import { useEffect, useState } from "react";

const defaultBadges = {
  heading: "Powerful Ayurvedic Care for\nComplete Piles Support",
};

const defaultConsultation = {
  heading: "Have Questions About Our Product? We're Here to Help.",
  subheading: "You can directly talk to our expert for personalized guidance.",
  description:
    "Our experienced team is here to understand your concerns and provide the right guidance. Whether you have questions about usage, duration, diet, or daily habits, you will receive clear and practical support tailored to your needs. This helps ensure you get the best possible results from our products safely and effectively, with complete confidence and long-term health support.",
  ctaText: "TAKE CONSULTATION NOW",
  ctaLink: "/contact",
};

export default function SiteSettingsPage() {
  const [badges, setBadges] = useState(defaultBadges);
  const [consultation, setConsultation] = useState(defaultConsultation);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.badges) setBadges({ ...defaultBadges, ...d.settings.badges });
        if (d.settings?.consultation) {
          setConsultation({ ...defaultConsultation, ...d.settings.consultation });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badges, consultation }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-[#045830] text-white rounded-lg font-semibold hover:bg-[#034620] transition disabled:opacity-50 text-sm"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      {/* Ayurvedic Badges Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Ayurvedic Badges Section</h2>
          <p className="text-xs text-gray-500 mt-0.5">Shown on the homepage and all product pages. Use a newline (\n) to break the heading into two lines.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Heading</label>
          <textarea
            rows={2}
            value={badges.heading}
            onChange={(e) => setBadges((s) => ({ ...s, heading: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045830]/30 resize-none"
          />
        </div>
      </div>

      {/* Consultation Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Consultation Section</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Shown on the homepage and all product pages
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Heading
          </label>
          <input
            type="text"
            value={consultation.heading}
            onChange={(e) => setConsultation((s) => ({ ...s, heading: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045830]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Sub-heading
          </label>
          <input
            type="text"
            value={consultation.subheading}
            onChange={(e) => setConsultation((s) => ({ ...s, subheading: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045830]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            rows={5}
            value={consultation.description}
            onChange={(e) => setConsultation((s) => ({ ...s, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045830]/30 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Button Text
            </label>
            <input
              type="text"
              value={consultation.ctaText}
              onChange={(e) => setConsultation((s) => ({ ...s, ctaText: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045830]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Button Link
            </label>
            <input
              type="text"
              value={consultation.ctaLink}
              onChange={(e) => setConsultation((s) => ({ ...s, ctaLink: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045830]/30"
              placeholder="/contact"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
