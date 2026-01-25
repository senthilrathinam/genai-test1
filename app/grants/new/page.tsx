'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function NewGrant() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    grant_name: '',
    grant_url: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [grantId, setGrantId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't use filename as grant_url - keep it empty for file uploads
    const grantUrl = formData.grant_url || '';
    
    try {
      const res = await fetch('/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, grant_url: grantUrl }),
      });
      if (!res.ok) throw new Error('Failed to create grant');
      const data = await res.json();
      setGrantId(data.grant_id);

      if (file) {
        await handleFileUpload(data.grant_id);
      }
    } catch (error) {
      console.error('Error creating grant:', error);
      alert('Failed to create grant. Please try again.');
    }
  };

  const handleFileUpload = async (gId: string) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload file');
      const data = await res.json();
      setUploadedFile(data);
      
      setParsing(true);
      const parseRes = await fetch(`/api/grants/${gId}/parse-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3_key: data.s3_key,
          file_type: data.file_type,
          file_name: data.file_name,
        }),
      });
      
      if (!parseRes.ok) throw new Error('Failed to parse questions');
      router.push(`/grants/${gId}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to upload file'}`);
      setUploading(false);
      setParsing(false);
    }
  };

  const handleParseQuestions = async () => {
    if (!grantId) return;
    
    setParsing(true);
    try {
      const body = uploadedFile ? {
        s3_key: uploadedFile.s3_key,
        file_type: uploadedFile.file_type,
        file_name: uploadedFile.file_name,
      } : {};

      const res = await fetch(`/api/grants/${grantId}/parse-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) throw new Error('Failed to parse questions');
      router.push(`/grants/${grantId}`);
    } catch (error) {
      console.error('Error parsing questions:', error);
      alert('Failed to parse questions. Please try again.');
      setParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  if (grantId) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white">New Grant</span>
          </nav>
          <h1 className="text-3xl font-bold text-white">Grant Created Successfully</h1>
        </div>

        <Card className="p-8">
          {uploading || parsing ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/10 rounded-2xl mb-6">
                <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-xl text-white font-semibold mb-2">
                {uploading && 'Uploading document...'}
                {parsing && !uploading && 'Parsing questions from document...'}
              </p>
              <p className="text-zinc-400">This may take a moment</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 mb-8">
                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Your grant application has been created</h3>
                  {uploadedFile && <p className="text-emerald-400 text-sm mb-2">✓ File uploaded successfully</p>}
                  <p className="text-zinc-400">
                    {uploadedFile 
                      ? 'Parse questions from the uploaded document or skip to use default questions.'
                      : 'Parse questions from the URL or skip to use default questions.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleParseQuestions}
                  loading={parsing}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  {uploadedFile ? 'Parse Questions from Document' : 'Parse Questions from URL'}
                </Button>

                <Button
                  onClick={() => router.push(`/grants/${grantId}`)}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Skip to Draft Answers
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-white">New Grant</span>
        </nav>
        <h1 className="text-3xl font-bold text-white mb-2">Create New Grant Application</h1>
        <p className="text-zinc-400 text-lg">Enter grant details and upload supporting documents</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Grant Name"
            type="text"
            required
            value={formData.grant_name}
            onChange={(e) => setFormData({ ...formData, grant_name: e.target.value })}
            placeholder="e.g., TechForward Foundation Grant 2025"
          />

          <Input
            label="Grant URL"
            type="url"
            required={!file}
            value={formData.grant_url}
            onChange={(e) => setFormData({ ...formData, grant_url: e.target.value })}
            placeholder={file ? "Optional - leave blank to use file name" : "https://example.com/grant-application"}
            helperText="The URL where the grant application form is hosted"
          />

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Upload Grant Document {!formData.grant_url && <span className="text-red-400">*</span>}
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : file 
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.docx"
                required={!formData.grant_url}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="p-8 text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-sm text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-white font-medium mb-1">
                      {dragActive ? 'Drop file here' : 'Drag and drop your file here'}
                    </p>
                    <p className="text-sm text-zinc-500 mb-3">or click to browse</p>
                    <p className="text-xs text-zinc-600">Supported formats: PDF, DOCX</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Grant Application
          </Button>
        </form>
      </Card>
    </div>
  );
}
