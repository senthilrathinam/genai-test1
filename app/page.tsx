'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GrantApplicationInstance } from '@/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

export default function Dashboard() {
  const [grants, setGrants] = useState<GrantApplicationInstance[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadGrants();
  }, []);

  const loadGrants = () => {
    fetch('/api/grants')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch grants');
        return res.json();
      })
      .then(data => setGrants(data))
      .catch(error => console.error('Error loading grants:', error));
  };

  const handleDelete = async (grantId: string) => {
    if (!confirm('Are you sure you want to delete this grant?')) return;

    setDeleting(grantId);
    try {
      await fetch(`/api/grants/${grantId}`, {
        method: 'DELETE',
      });
      loadGrants();
    } catch (error) {
      console.error('Error deleting grant:', error);
    } finally {
      setDeleting(null);
    }
  };

  const statusConfig = {
    draft: { icon: '📝', variant: 'draft' as const },
    ready: { icon: '✓', variant: 'ready' as const },
    filled: { icon: '📋', variant: 'filled' as const },
    submitted: { icon: '✉️', variant: 'submitted' as const },
  };

  const stats = [
    { label: 'Draft', count: grants.filter(g => g.status === 'draft').length, icon: '📝', color: 'from-amber-500 to-amber-600' },
    { label: 'Ready', count: grants.filter(g => g.status === 'ready').length, icon: '✓', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Filled', count: grants.filter(g => g.status === 'filled').length, icon: '📋', color: 'from-blue-500 to-blue-600' },
    { label: 'Submitted', count: grants.filter(g => g.status === 'submitted').length, icon: '✉️', color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Grant Applications
            </h1>
            <p className="text-zinc-400 text-lg">Manage and track your grant applications with AI assistance</p>
          </div>
          <Link href="/grants/new">
            <Button 
              variant="primary" 
              size="lg"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Application
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{stat.icon}</span>
                <span className="text-3xl font-bold text-white">{stat.count}</span>
              </div>
              <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Grants List */}
      {grants.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No grant applications yet</h3>
            <p className="text-zinc-400 mb-8">Get started by creating your first grant application and let AI help you fill it out</p>
            <Link href="/grants/new">
              <Button 
                variant="primary" 
                size="lg"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Create Your First Application
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {grants.map((grant) => {
            const config = statusConfig[grant.status];
            const questionCount = grant.responses?.length || 0;
            const answeredCount = grant.responses?.filter(r => {
              const ans = r.answer;
              return ans && (typeof ans === 'string' ? ans.trim() !== '' : ans.length > 0);
            }).length || 0;
            const progress = questionCount > 0 ? (answeredCount / questionCount) * 100 : 0;
            
            return (
              <Card key={grant.grant_id} hover className="p-6 group">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Link href={`/grants/${grant.grant_id}`} className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                          {grant.grant_name}
                        </h3>
                      </Link>
                      <Badge variant={config.variant} icon={config.icon}>
                        {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-zinc-400 mb-4">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(grant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {answeredCount} / {questionCount} answered
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {grant.grant_url && grant.grant_url.startsWith('http') && (
                      <a 
                        href={grant.grant_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View source
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/grants/${grant.grant_id}`}>
                      <Button variant="secondary">
                        Open
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(grant.grant_id)}
                      loading={deleting === grant.grant_id}
                      disabled={deleting === grant.grant_id}
                      className="hover:bg-red-600 hover:text-white"
                      title="Delete grant"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
