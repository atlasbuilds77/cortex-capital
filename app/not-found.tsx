export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">🔍</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Page not found
          </h1>
          
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go to dashboard
            </a>
            
            <a
              href="/connect"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Connect broker
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">
              Popular pages:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <a href="/dashboard" className="text-sm text-blue-500 hover:text-blue-600">
                Dashboard
              </a>
              <span className="text-gray-300">•</span>
              <a href="/onboarding" className="text-sm text-blue-500 hover:text-blue-600">
                Onboarding
              </a>
              <span className="text-gray-300">•</span>
              <a href="/connect" className="text-sm text-blue-500 hover:text-blue-600">
                Connect
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
