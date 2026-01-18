'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GrantApplicationInstance, GrantResponse } from '@/types';

export default function ReviewGrant() {
  const params = useParams();
  const [grant, setGrant] = useState<GrantApplicationInstance | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tone, setTone] = useState('neutral');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<{
    fieldsFilled: number;
    fieldsSkipped: number;
    mappings?: Array<{
      question: string;
      answer: string | string[];
      selector: string;
      confidence: number;
    }>;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/grants/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch grant');
        return res.json();
      })
      .then(data => setGrant(data))
      .catch(error => console.error('Error loading grant:', error));
  }, [params.id]);

  const saveGrant = async (updatedGrant: GrantApplicationInstance) => {
    setSaving(true);
    try {
      await fetch(`/api/grants/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGrant),
      });
    } catch (error) {
      console.error('Error saving grant:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDrafts = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/grants/${params.id}/generate-drafts`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || 'Failed to generate drafts');
      }
      const updatedGrant = await res.json();
      setGrant(updatedGrant);
    } catch (error) {
      console.error('Error generating drafts:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate drafts'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!grant || !grant.responses || grant.responses.length === 0) {
    return <div>Loading...</div>;
  }

  const handleAnswerChange = (index: number, newAnswer: string | string[]) => {
    const updated = { ...grant };
    updated.responses[index].answer = newAnswer;
    setGrant(updated);
  };

  const handleAnswerBlur = () => {
    if (grant) saveGrant(grant);
  };

  const handleReviewToggle = (index: number) => {
    const updated = { ...grant };
    updated.responses[index].reviewed = !updated.responses[index].reviewed;
    setGrant(updated);
    saveGrant(updated);
  };

  const handleMarkAllReviewed = () => {
    const updated = { ...grant };
    updated.responses.forEach(r => r.reviewed = true);
    setGrant(updated);
    saveGrant(updated);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/grants/${params.id}/export-pdf`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${grant.grant_name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleFillWeb = async () => {
    setFilling(true);
    setFillResult(null);
    try {
      const res = await fetch(`/api/grants/${params.id}/fill-web`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.status === 'ok') {
        setFillResult({
          fieldsFilled: data.fieldsFilled,
          fieldsSkipped: data.fieldsSkipped,
          mappings: data.mappings,
        });
      } else {
        setFillResult({
          fieldsFilled: 0,
          fieldsSkipped: 0,
          mappings: [],
        });
        alert(`Error: ${data.message || 'Failed to fill form'}`);
      }
    } catch (error: any) {
      console.error('Error filling web form:', error);
      setFillResult({
        fieldsFilled: 0,
        fieldsSkipped: 0,
        mappings: [],
      });
      alert(`Error: ${error.message || 'Failed to fill form'}`);
    } finally {
      setFilling(false);
    }
  };

  const isPDFGrant = grant.source_type === 'pdf' || grant.grant_url.toLowerCase().endsWith('.pdf');

  const currentResponse = grant.responses[selectedIndex];

  const renderAnswerInput = (response: GrantResponse, index: number) => {
    const answer = response.answer;

    switch (response.type) {
      case 'text':
        return (
          <input
            type="text"
            value={answer as string}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            onBlur={handleAnswerBlur}
            className={`w-full px-4 py-3 bg-zinc-950 rounded-lg focus:outline-none focus:border-accent ${
              response.needs_manual_input ? 'border-2 border-yellow-500' : 'border border-zinc-700'
            }`}
          />
        );

      case 'number':
        return (
          <input
            type="text"
            value={answer as string}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            onBlur={handleAnswerBlur}
            placeholder="Enter a number"
            className={`w-full px-4 py-3 bg-zinc-950 rounded-lg focus:outline-none focus:border-accent ${
              response.needs_manual_input ? 'border-2 border-yellow-500' : 'border border-zinc-700'
            }`}
          />
        );

      case 'date':
        const dateValue = answer as string;
        const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
        
        return (
          <input
            type={isValidDate ? "date" : "text"}
            value={dateValue}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            onBlur={handleAnswerBlur}
            placeholder="YYYY-MM-DD"
            className={`w-full px-4 py-3 bg-zinc-950 rounded-lg focus:outline-none focus:border-accent ${
              response.needs_manual_input ? 'border-2 border-yellow-500' : 'border border-zinc-700'
            }`}
          />
        );

      case 'yes_no':
      case 'single_choice':
        const options = response.type === 'yes_no' ? ['Yes', 'No'] : (response.options || []);
        return (
          <div className="space-y-2">
            {options.map((option, optIdx) => (
              <label key={`${index}-${optIdx}`} className={`flex items-center gap-3 p-3 bg-zinc-950 rounded-lg hover:border-zinc-600 cursor-pointer ${
                response.needs_manual_input ? 'border-2 border-yellow-500' : 'border border-zinc-700'
              }`}>
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => {
                    handleAnswerChange(index, e.target.value);
                    handleAnswerBlur();
                  }}
                  className="w-4 h-4"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'multi_choice':
        const selectedOptions = Array.isArray(answer) ? answer : [];
        return (
          <div className="space-y-2">
            {(response.options || []).map((option, optIdx) => (
              <label key={`${index}-${optIdx}`} className={`flex items-center gap-3 p-3 bg-zinc-950 rounded-lg hover:border-zinc-600 cursor-pointer ${
                response.needs_manual_input ? 'border-2 border-yellow-500' : 'border border-zinc-700'
              }`}>
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...selectedOptions, option]
                      : selectedOptions.filter(o => o !== option);
                    handleAnswerChange(index, newSelected);
                    handleAnswerBlur();
                  }}
                  className="w-4 h-4"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'textarea':
      default:
        return (
          <div>
            <textarea
              value={answer as string}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              onBlur={handleAnswerBlur}
              rows={12}
              className={`w-full px-4 py-3 bg-zinc-950 rounded-lg focus:outline-none focus:border-accent resize-none ${
                response.needs_manual_input ? 'border-2 border-yellow-500' : 'border border-zinc-700'
              }`}
            />
            {/* Preview with bold rendering */}
            {answer && (
              <div className="mt-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300">
                <div className="text-xs text-zinc-500 mb-2">Preview:</div>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: (answer as string).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') 
                  }}
                  className="whitespace-pre-wrap"
                />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-white">{grant.grant_name}</span>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{grant.grant_name}</h1>
            {grant.grant_url && (
              <a 
                href={grant.grant_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View source
              </a>
            )}
          </div>
          {saving && (
            <span className="text-sm text-zinc-400 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateDrafts}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate AI Answers
                </>
              )}
            </button>

            <button
              onClick={handleFillWeb}
              disabled={filling}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {filling ? 'Filling...' : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Fill Website Form
                </>
              )}
            </button>

            {isPDFGrant && (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {exporting ? 'Exporting...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllReviewed}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark All Reviewed
            </button>
          </div>
        </div>
      </div>

      {fillResult && (
        <div className="mb-6 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-purple-200 font-medium mb-1">
                Form Filling Complete
              </p>
              <p className="text-sm text-purple-300">
                Filled {fillResult.fieldsFilled} fields, skipped {fillResult.fieldsSkipped}.
                {fillResult.fieldsFilled > 0 && ' Check /test-portal/submissions to verify.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar - Questions List */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg sticky top-24">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Questions</h3>
              <p className="text-xs text-zinc-400 mt-1">
                {grant.responses.filter(r => r.reviewed).length} / {grant.responses.length} reviewed
              </p>
            </div>
            <div className="p-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
              <div className="space-y-1">
                {grant.responses.map((response, index) => {
                  const hasAnswer = response.answer && (
                    typeof response.answer === 'string' ? response.answer.trim() !== '' : response.answer.length > 0
                  );
                  
                  return (
                    <button
                      key={response.question_id}
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                        selectedIndex === index
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Question {index + 1}</span>
                        <div className="flex items-center gap-1">
                          {response.needs_manual_input && (
                            <span className="text-yellow-400" title="Needs manual input">⚠</span>
                          )}
                          {response.reviewed && (
                            <span className="text-emerald-400">✓</span>
                          )}
                          {!hasAnswer && !response.reviewed && (
                            <span className="text-zinc-500">○</span>
                          )}
                        </div>
                      </div>
                      <div className={`text-xs line-clamp-2 ${selectedIndex === index ? 'opacity-90' : 'text-zinc-400'}`}>
                        {response.question_text}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel - Question & Answer */}
        <div className="flex-1">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-zinc-400">Question {selectedIndex + 1} of {grant.responses.length}</span>
                    {currentResponse.required && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded">Required</span>
                    )}
                    {currentResponse.needs_manual_input && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded">Needs Input</span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{currentResponse.question_text}</h3>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="px-2 py-1 bg-zinc-800 rounded">Type: {currentResponse.type}</span>
                    {currentResponse.char_limit && (
                      <span>Max {currentResponse.char_limit} characters</span>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={currentResponse.reviewed}
                    onChange={() => handleReviewToggle(selectedIndex)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-900"
                  />
                  <span className="text-sm font-medium">Reviewed</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">Your Answer</label>
                {renderAnswerInput(currentResponse, selectedIndex)}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
              <button
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-zinc-400">
                {selectedIndex + 1} of {grant.responses.length}
              </span>
              <button
                onClick={() => setSelectedIndex(Math.min(grant.responses.length - 1, selectedIndex + 1))}
                disabled={selectedIndex === grant.responses.length - 1}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
