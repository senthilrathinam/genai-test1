import Link from 'next/link';

export default function TestPortalHome() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Grant Portal</h1>
        <p className="mb-8 text-gray-300">
          Local test environment for observing AgentCore form-filling behavior.
          All data is stored in-memory only.
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/test-portal/basic-grant"
            className="block p-4 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Basic Grant Application Form
          </Link>
          
          <Link 
            href="/test-portal/submissions"
            className="block p-4 bg-green-600 hover:bg-green-700 rounded"
          >
            View Submissions
          </Link>
        </div>
      </div>
    </div>
  );
}
