'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrganizationProfile, OrgExtraSection } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';

export default function OrgProfilePage() {
  const [profile, setProfile] = useState<OrganizationProfile>({
    org_id: 'default-org',
    legal_name: '',
    mission_short: '',
    mission_long: '',
    address: '',
    extra_sections: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/org-profile')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(error => console.error('Error loading profile:', error));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/org-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    const newSection: OrgExtraSection = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
    };
    setProfile({
      ...profile,
      extra_sections: [...(profile.extra_sections || []), newSection],
    });
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setProfile({
      ...profile,
      extra_sections: (profile.extra_sections || []).map(s =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    });
  };

  const deleteSection = (id: string) => {
    setProfile({
      ...profile,
      extra_sections: (profile.extra_sections || []).filter(s => s.id !== id),
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-white">Organization Profile</span>
        </nav>
        <h1 className="text-3xl font-bold text-white mb-2">Organization Profile</h1>
        <p className="text-zinc-400 text-lg">This information is used by AI to generate grant application answers</p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-emerald-400 font-medium">Profile saved successfully!</p>
            <p className="text-emerald-400/70 text-sm">Your changes have been saved</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Basic Information</h3>
              <p className="text-sm text-zinc-400">Core details about your organization</p>
            </div>
          </div>
          
          <div className="space-y-5">
            <Input
              label="Legal Organization Name"
              type="text"
              value={profile.legal_name}
              onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
              placeholder="e.g., TechForward Foundation"
            />

            <Input
              label="Mission Statement (Short)"
              type="text"
              value={profile.mission_short}
              onChange={(e) => setProfile({ ...profile, mission_short: e.target.value })}
              placeholder="One-line mission statement"
              helperText="A brief, one-sentence description of your organization's mission"
            />

            <Textarea
              label="Mission Statement (Detailed)"
              rows={5}
              value={profile.mission_long}
              onChange={(e) => setProfile({ ...profile, mission_long: e.target.value })}
              placeholder="Detailed description of your organization's mission, goals, and impact"
              helperText="Provide a comprehensive description of your organization's purpose and objectives"
            />

            <Textarea
              label="Organization Address"
              rows={3}
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="123 Main Street&#10;City, State ZIP&#10;Country"
            />
          </div>
        </Card>

        {/* Additional Sections */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Additional Information</h3>
                <p className="text-sm text-zinc-400">Add custom sections for AI to reference</p>
              </div>
            </div>
            <Button
              onClick={addSection}
              variant="primary"
              size="sm"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Section
            </Button>
          </div>

          {(profile.extra_sections || []).length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-zinc-400 font-medium mb-1">No additional sections yet</p>
              <p className="text-zinc-500 text-sm">Add sections like "Key Impact Metrics", "Programs", or "Team"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(profile.extra_sections || []).map((section, index) => (
                <div key={section.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        placeholder={`Section ${index + 1} Title (e.g., Key Impact Metrics)`}
                        className="font-medium"
                      />
                    </div>
                    <Button
                      onClick={() => deleteSection(section.id)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-600 hover:text-white"
                      title="Delete section"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                  </div>
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                    placeholder="Content for this section..."
                    rows={5}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          loading={saving}
          variant={saved ? "success" : "primary"}
          size="lg"
          className="w-full"
          icon={
            saved ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )
          }
        >
          {saved ? 'Saved Successfully!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
