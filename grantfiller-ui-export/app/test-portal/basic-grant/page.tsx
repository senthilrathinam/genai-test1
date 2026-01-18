export default function BasicGrantForm() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">TechForward Foundation Grant Application</h1>
          <p className="text-gray-400">Supporting nonprofits advancing technology education and digital equity</p>
        </div>
        
        <form method="POST" action="/api/test-portal/submit" className="space-y-6">
          <div>
            <label htmlFor="org_name" className="block mb-2 font-semibold">Organization Legal Name *</label>
            <input 
              type="text" 
              id="org_name" 
              name="org_name"
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="ein" className="block mb-2 font-semibold">Tax ID / EIN *</label>
            <input 
              type="text" 
              id="ein" 
              name="ein"
              placeholder="XX-XXXXXXX"
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="contact_name" className="block mb-2 font-semibold">Primary Contact Name *</label>
            <input 
              type="text" 
              id="contact_name" 
              name="contact_name"
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="contact_email" className="block mb-2 font-semibold">Contact Email *</label>
            <input 
              type="email" 
              id="contact_email" 
              name="contact_email"
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="funding_amount" className="block mb-2 font-semibold">Funding Amount Requested *</label>
            <select 
              id="funding_amount" 
              name="funding_amount"
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            >
              <option value="">Select amount...</option>
              <option value="25000">$25,000</option>
              <option value="50000">$50,000</option>
              <option value="75000">$75,000</option>
              <option value="100000">$100,000</option>
            </select>
          </div>

          <div>
            <label htmlFor="mission" className="block mb-2 font-semibold">
              Organization Mission Statement *
              <span className="block text-sm text-gray-400 font-normal mt-1">Describe your organization's mission in 2-3 sentences (max 500 characters)</span>
            </label>
            <textarea 
              id="mission" 
              name="mission"
              rows={4}
              maxLength={500}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="program_description" className="block mb-2 font-semibold">
              Program Description *
              <span className="block text-sm text-gray-400 font-normal mt-1">Describe the specific program or project for which you are seeking funding (max 1000 characters)</span>
            </label>
            <textarea 
              id="program_description" 
              name="program_description"
              rows={6}
              maxLength={1000}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="target_population" className="block mb-2 font-semibold">
              Target Population *
              <span className="block text-sm text-gray-400 font-normal mt-1">Who will directly benefit from this program? Include demographics, age range, and geographic location</span>
            </label>
            <textarea 
              id="target_population" 
              name="target_population"
              rows={4}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="num_beneficiaries" className="block mb-2 font-semibold">Expected Number of Beneficiaries *</label>
            <input 
              type="number" 
              id="num_beneficiaries" 
              name="num_beneficiaries"
              min="1"
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="measurable_outcomes" className="block mb-2 font-semibold">
              Measurable Outcomes *
              <span className="block text-sm text-gray-400 font-normal mt-1">What specific, measurable outcomes do you expect to achieve? How will you track and report progress?</span>
            </label>
            <textarea 
              id="measurable_outcomes" 
              name="measurable_outcomes"
              rows={5}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="technology_focus" className="block mb-2 font-semibold">
              Technology Focus Area *
              <span className="block text-sm text-gray-400 font-normal mt-1">How does this program advance technology education, digital literacy, or digital equity?</span>
            </label>
            <textarea 
              id="technology_focus" 
              name="technology_focus"
              rows={5}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="budget_breakdown" className="block mb-2 font-semibold">
              Budget Breakdown *
              <span className="block text-sm text-gray-400 font-normal mt-1">Provide a brief breakdown of how grant funds will be used (personnel, equipment, materials, etc.)</span>
            </label>
            <textarea 
              id="budget_breakdown" 
              name="budget_breakdown"
              rows={5}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label htmlFor="timeline" className="block mb-2 font-semibold">Program Timeline *</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block mb-1 text-sm text-gray-400">Start Date</label>
                <input 
                  type="date" 
                  id="start_date" 
                  name="start_date"
                  required
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block mb-1 text-sm text-gray-400">End Date</label>
                <input 
                  type="date" 
                  id="end_date" 
                  name="end_date"
                  required
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="sustainability" className="block mb-2 font-semibold">
              Sustainability Plan *
              <span className="block text-sm text-gray-400 font-normal mt-1">How will your organization sustain this program after grant funding ends?</span>
            </label>
            <textarea 
              id="sustainability" 
              name="sustainability"
              rows={4}
              required
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Has your organization received funding from TechForward Foundation before? *</label>
            <div className="space-x-4">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="previous_funding" 
                  value="yes"
                  required
                  className="mr-2"
                />
                Yes
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="previous_funding" 
                  value="no"
                  required
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
          >
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}
