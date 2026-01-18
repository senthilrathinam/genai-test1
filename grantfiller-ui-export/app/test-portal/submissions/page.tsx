import Link from 'next/link';
import { getSubmissions } from '../store';

export const dynamic = 'force-dynamic';

export default function SubmissionsPage() {
  const submissions = getSubmissions();
  console.log('Rendering submissions page, count:', submissions.length);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Submissions</h1>
          <Link 
            href="/test-portal"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Back to Portal
          </Link>
        </div>
        
        {submissions.length === 0 ? (
          <p className="text-gray-400">No submissions yet.</p>
        ) : (
          <div className="space-y-8">
            {submissions.map((submission, idx) => (
              <div key={idx} className="bg-gray-800 p-6 rounded border border-gray-700">
                <div className="mb-4">
                  <p className="text-sm text-gray-400">
                    <strong>Timestamp:</strong> {new Date(submission.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Form Path:</strong> {submission.path}
                  </p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Form Data:</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(submission.data).map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-700">
                          <td className="py-2 pr-4 text-gray-400 align-top">{key}</td>
                          <td className="py-2">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Raw JSON:</h3>
                  <pre className="bg-gray-950 p-4 rounded overflow-x-auto text-xs">
                    {JSON.stringify(submission.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
